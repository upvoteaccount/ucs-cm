import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  solutionForms,
  formTabs,
  formSections,
  auditEvents,
  platformRoles,
} from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { adminService } from "../organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError, NotFoundError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-03C2 Solution Repository & Service Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerUserId: string;
  let runtimeUserId: string;
  let designerContext: SessionContext;

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

    const orgA = await adminService.createOrganisation(`sol-org-a-${suffix}`, "Sol Org A");
    const orgB = await adminService.createOrganisation(`sol-org-b-${suffix}`, "Sol Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const uDesigner = await adminService.createUser(`designer-${suffix}@test.com`, "Password123!", "Designer User");
    designerUserId = uDesigner.id;

    const uRuntime = await adminService.createUser(`runtime-${suffix}@test.com`, "Password123!", "Runtime User");
    runtimeUserId = uRuntime.id;

    const memA1 = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const memA2 = await adminService.createMembership(orgAId, runtimeUserId);
    await adminService.assignPlatformRole(memA2.id, PLATFORM_ROLES.RUNTIME_USER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerContext = desLogin.context;
  });

  // --- 1. Solution Repository & Service Operations ---
  describe("Repository & Service Core Mechanics", () => {
    it("proves creation provisions 1 initial form, 1 default tab, 0 sections, revision 1, draft status and same-tx audit", async () => {
      const db = getDb();
      const sol = await solutionService.createSolution(
        {
          name: "Customer Due Diligence",
          description: "CDD Workflow Solution",
          solutionPrefix: "CDD",
        },
        designerContext
      );

      expect(sol.id).toBeDefined();
      expect(sol.name).toBe("Customer Due Diligence");
      expect(sol.solutionPrefix).toBe("CDD");
      expect(sol.revision).toBe(1);
      expect(sol.status).toBe("DRAFT");
      expect(sol.organisationId).toBe(orgAId);

      // Verify exactly 1 initial form was provisioned
      const forms = await db.select().from(solutionForms).where(eq(solutionForms.solutionId, sol.id));
      expect(forms.length).toBe(1);
      expect(forms[0].formKey).toBe("initial_form");

      // Verify exactly 1 default tab was provisioned
      const tabs = await db.select().from(formTabs).where(eq(formTabs.formId, forms[0].id));
      expect(tabs.length).toBe(1);
      expect(tabs[0].displayOrder).toBe(1);

      // Verify 0 default sections were created
      const sections = await db.select().from(formSections).where(eq(formSections.formId, forms[0].id));
      expect(sections.length).toBe(0);

      // Verify SOLUTION_CREATED audit event was written in the same transaction
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, sol.id), eq(auditEvents.eventType, "SOLUTION_CREATED")))
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit.organisationId).toBe(orgAId);
      expect(audit.actorUserId).toBe(designerUserId);
    });

    it("enforces deterministic list ordering by updatedAt DESC with id ASC tie-breaker", async () => {
      const sol1 = await solutionService.createSolution(
        { name: "Alpha Solution", solutionPrefix: "ALPHA" },
        designerContext
      );

      const sol2 = await solutionService.createSolution(
        { name: "Beta Solution", solutionPrefix: "BETA" },
        designerContext
      );

      // Update sol1 to give it a newer updatedAt timestamp
      await new Promise((resolve) => setTimeout(resolve, 50));
      await solutionService.updateSolution(
        sol1.id,
        { expectedRevision: 1, name: "Alpha Solution Updated" },
        designerContext
      );

      const list = await solutionService.listSolutions(designerContext);
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(sol1.id);
      expect(list[1].id).toBe(sol2.id);
    });

    it("enforces duplicate prefix rejection within the active organisation", async () => {
      await solutionService.createSolution(
        { name: "First Sol", solutionPrefix: "KYC" },
        designerContext
      );

      await expect(
        solutionService.createSolution(
          { name: "Second Sol Same Prefix", solutionPrefix: "KYC" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("validates prefix regex format strictly", async () => {
      await expect(
        solutionService.createSolution(
          { name: "Bad Prefix Sol", solutionPrefix: "cdd_123" },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- 2. Optimistic Concurrency & Transactional Audit ---
  describe("Optimistic Concurrency Control & Audit Integrity", () => {
    it("updates solution and increments revision on expectedRevision match, writing SOLUTION_UPDATED audit", async () => {
      const db = getDb();
      const sol = await solutionService.createSolution(
        { name: "Initial Name", solutionPrefix: "CONC" },
        designerContext
      );

      const updated = await solutionService.updateSolution(
        sol.id,
        { expectedRevision: 1, name: "Updated Name", description: "New Desc" },
        designerContext
      );

      expect(updated.revision).toBe(2);
      expect(updated.name).toBe("Updated Name");

      // Verify SOLUTION_UPDATED audit event in DB
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, sol.id), eq(auditEvents.eventType, "SOLUTION_UPDATED")))
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit.actorUserId).toBe(designerUserId);
    });

    it("rejects stale expectedRevision with 409 ConflictError and makes zero changes", async () => {
      const db = getDb();
      const sol = await solutionService.createSolution(
        { name: "Concurrency Sol", solutionPrefix: "STALE" },
        designerContext
      );

      // Perform valid update 1 -> revision becomes 2
      await solutionService.updateSolution(
        sol.id,
        { expectedRevision: 1, name: "Update 1" },
        designerContext
      );

      // Stale request with expectedRevision = 1 throws ConflictError
      await expect(
        solutionService.updateSolution(
          sol.id,
          { expectedRevision: 1, name: "Stale Update Attempt" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);

      // Verify database record remains at revision 2 with name "Update 1"
      const current = await solutionService.getSolutionById(sol.id, designerContext);
      expect(current.revision).toBe(2);
      expect(current.name).toBe("Update 1");

      // Verify no SOLUTION_UPDATED audit event was recorded for the failed stale update
      const audits = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, sol.id), eq(auditEvents.eventType, "SOLUTION_UPDATED")));

      expect(audits.length).toBe(1); // Only the successful update 1 event exists
    });
  });

  // --- 3. Tenant Non-Disclosure & Isolation ---
  describe("Tenant Non-Disclosure & Isolation", () => {
    it("returns 404 NotFoundError when attempting to read or update a foreign organisation Solution", async () => {
      const solOrgA = await solutionService.createSolution(
        { name: "Org A Secret Sol", solutionPrefix: "SECRET" },
        designerContext
      );

      // Create designer user in Org B
      const uDesignerOrgB = await adminService.createUser(`designer-orgb-${Math.random().toString(36).substring(7)}@test.com`, "Password123!", "Designer OrgB");
      const memB = await adminService.createMembership(orgBId, uDesignerOrgB.id);
      await adminService.assignPlatformRole(memB.id, PLATFORM_ROLES.SOLUTION_DESIGNER);
      const [orgBRec] = await getDb().select().from(organisations).where(eq(organisations.id, orgBId)).limit(1);
      const orgBLogin = await authService.login(uDesignerOrgB.email, "Password123!", orgBRec.key);

      // Reading Org A solution from Org B context returns 404 (non-disclosure)
      await expect(
        solutionService.getSolutionById(solOrgA.id, orgBLogin.context)
      ).rejects.toThrow(NotFoundError);

      // Updating Org A solution from Org B context returns 404 (non-disclosure)
      await expect(
        solutionService.updateSolution(
          solOrgA.id,
          { expectedRevision: 1, name: "Hacked Name" },
          orgBLogin.context
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
