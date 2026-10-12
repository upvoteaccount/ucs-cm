import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  queueUserAssignments,
  auditEvents,
  platformRoles,
} from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { solutionQueueService, generateQueueKeyFromName } from "./queue.service";
import { adminService } from "../organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-04A Work Queues & User Assignment Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerContext: SessionContext;
  let solutionA: { id: string; solutionPrefix: string; revision: number };

  let userA1: { id: string; email: string };
  let userA2: { id: string; email: string };
  let userB1: { id: string; email: string };

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
    const suffix = Math.random().toString(36).substring(7);

    const orgA = await adminService.createOrganisation(`queue-org-a-${suffix}`, "Queue Org A");
    const orgB = await adminService.createOrganisation(`queue-org-b-${suffix}`, "Queue Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    // Create Designer User in Org A
    const uDesigner = await adminService.createUser(`qdesigner-${suffix}@test.com`, "Password123!", "Queue Designer");
    const memA1 = await adminService.createMembership(orgAId, uDesigner.id);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    // Create additional Users in Org A
    const u1 = await adminService.createUser(`user-a1-${suffix}@test.com`, "Password123!", "User A1");
    await adminService.createMembership(orgAId, u1.id);
    userA1 = { id: u1.id, email: u1.email };

    const u2 = await adminService.createUser(`user-a2-${suffix}@test.com`, "Password123!", "User A2");
    await adminService.createMembership(orgAId, u2.id);
    userA2 = { id: u2.id, email: u2.email };

    // Create User in Org B (Foreign Org)
    const uB = await adminService.createUser(`user-b1-${suffix}@test.com`, "Password123!", "User B1 Foreign");
    await adminService.createMembership(orgBId, uB.id);
    userB1 = { id: uB.id, email: uB.email };

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerContext = desLogin.context;

    const sol = await solutionService.createSolution(
      { name: "Queue Test Solution", solutionPrefix: `QTS${suffix.toUpperCase()}`.slice(0, 10) },
      designerContext
    );
    solutionA = { id: sol.id, solutionPrefix: sol.solutionPrefix, revision: sol.revision };
  });

  describe("1. Queue Key Generation & Key Normalizer", () => {
    it("generates uppercase queue key prefixed with Solution prefix according to <SOLUTION_PREFIX>_<NORMALIZED_QUEUE_NAME>", () => {
      expect(generateQueueKeyFromName("PLA", "SOL Maker")).toBe("PLA_SOL_MAKER");
      expect(generateQueueKeyFromName("PLA", "SOL Checker")).toBe("PLA_SOL_CHECKER");
      expect(generateQueueKeyFromName("PLA", "TFC Comp")).toBe("PLA_TFC_COMP");
      expect(generateQueueKeyFromName("TFC", "   compliance  review  ")).toBe("TFC_COMPLIANCE_REVIEW");
    });

    it("handles non-alphanumeric characters cleanly", () => {
      expect(generateQueueKeyFromName("KYC", "Tier-1 @ Support!")).toBe("KYC_TIER_1_SUPPORT");
    });

    it("throws ValidationError when queue name contains no valid alphanumeric characters", () => {
      expect(() => generateQueueKeyFromName("PLA", "   !@#$%^   ")).toThrow(ValidationError);
    });
  });

  describe("2. Queue Creation & Key Uniqueness", () => {
    it("successfully creates a queue with generated prefix key, increments revision, and creates audit event", async () => {
      const sol = await solutionService.getSolutionById(solutionA.id, designerContext);
      const res = await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "SOL Maker",
        description: "Queue for initial makers",
        expectedRevision: sol.revision,
      });

      expect(res.queue.name).toBe("SOL Maker");
      expect(res.queue.queueKey).toBe(`${solutionA.solutionPrefix}_SOL_MAKER`);
      expect(res.queue.description).toBe("Queue for initial makers");
      expect(res.solutionRevision).toBe(sol.revision + 1);

      // Verify Audit Event
      const db = getDb();
      const audit = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, res.queue.id), eq(auditEvents.eventType, "QUEUE_CREATED")));
      expect(audit).toHaveLength(1);
      expect(audit[0].category).toBe("METADATA");
    });

    it("rejects creating duplicate queue key within same solution with 409 Conflict", async () => {
      const sol1 = await solutionService.getSolutionById(solutionA.id, designerContext);
      await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "SOL Maker",
        expectedRevision: sol1.revision,
      });

      const sol2 = await solutionService.getSolutionById(solutionA.id, designerContext);

      await expect(
        solutionQueueService.createQueue(designerContext, solutionA.id, {
          name: "sol maker", // normalizes to SOL_MAKER duplicate
          expectedRevision: sol2.revision,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("rejects creation on stale expectedRevision without mutating DB", async () => {
      const sol = await solutionService.getSolutionById(solutionA.id, designerContext);
      await expect(
        solutionQueueService.createQueue(designerContext, solutionA.id, {
          name: "SOL Checker",
          expectedRevision: sol.revision + 999,
        })
      ).rejects.toThrow(ConflictError);

      const { queues } = await solutionQueueService.listQueues(designerContext, solutionA.id);
      expect(queues).toHaveLength(0);
    });
  });

  describe("3. Queue Updates & Deletion", () => {
    it("updates queue name and description while keeping queue key immutable", async () => {
      const sol1 = await solutionService.getSolutionById(solutionA.id, designerContext);
      const createRes = await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "SOL Checker",
        expectedRevision: sol1.revision,
      });

      const updateRes = await solutionQueueService.updateQueue(
        designerContext,
        solutionA.id,
        createRes.queue.id,
        {
          name: "SOL Senior Checker",
          description: "Updated description",
          expectedRevision: createRes.solutionRevision,
        }
      );

      expect(updateRes.queue.name).toBe("SOL Senior Checker");
      expect(updateRes.queue.queueKey).toBe(`${solutionA.solutionPrefix}_SOL_CHECKER`); // Unchanged
      expect(updateRes.queue.description).toBe("Updated description");
      expect(updateRes.solutionRevision).toBe(createRes.solutionRevision + 1);
    });

    it("deletes a queue and cascades deletion to user assignments", async () => {
      const sol1 = await solutionService.getSolutionById(solutionA.id, designerContext);
      const createRes = await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "TFC Auth",
        expectedRevision: sol1.revision,
      });

      // Assign user
      const setRes = await solutionQueueService.setQueueUsers(designerContext, solutionA.id, createRes.queue.id, {
        userIds: [userA1.id],
        expectedRevision: createRes.solutionRevision,
      });

      // Delete queue
      const delRes = await solutionQueueService.deleteQueue(
        designerContext,
        solutionA.id,
        createRes.queue.id,
        setRes.solutionRevision
      );

      expect(delRes.solutionRevision).toBe(setRes.solutionRevision + 1);

      // Verify queue is gone
      const { queues } = await solutionQueueService.listQueues(designerContext, solutionA.id);
      expect(queues.find((q) => q.id === createRes.queue.id)).toBeUndefined();

      // Verify user assignments cascade deleted
      const db = getDb();
      const assignments = await db
        .select()
        .from(queueUserAssignments)
        .where(eq(queueUserAssignments.queueId, createRes.queue.id));
      expect(assignments).toHaveLength(0);
    });
  });

  describe("4. Tenant-Safe User Assignments", () => {
    it("assigns active users belonging to the active organisation", async () => {
      const sol1 = await solutionService.getSolutionById(solutionA.id, designerContext);
      const createRes = await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "TFC Comp",
        expectedRevision: sol1.revision,
      });

      const setRes = await solutionQueueService.setQueueUsers(designerContext, solutionA.id, createRes.queue.id, {
        userIds: [userA1.id, userA2.id],
        expectedRevision: createRes.solutionRevision,
      });

      expect(setRes.assignedUsers).toHaveLength(2);
      expect(setRes.assignedUsers.map((u) => u.id).sort()).toEqual([userA1.id, userA2.id].sort());
    });

    it("STRICTLY REJECTS assigning users from a foreign organisation", async () => {
      const sol1 = await solutionService.getSolutionById(solutionA.id, designerContext);
      const createRes = await solutionQueueService.createQueue(designerContext, solutionA.id, {
        name: "TFC Comp",
        expectedRevision: sol1.revision,
      });

      await expect(
        solutionQueueService.setQueueUsers(designerContext, solutionA.id, createRes.queue.id, {
          userIds: [userA1.id, userB1.id], // userB1 belongs to orgB!
          expectedRevision: createRes.solutionRevision,
        })
      ).rejects.toThrow(ConflictError);

      // Verify no partial assignment happened
      const details = await solutionQueueService.getQueueDetails(designerContext, solutionA.id, createRes.queue.id);
      expect(details.assignedUsers).toHaveLength(0);
    });

    it("lists eligible organisation users for Studio assignment", async () => {
      const res = await solutionQueueService.listEligibleUsers(designerContext, solutionA.id);
      const userIds = res.users.map((u) => u.id);
      expect(userIds).toContain(userA1.id);
      expect(userIds).toContain(userA2.id);
      expect(userIds).not.toContain(userB1.id);
    });
  });
});
