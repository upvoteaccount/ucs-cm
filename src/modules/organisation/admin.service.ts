import { eq, and } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  users,
  organisationMemberships,
  membershipPlatformRoles,
  sessions,
} from "../../infrastructure/db/schema";
import { normalizeEmail } from "../../shared/security";
import { authService, PlatformRoleKey } from "../auth/auth.service";
import { auditService } from "../audit/audit.service";
import { ConflictError, NotFoundError, ForbiddenError } from "../../shared/errors";

export class AdminService {
  async createOrganisation(
    key: string,
    name: string,
    actorUserId?: string
  ): Promise<{ id: string; key: string; name: string }> {
    const db = getDb();
    const cleanKey = key.trim().toLowerCase();

    const existing = await db.select().from(organisations).where(eq(organisations.key, cleanKey)).limit(1);
    if (existing.length > 0) {
      throw new ConflictError(`Organisation key '${cleanKey}' already exists`);
    }

    const [org] = await db
      .insert(organisations)
      .values({ key: cleanKey, name, isActive: true })
      .returning();

    await auditService.recordEvent({
      organisationId: org.id,
      category: "ORG",
      eventType: "ORGANISATION_CREATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "ORGANISATION",
      entityId: org.id,
      afterState: { key: org.key, name: org.name, isActive: org.isActive },
    });

    return { id: org.id, key: org.key, name: org.name };
  }

  async setOrganisationStatus(
    organisationId: string,
    isActive: boolean,
    actorUserId?: string
  ): Promise<void> {
    const db = getDb();
    const [org] = await db.select().from(organisations).where(eq(organisations.id, organisationId)).limit(1);
    if (!org) {
      throw new NotFoundError("Organisation not found");
    }

    await db.update(organisations).set({ isActive, updatedAt: new Date() }).where(eq(organisations.id, organisationId));

    await auditService.recordEvent({
      organisationId,
      category: "ORG",
      eventType: isActive ? "ORGANISATION_ACTIVATED" : "ORGANISATION_DEACTIVATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "ORGANISATION",
      entityId: organisationId,
      beforeState: { isActive: org.isActive },
      afterState: { isActive },
    });
  }

