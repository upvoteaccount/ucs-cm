import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  users,
  organisations,
  organisationMemberships,
  membershipPlatformRoles,
  sessions,
} from "../../infrastructure/db/schema";
import { normalizeEmail, hashToken, maskIdentifier } from "../../shared/security";
import { auditService } from "../audit";
import { UnauthorizedError, ForbiddenError } from "../../shared/errors";

export const PLATFORM_ROLES = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  SOLUTION_DESIGNER: "SOLUTION_DESIGNER",
  RUNTIME_USER: "RUNTIME_USER",
  SUPERVISOR: "SUPERVISOR",
} as const;

export type PlatformRoleKey = keyof typeof PLATFORM_ROLES;

export interface SessionContext {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  activeOrganisation: {
    id: string;
    key: string;
    name: string;
  };
  membership: {
    id: string;
    roles: PlatformRoleKey[];
  };
}

export class AuthService {
  private readonly saltRounds = 10;
  private readonly inactivityTimeoutMinutes: number;
  private readonly activityUpdateThresholdMs = 60 * 1000; // 60 seconds write-throttling threshold

  constructor() {
    this.inactivityTimeoutMinutes = parseInt(
      process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES || "30",
      10
    );
  }

  /**
   * Authenticates user credentials and creates a database-backed session.
   * Returns a raw session token (to set in secure HTTP-only cookie) and the sanitized session context.
   */
  async login(
    emailInput: string,
    passwordInput: string,
    requestedOrgKey?: string,
    ipAddress?: string
  ): Promise<{ sessionToken: string; context: SessionContext }> {
    const db = getDb();
    const normalized = normalizeEmail(emailInput);
    const masked = maskIdentifier(normalized);

    // 1. Fetch user record
    const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);

