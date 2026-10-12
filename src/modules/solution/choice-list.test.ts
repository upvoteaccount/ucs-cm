import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  auditEvents,
  platformRoles,
} from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { choiceListService } from "./choice-list.service";
import { adminService } from "../organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError, NotFoundError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-03C4 Choice List & Ordered Option Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerUserId: string;
  let designerContext: SessionContext;
  let solutionA: { id: string; revision: number };

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

    const orgA = await adminService.createOrganisation(`cl-org-a-${suffix}`, "CL Org A");
    const orgB = await adminService.createOrganisation(`cl-org-b-${suffix}`, "CL Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const uDesigner = await adminService.createUser(`cldesigner-${suffix}@test.com`, "Password123!", "CL Designer");
    designerUserId = uDesigner.id;

    const memA1 = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerContext = desLogin.context;

    const sol = await solutionService.createSolution(
      { name: "Risk Management App", solutionPrefix: "RMA" },
      designerContext
    );
    solutionA = { id: sol.id, revision: sol.revision };
  });

  // --- 1. Choice List Identity & Uniqueness ---
  describe("Choice List Identity & Uniqueness", () => {
    it("creates choice list, increments solution revision, and logs CHOICE_LIST_CREATED in same transaction", async () => {
      const db = getDb();
      const { choiceList, solutionRevision } = await choiceListService.createChoiceList(
        solutionA.id,
        {
          expectedRevision: 1,
          key: "risk_levels",
          name: "Risk Levels",
          description: "Customer risk classification values",
        },
        designerContext
      );

      expect(choiceList.id).toBeDefined();
      expect(choiceList.key).toBe("RMA_LIST_RISK_LEVELS");
      expect(solutionRevision).toBe(2);

      // Verify CHOICE_LIST_CREATED audit event in DB
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, choiceList.id), eq(auditEvents.eventType, "CHOICE_LIST_CREATED")))
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit.organisationId).toBe(orgAId);
    });

    it("enforces duplicate Choice List key rejection within the same Solution with 409 ConflictError", async () => {
      await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "status_codes", name: "Status Codes" },
        designerContext
      );

      // Duplicate key attempt
      await expect(
        choiceListService.createChoiceList(
          solutionA.id,
          { expectedRevision: 2, key: "status_codes", name: "Duplicate Status Codes" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  // --- 2. Option Identity & Ordered Option Model ---
  describe("Option Identity, Ordering & Uniqueness", () => {
    it("appends options at next positive displayOrder and enforces option key uniqueness within Choice List", async () => {
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "priority_list", name: "Priority List" },
        designerContext
      );

      const { option: opt1 } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 2, key: "low", label: "Low Priority" },
        designerContext
      );
      expect(opt1.displayOrder).toBe(1);

      const { option: opt2 } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 3, key: "high", label: "High Priority" },
        designerContext
      );
      expect(opt2.displayOrder).toBe(2);

      // Duplicate option key within same Choice List -> 409 ConflictError
      await expect(
        choiceListService.createOption(
          solutionA.id,
          choiceList.id,
          { expectedRevision: 4, key: "low", label: "Duplicate Low" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("reorders options atomically when payload contains every existing option ID exactly once", async () => {
      const db = getDb();
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "severity_levels", name: "Severity Levels" },
        designerContext
      );

      const { option: optLow } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 2, key: "sev_low", label: "Low" },
        designerContext
      );

      const { option: optHigh } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 3, key: "sev_high", label: "High" },
        designerContext
      );

      // Reorder: high first, then low
      const { options: reordered } = await choiceListService.reorderOptions(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 4, optionIds: [optHigh.id, optLow.id] },
        designerContext
      );

      expect(reordered[0].id).toBe(optHigh.id);
      expect(reordered[0].displayOrder).toBe(1);
      expect(reordered[1].id).toBe(optLow.id);
      expect(reordered[1].displayOrder).toBe(2);

      // Verify CHOICE_LIST_UPDATED audit event recorded with OPTIONS_REORDERED changeType
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, choiceList.id), eq(auditEvents.eventType, "CHOICE_LIST_UPDATED")))
        .limit(1);

      expect(audit).toBeDefined();
      const metadata = audit.metadata as Record<string, unknown>;
      expect(metadata.changeType).toBe("OPTIONS_REORDERED");
    });

    it("rejects reorder payloads containing missing, duplicate or foreign option IDs with 400 ValidationError", async () => {
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "country_codes", name: "Country Codes" },
        designerContext
      );

      const { option: opt1 } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 2, key: "us", label: "United States" },
        designerContext
      );

      // Reorder payload missing opt1 -> throws 400 ValidationError
      await expect(
        choiceListService.reorderOptions(
          solutionA.id,
          choiceList.id,
          { expectedRevision: 3, optionIds: [] },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // Reorder payload duplicate ID -> throws 400 ValidationError
      await expect(
        choiceListService.reorderOptions(
          solutionA.id,
          choiceList.id,
          { expectedRevision: 3, optionIds: [opt1.id, opt1.id] },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- 3. Option Deactivation ---
  describe("Option Deactivation Mechanics", () => {
    it("deactivates option preserving key, label, displayOrder and records CHOICE_OPTION_DEACTIVATED audit", async () => {
      const db = getDb();
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "regions", name: "Regions" },
        designerContext
      );

      const { option: opt } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 2, key: "emea", label: "EMEA Region" },
        designerContext
      );

      const { option: deactivated } = await choiceListService.deactivateOption(
        solutionA.id,
        choiceList.id,
        opt.id,
        { expectedRevision: 3 },
        designerContext
      );

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.key).toBe("emea");
      expect(deactivated.label).toBe("EMEA Region");
      expect(deactivated.displayOrder).toBe(1);

      // Verify CHOICE_OPTION_DEACTIVATED audit event in DB
      const audits = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, opt.id), eq(auditEvents.eventType, "CHOICE_OPTION_DEACTIVATED")));

      expect(audits.length).toBe(1);

      // Repeated deactivation is an idempotent no-op
      const { option: repeatDeactivated, solutionRevision: repRev } = await choiceListService.deactivateOption(
        solutionA.id,
        choiceList.id,
        opt.id,
        { expectedRevision: 3 },
        designerContext
      );

      expect(repeatDeactivated.isActive).toBe(false);
      expect(repRev).toBe(4); // Solution revision unchanged from initial deactivation (revision 4)

      const auditsAfter = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, opt.id), eq(auditEvents.eventType, "CHOICE_OPTION_DEACTIVATED")));

      expect(auditsAfter.length).toBe(1); // No new audit event written

      // Attempt to create another option with same key ('emea') -> blocked with guidance
      await expect(
        choiceListService.createOption(
          solutionA.id,
          choiceList.id,
          { expectedRevision: 4, key: "emea", label: "EMEA Region" },
          designerContext
        )
      ).rejects.toThrow("An inactive option with this value already exists. Reactivate it instead.");

      // Reactivate option -> restores same option record, preserving key/ID/label/displayOrder
      const { option: reactivated, solutionRevision: reactRev } = await choiceListService.reactivateOption(
        solutionA.id,
        choiceList.id,
        opt.id,
        { expectedRevision: 4 },
        designerContext
      );

      expect(reactivated.id).toBe(opt.id);
      expect(reactivated.key).toBe("emea");
      expect(reactivated.label).toBe("EMEA Region");
      expect(reactivated.displayOrder).toBe(1);
      expect(reactivated.isActive).toBe(true);
      expect(reactRev).toBe(5);

      // Verify CHOICE_OPTION_REACTIVATED audit event in DB
      const reactAudits = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, opt.id), eq(auditEvents.eventType, "CHOICE_OPTION_REACTIVATED")));

      expect(reactAudits.length).toBe(1);
    });

    it("succeeds reordering when existing display orders already exceed 10000", async () => {
      const db = getDb();
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "high_orders", name: "High Orders" },
        designerContext
      );

      const { option: optA } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 2, key: "opt_a", label: "Opt A" },
        designerContext
      );
      const { option: optB } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 3, key: "opt_b", label: "Opt B" },
        designerContext
      );

      // Artificially bump displayOrder above 10000 in DB
      await db
        .update((await import("../../infrastructure/db/schema")).choiceOptions)
        .set({ displayOrder: 15000 })
        .where(eq((await import("../../infrastructure/db/schema")).choiceOptions.id, optA.id));

      await db
        .update((await import("../../infrastructure/db/schema")).choiceOptions)
        .set({ displayOrder: 15001 })
        .where(eq((await import("../../infrastructure/db/schema")).choiceOptions.id, optB.id));

      // Reorder optB first, then optA
      const { options: reordered } = await choiceListService.reorderOptions(
        solutionA.id,
        choiceList.id,
        { expectedRevision: 4, optionIds: [optB.id, optA.id] },
        designerContext
      );

      expect(reordered[0].id).toBe(optB.id);
      expect(reordered[0].displayOrder).toBe(1);
      expect(reordered[1].id).toBe(optA.id);
      expect(reordered[1].displayOrder).toBe(2);
    });
  });

  // --- 4. Concurrency & Tenant Isolation ---
  describe("Mutation Guards & Tenant Non-Disclosure", () => {
    it("rejects mutation on expectedRevision mismatch with 409 ConflictError and makes zero changes", async () => {
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "stale_list", name: "Stale List" },
        designerContext
      );

      // Stale request expectedRevision = 1 (current solution revision is 2)
      await expect(
        choiceListService.updateChoiceList(
          solutionA.id,
          choiceList.id,
          { expectedRevision: 1, name: "Stale Update Name" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);

      const current = await choiceListService.getChoiceListById(solutionA.id, choiceList.id, designerContext);
      expect(current.name).toBe("Stale List");
    });

    it("returns 404 NotFoundError when reading or modifying Choice List from a foreign organisation", async () => {
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 1, key: "secret_list", name: "Secret List" },
        designerContext
      );

      // Create designer user in Org B
      const uDesignerOrgB = await adminService.createUser(`cl-orgb-${Math.random().toString(36).substring(7)}@test.com`, "Password123!", "Designer OrgB");
      const memB = await adminService.createMembership(orgBId, uDesignerOrgB.id);
      await adminService.assignPlatformRole(memB.id, PLATFORM_ROLES.SOLUTION_DESIGNER);
      const [orgBRec] = await getDb().select().from(organisations).where(eq(organisations.id, orgBId)).limit(1);
      const orgBLogin = await authService.login(uDesignerOrgB.email, "Password123!", orgBRec.key);

      await expect(
        choiceListService.getChoiceListById(solutionA.id, choiceList.id, orgBLogin.context)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- 5. End-to-End Choice Set Lifecycle Workflow ---
  describe("End-to-End Choice Set Lifecycle Workflow", () => {
    it("orchestrates create, add options, reload, rename, reorder, deactivate and verifies final state persistence", async () => {
      let rev = 1;

      // 1. Create Choice List "Existing Loans"
      const { choiceList, solutionRevision: rev1 } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: rev, key: "existing_loans", name: "Existing Loans", description: "Loan types" },
        designerContext
      );
      expect(choiceList.id).toBeDefined();
      expect(rev1).toBe(2);
      rev = rev1;

      // 2. Add options: Car, Home Loan, Personal Loan
      const { option: optCar, solutionRevision: revCar } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: rev, key: "car", label: "Car" },
        designerContext
      );
      rev = revCar;

      const { option: optHome, solutionRevision: revHome } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: rev, key: "home_loan", label: "Home Loan" },
        designerContext
      );
      rev = revHome;

      const { option: optPersonal, solutionRevision: revPersonal } = await choiceListService.createOption(
        solutionA.id,
        choiceList.id,
        { expectedRevision: rev, key: "personal_loan", label: "Personal Loan" },
        designerContext
      );
      rev = revPersonal;

      // 3. Reload & verify all 3 options present
      let reloaded = await choiceListService.getChoiceListById(solutionA.id, choiceList.id, designerContext);
      expect(reloaded.options.length).toBe(3);
      expect(reloaded.options.map((o) => o.label)).toEqual(["Car", "Home Loan", "Personal Loan"]);

      // 4. Rename Home Loan -> Housing Loan
      const { solutionRevision: revRename } = await choiceListService.updateOption(
        solutionA.id,
        choiceList.id,
        optHome.id,
        { expectedRevision: rev, label: "Housing Loan" },
        designerContext
      );
      rev = revRename;

      // 5. Reorder options: [Personal Loan, Housing Loan, Car]
      const { solutionRevision: revReorder } = await choiceListService.reorderOptions(
        solutionA.id,
        choiceList.id,
        { expectedRevision: rev, optionIds: [optPersonal.id, optHome.id, optCar.id] },
        designerContext
      );
      rev = revReorder;

      // 6. Deactivate one option (Car)
      const { solutionRevision: revDeact } = await choiceListService.deactivateOption(
        solutionA.id,
        choiceList.id,
        optCar.id,
        { expectedRevision: rev },
        designerContext
      );
      rev = revDeact;

      // 7. Reload & verify final state persists
      reloaded = await choiceListService.getChoiceListById(solutionA.id, choiceList.id, designerContext);
      expect(reloaded.options.length).toBe(3);
      const activeOptions = reloaded.options.filter((o) => o.isActive);
      expect(activeOptions.length).toBe(2);
      expect(activeOptions.map((o) => o.label)).toEqual(["Personal Loan", "Housing Loan"]);
    });
  });
});