  async createUser(
    emailInput: string,
    passwordInput: string,
    fullName: string,
    actorUserId?: string
  ): Promise<{ id: string; email: string; fullName: string }> {
    const db = getDb();
    const normalized = normalizeEmail(emailInput);

    const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (existing.length > 0) {
      throw new ConflictError(`User email '${normalized}' already exists`);
    }

    const passwordHash = await authService.hashPassword(passwordInput);

    const [user] = await db
      .insert(users)
      .values({ email: normalized, passwordHash, fullName, isActive: true })
      .returning();

    await auditService.recordEvent({
      category: "USER",
      eventType: "USER_CREATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "USER",
      entityId: user.id,
      afterState: { email: user.email, fullName: user.fullName, isActive: user.isActive },
    });

    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  async setUserStatus(userId: string, isActive: boolean, actorUserId?: string): Promise<void> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId));

    await auditService.recordEvent({
      category: "USER",
      eventType: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "USER",
      entityId: userId,
      beforeState: { isActive: user.isActive },
      afterState: { isActive },
    });
  }

  async createMembership(
    organisationId: string,
    userId: string,
    actorUserId?: string
  ): Promise<{ id: string }> {
    const db = getDb();

    const existing = await db
      .select()
      .from(organisationMemberships)
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("User membership already exists in this organisation");
    }

    const [membership] = await db
      .insert(organisationMemberships)
      .values({ organisationId, userId, isActive: true })
      .returning();

    await auditService.recordEvent({
      organisationId,
      category: "ORG",
      eventType: "MEMBERSHIP_CREATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "MEMBERSHIP",
      entityId: membership.id,
      afterState: { userId, isActive: membership.isActive },
    });

    return { id: membership.id };
  }

  async setMembershipStatus(
    membershipId: string,
    isActive: boolean,
    actorUserId?: string
  ): Promise<void> {
    const db = getDb();
    const [mem] = await db
      .select()
      .from(organisationMemberships)
      .where(eq(organisationMemberships.id, membershipId))
      .limit(1);

    if (!mem) {
      throw new NotFoundError("Membership not found");
    }

    await db
      .update(organisationMemberships)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(organisationMemberships.id, membershipId));

    await auditService.recordEvent({
      organisationId: mem.organisationId,
      category: "ORG",
      eventType: isActive ? "MEMBERSHIP_ACTIVATED" : "MEMBERSHIP_DEACTIVATED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "MEMBERSHIP",
      entityId: membershipId,
      beforeState: { isActive: mem.isActive },
      afterState: { isActive },
    });
  }

  async assignPlatformRole(
    membershipId: string,
    roleKey: PlatformRoleKey,
    actorUserId?: string
  ): Promise<void> {
    const db = getDb();
    const [mem] = await db
      .select()
      .from(organisationMemberships)
      .where(eq(organisationMemberships.id, membershipId))
      .limit(1);

    if (!mem) {
      throw new NotFoundError("Membership not found");
    }

    const existing = await db
      .select()
      .from(membershipPlatformRoles)
      .where(
        and(
          eq(membershipPlatformRoles.membershipId, membershipId),
          eq(membershipPlatformRoles.roleKey, roleKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Role '${roleKey}' already assigned to this membership`);
    }

    await db.insert(membershipPlatformRoles).values({ membershipId, roleKey });

    await auditService.recordEvent({
      organisationId: mem.organisationId,
      category: "ROLE",
      eventType: "ROLE_ASSIGNED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "MEMBERSHIP_ROLE",
      entityId: membershipId,
      afterState: { roleKey },
    });
  }

  async removePlatformRole(
    membershipId: string,
    roleKey: PlatformRoleKey,
    actorUserId?: string
  ): Promise<void> {
    const db = getDb();
    const [mem] = await db
      .select()
      .from(organisationMemberships)
      .where(eq(organisationMemberships.id, membershipId))
      .limit(1);

    if (!mem) {
      throw new NotFoundError("Membership not found");
    }

    await db
      .delete(membershipPlatformRoles)
      .where(
        and(
          eq(membershipPlatformRoles.membershipId, membershipId),
          eq(membershipPlatformRoles.roleKey, roleKey)
        )
      );

    await auditService.recordEvent({
      organisationId: mem.organisationId,
      category: "ROLE",
      eventType: "ROLE_REMOVED",
      actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
      actorUserId: actorUserId || null,
      entityType: "MEMBERSHIP_ROLE",
      entityId: membershipId,
      beforeState: { roleKey },
    });
  }

  async revokeSession(sessionId: string, actorUserId?: string): Promise<void> {
    const db = getDb();
    const [sess] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sess) {
      await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, sessionId));

      await auditService.recordEvent({
        organisationId: sess.activeOrganisationId,
        category: "AUTH",
        eventType: "SESSION_REVOKED",
        actorType: actorUserId ? "AUTHENTICATED_USER" : "SYSTEM",
        actorUserId: actorUserId || null,
        entityType: "SESSION",
        entityId: sessionId,
      });
    }
  }

  /**
   * Multi-record operation wrapped in an explicit PostgreSQL transaction with error rollback.
   */
  async executeTransactionalSetup(
    orgKey: string,
    orgName: string,
    userEmail: string,
    fullName: string,
    shouldFail: boolean = false
  ): Promise<void> {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organisations)
        .values({ key: orgKey, name: orgName, isActive: true })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({ email: userEmail, passwordHash: "hash", fullName, isActive: true })
        .returning();

      await tx.insert(organisationMemberships).values({ organisationId: org.id, userId: user.id, isActive: true });

      if (shouldFail) {
        throw new ForbiddenError("Simulated transactional setup failure for rollback verification");
      }
    });
  }
}

export const adminService = new AdminService();
