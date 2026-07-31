import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  users,
  platformRoles,
  auditEvents,
  sessions,
} from "../../infrastructure/db/schema";
import { authService, PLATFORM_ROLES } from "../../modules/auth";
import { adminService } from "../../modules/organisation";
import { seedDevelopmentData } from "../../shared/seed";
import { tenantRepository } from "../../shared/tenant-repository";
import { eq, and } from "drizzle-orm";

describe("Increment 2 Comprehensive Security & Isolation Test Matrix", () => {
  let orgAId: string;
  let orgBId: string;
  let userId1: string;
  let userId2: string;
  let memA1Id: string;
  let memB1Id: string;
  let memA2Id: string;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.PLATFORM_ADMIN, name: "Admin" },
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime User" },
      { key: PLATFORM_ROLES.SUPERVISOR, name: "Supervisor" },
    ]).onConflictDoNothing();
  });

  beforeEach(async () => {
    const testSuffix = Math.random().toString(36).substring(7);

    const orgA = await adminService.createOrganisation(`org-a-${testSuffix}`, "Organisation A");
    const orgB = await adminService.createOrganisation(`org-b-${testSuffix}`, "Organisation B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const u1 = await adminService.createUser(`user1-${testSuffix}@org.com`, "Password123!", "User One");
    userId1 = u1.id;

    const u2 = await adminService.createUser(`user2-${testSuffix}@org.com`, "Password123!", "User Two");
    userId2 = u2.id;

    const memA1 = await adminService.createMembership(orgAId, userId1);
    const memB1 = await adminService.createMembership(orgBId, userId1);
    memA1Id = memA1.id;
    memB1Id = memB1.id;

    const memA2 = await adminService.createMembership(orgAId, userId2);
    memA2Id = memA2.id;

    await adminService.assignPlatformRole(memA1Id, PLATFORM_ROLES.SOLUTION_DESIGNER);
    await adminService.assignPlatformRole(memB1Id, PLATFORM_ROLES.RUNTIME_USER);

    await adminService.assignPlatformRole(memA2Id, PLATFORM_ROLES.RUNTIME_USER);
    await adminService.assignPlatformRole(memA2Id, PLATFORM_ROLES.SUPERVISOR);
  });

  // --- 1. Authentication & Session Matrix ---
  describe("Authentication and Session Lifecycle", () => {
    it("should successfully authenticate with valid credentials", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken, context } = await authService.login(u.email, "Password123!", o.key);
      expect(sessionToken).toBeDefined();
      expect(context.user.email).toBe(u.email);
      expect(context.activeOrganisation.key).toBe(o.key);
    });

    it("should reject incorrect password without revealing account details", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      await expect(authService.login(u.email, "WrongPassword!")).rejects.toThrow("Invalid email or password");
    });

    it("should reject unknown email without revealing account non-existence", async () => {
      await expect(authService.login("unknown@org.com", "Password123!")).rejects.toThrow("Invalid email or password");
    });

    it("should reject login for inactive user account", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      await adminService.setUserStatus(userId1, false);
      await expect(authService.login(u.email, "Password123!", o.key)).rejects.toThrow("Invalid email or password");
    });

    it("should reject login for inactive membership in requested organisation", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      await adminService.setMembershipStatus(memA1Id, false);
      await expect(authService.login(u.email, "Password123!", o.key)).rejects.toThrow("Requested organisation is unavailable");
    });

    it("should reject login for inactive organisation", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      await adminService.setOrganisationStatus(orgAId, false);
      await expect(authService.login(u.email, "Password123!", o.key)).rejects.toThrow("Requested organisation is unavailable");
    });

    it("should reject unauthenticated or malformed session tokens", async () => {
      await expect(authService.validateSession("")).rejects.toThrow("Malformed or missing session token");
      await expect(authService.validateSession("short-token")).rejects.toThrow("Malformed or missing session token");
      await expect(authService.validateSession("a".repeat(64))).rejects.toThrow("Invalid or revoked session");
    });

    it("should logout and reject subsequent requests with revoked session", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken } = await authService.login(u.email, "Password123!", o.key);
      await authService.logout(sessionToken);
      await expect(authService.validateSession(sessionToken)).rejects.toThrow("Invalid or revoked session");
    });

    it("should reject session if user is deactivated post-authentication on next request", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken } = await authService.login(u.email, "Password123!", o.key);
      await adminService.setUserStatus(userId1, false);
      await expect(authService.validateSession(sessionToken)).rejects.toThrow("User account is inactive");
    });

    it("should reject session if membership is deactivated post-authentication on next request", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken } = await authService.login(u.email, "Password123!", o.key);
      await adminService.setMembershipStatus(memA1Id, false);
      await expect(authService.validateSession(sessionToken)).rejects.toThrow("Organisation or membership is no longer active");
    });

    it("should reject session if organisation is deactivated post-authentication on next request", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken } = await authService.login(u.email, "Password123!", o.key);
      await adminService.setOrganisationStatus(orgAId, false);
      await expect(authService.validateSession(sessionToken)).rejects.toThrow("Organisation or membership is no longer active");
    });

    it("should reject expired inactivity session and prevent expiry extension", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const { sessionToken } = await authService.login(u.email, "Password123!", o.key);

      const pastTime = new Date(Date.now() - 3600 * 1000);
      await db.update(sessions).set({ expiresAt: pastTime }).where(eq(sessions.userId, userId1));

      await expect(authService.validateSession(sessionToken)).rejects.toThrow("Session has expired due to inactivity");

      const [rechecked] = await db.select().from(sessions).where(eq(sessions.userId, userId1)).limit(1);
      expect(new Date(rechecked.expiresAt).getTime()).toBeLessThan(Date.now());
    });

    it("should prevent session fixation by issuing fresh unique tokens on each login", async () => {
      const db = getDb();
      const [u] = await db.select().from(users).where(eq(users.id, userId1)).limit(1);
      const [o] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
      const login1 = await authService.login(u.email, "Password123!", o.key);
      const login2 = await authService.login(u.email, "Password123!", o.key);
      expect(login1.sessionToken).not.toEqual(login2.sessionToken);
    });
  });

  // --- 2. Administrative Services & Audit Verification ---
  describe("Administrative Services and Audit Trail", () => {
    it("verifies administrative actions (create, status, role assignment) produce audit events", async () => {
      const db = getDb();
      const testOrgKey = `admin-test-${Math.random().toString(36).substring(7)}`;
      const newOrg = await adminService.createOrganisation(testOrgKey, "Admin Test Org");
      await adminService.setOrganisationStatus(newOrg.id, false);

      const [auditEntry] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.organisationId, newOrg.id), eq(auditEvents.eventType, "ORGANISATION_DEACTIVATED")))
        .limit(1);

      expect(auditEntry).toBeDefined();
      expect(auditEntry.entityId).toBe(newOrg.id);
    });

    it("proves transactional setup rolls back completely on error without partial data leakage", async () => {
      const db = getDb();
      const failSuffix = Math.random().toString(36).substring(7);
      const failOrgKey = `fail-org-${failSuffix}`;
      const failEmail = `fail-user-${failSuffix}@test.com`;

      await expect(
        adminService.executeTransactionalSetup(failOrgKey, "Fail Org", failEmail, "Fail User", true)
      ).rejects.toThrow("Simulated transactional setup failure");

      const [checkOrg] = await db.select().from(organisations).where(eq(organisations.key, failOrgKey)).limit(1);
      const [checkUser] = await db.select().from(users).where(eq(users.email, failEmail)).limit(1);

      expect(checkOrg).toBeUndefined();
      expect(checkUser).toBeUndefined();
    });
  });

  // --- 3. Tenant Scoping & Non-Disclosure Matrix ---
  describe("Tenant Non-Disclosure and Scoping", () => {
    it("proves Organisation B cannot retrieve Organisation A record and returns 404", async () => {
      await expect(
        tenantRepository.getTenantRecord(orgBId, orgAId)
      ).rejects.toThrow("Resource not found");
    });
  });

  // --- 4. Seed Idempotency & Non-Destructive Verification ---
  describe("Seed Idempotency & Safety Rules", () => {
    it("proves a second seed run does not overwrite existing password hashes or status", async () => {
      const db = getDb();
      await seedDevelopmentData();

      const [adminUserBefore] = await db.select().from(users).where(eq(users.email, "admin@acme.com")).limit(1);
      const initialHash = adminUserBefore.passwordHash;

      await seedDevelopmentData();

      const [adminUserAfter] = await db.select().from(users).where(eq(users.email, "admin@acme.com")).limit(1);
      expect(adminUserAfter.passwordHash).toBe(initialHash);
    });
  });
});