    if (!user || !user.isActive) {
      await auditService.recordEvent({
        category: "AUTH",
        eventType: "LOGIN_FAILED",
        actorType: "ANONYMOUS",
        actorIdentifier: masked,
        actorIpAddress: ipAddress,
        metadata: { reason: "Invalid credentials or inactive user" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(passwordInput, user.passwordHash);
    if (!isPasswordValid) {
      await auditService.recordEvent({
        category: "AUTH",
        eventType: "LOGIN_FAILED",
        actorType: "ANONYMOUS",
        actorUserId: user.id,
        actorIdentifier: masked,
        actorIpAddress: ipAddress,
        metadata: { reason: "Invalid credentials" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Resolve active organisation membership
    const memberships = await db
      .select({
        membership: organisationMemberships,
        org: organisations,
      })
      .from(organisationMemberships)
      .innerJoin(organisations, eq(organisationMemberships.organisationId, organisations.id))
      .where(
        and(
          eq(organisationMemberships.userId, user.id),
          eq(organisationMemberships.isActive, true),
          eq(organisations.isActive, true)
        )
      );

    if (memberships.length === 0) {
      await auditService.recordEvent({
        category: "AUTH",
        eventType: "LOGIN_FAILED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: user.id,
        actorIdentifier: masked,
        actorIpAddress: ipAddress,
        metadata: { reason: "No active organisation membership" },
      });
      throw new ForbiddenError("User has no active organisation membership");
    }

    let selected = memberships[0];
    if (requestedOrgKey) {
      const match = memberships.find((m) => m.org.key === requestedOrgKey);
      if (!match) {
        await auditService.recordEvent({
          category: "AUTH",
          eventType: "LOGIN_FAILED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: user.id,
          actorIdentifier: masked,
          actorIpAddress: ipAddress,
          metadata: { reason: "Requested organisation unavailable or inactive" },
        });
        throw new ForbiddenError("Requested organisation is unavailable");
      }
      selected = match;
    }

    // 4. Resolve membership platform roles
    const roleRows = await db
      .select({ roleKey: membershipPlatformRoles.roleKey })
      .from(membershipPlatformRoles)
      .where(eq(membershipPlatformRoles.membershipId, selected.membership.id));

    const roles = roleRows.map((r) => r.roleKey as PlatformRoleKey);

    // 5. Generate secure raw session token & token hash
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(sessionToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.inactivityTimeoutMinutes * 60 * 1000);

    // 6. Create database session
    const [sessionRecord] = await db
      .insert(sessions)
      .values({
        sessionTokenHash: tokenHash,
        userId: user.id,
        activeOrganisationId: selected.org.id,
        createdAt: now,
        lastActivityAt: now,
        expiresAt,
        isRevoked: false,
      })
      .returning();

    // 7. Record login success audit
    await auditService.recordEvent({
      organisationId: selected.org.id,
      category: "AUTH",
      eventType: "LOGIN_SUCCESS",
      actorType: "AUTHENTICATED_USER",
      actorUserId: user.id,
      actorIdentifier: user.email,
      actorIpAddress: ipAddress,
      entityType: "SESSION",
      entityId: sessionRecord.id,
    });

    return {
      sessionToken,
      context: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        activeOrganisation: {
          id: selected.org.id,
          key: selected.org.key,
          name: selected.org.name,
        },
        membership: {
          id: selected.membership.id,
          roles,
        },
      },
    };
  }

  /**
   * Validates a session token, checks inactivity expiration & status deactivations,
   * updates activity timestamp safely (with write-throttling), and returns the SessionContext.
   */
  async validateSession(sessionToken: string): Promise<SessionContext> {
    if (!sessionToken || typeof sessionToken !== "string" || sessionToken.length < 32) {
      throw new UnauthorizedError("Malformed or missing session token");
    }

    const db = getDb();
    const tokenHash = hashToken(sessionToken);
    const now = new Date();

    const [sessionRecord] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.sessionTokenHash, tokenHash), eq(sessions.isRevoked, false)))
      .limit(1);

    if (!sessionRecord) {
      throw new UnauthorizedError("Invalid or revoked session");
    }

    // Check server-enforced inactivity timeout
    if (sessionRecord.expiresAt < now) {
      await auditService.recordEvent({
        organisationId: sessionRecord.activeOrganisationId,
        category: "AUTH",
        eventType: "SESSION_EXPIRED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: sessionRecord.userId,
        entityType: "SESSION",
        entityId: sessionRecord.id,
      });
      throw new UnauthorizedError("Session has expired due to inactivity");
    }

    // Verify active User state
    const [user] = await db.select().from(users).where(eq(users.id, sessionRecord.userId)).limit(1);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User account is inactive");
    }

    // Verify active Organisation & Membership state
    const [membershipRow] = await db
      .select({
        membership: organisationMemberships,
        org: organisations,
      })
      .from(organisationMemberships)
      .innerJoin(organisations, eq(organisationMemberships.organisationId, organisations.id))
      .where(
        and(
          eq(organisationMemberships.userId, user.id),
          eq(organisationMemberships.organisationId, sessionRecord.activeOrganisationId),
          eq(organisationMemberships.isActive, true),
          eq(organisations.isActive, true)
        )
      )
      .limit(1);

    if (!membershipRow) {
      throw new ForbiddenError("Organisation or membership is no longer active");
    }

    // Update last activity timestamp with write throttling (only update DB if threshold elapsed)
    const timeSinceLastActivity = now.getTime() - new Date(sessionRecord.lastActivityAt).getTime();
    if (timeSinceLastActivity >= this.activityUpdateThresholdMs) {
      const newExpiresAt = new Date(now.getTime() + this.inactivityTimeoutMinutes * 60 * 1000);
      await db
        .update(sessions)
        .set({
          lastActivityAt: now,
          expiresAt: newExpiresAt,
        })
        .where(eq(sessions.id, sessionRecord.id));
    }

    // Fetch active platform roles
    const roleRows = await db
      .select({ roleKey: membershipPlatformRoles.roleKey })
      .from(membershipPlatformRoles)
      .where(eq(membershipPlatformRoles.membershipId, membershipRow.membership.id));

    const roles = roleRows.map((r) => r.roleKey as PlatformRoleKey);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      activeOrganisation: {
        id: membershipRow.org.id,
        key: membershipRow.org.key,
        name: membershipRow.org.name,
      },
      membership: {
        id: membershipRow.membership.id,
        roles,
      },
    };
  }

  /**
   * Revokes an active session (logout).
   */
  async logout(sessionToken: string): Promise<void> {
    const db = getDb();
    const tokenHash = hashToken(sessionToken);

    const [sessionRecord] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionTokenHash, tokenHash))
      .limit(1);

    if (sessionRecord) {
      await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, sessionRecord.id));

      await auditService.recordEvent({
        organisationId: sessionRecord.activeOrganisationId,
        category: "AUTH",
        eventType: "LOGOUT",
        actorType: "AUTHENTICATED_USER",
        actorUserId: sessionRecord.userId,
        entityType: "SESSION",
        entityId: sessionRecord.id,
      });
    }
  }

  /**
   * Utility to hash passwords using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }
}

export const authService = new AuthService();
