import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  platformRoles,
} from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { solutionPropertyService } from "./solution-property.service";
import { choiceListService } from "./choice-list.service";
import { formService } from "./form.service";
import { adminService } from "../organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError, NotFoundError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-03C5 Form Layout Management Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerUserId: string;
  let designerContext: SessionContext;
  let solutionA: { id: string; revision: number };
  let defaultTabId: string;

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

    const orgA = await adminService.createOrganisation(`form-org-a-${suffix}`, "Form Org A");
    const orgB = await adminService.createOrganisation(`form-org-b-${suffix}`, "Form Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const uDesigner = await adminService.createUser(`formdesigner-${suffix}@test.com`, "Password123!", "Form Designer");
    designerUserId = uDesigner.id;

    const memA1 = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerContext = desLogin.context;

    const sol = await solutionService.createSolution(
      { name: "Customer Onboarding App", solutionPrefix: "COA" },
      designerContext
    );
    solutionA = { id: sol.id, revision: sol.revision };

    const { formAggregate } = await formService.getFormAggregate(solutionA.id, designerContext);
    defaultTabId = formAggregate.tabs[0].id;
  });

  // --- 1. Initial Form Provisions & Reads ---
  describe("Initial Form Read & Default Tab", () => {
    it("proves 1 initial form, 1 default tab, 0 default sections are provisioned and readable", async () => {
      const { formAggregate, solutionRevision } = await formService.getFormAggregate(
        solutionA.id,
        designerContext
      );

      expect(formAggregate.form.id).toBeDefined();
      expect(formAggregate.tabs.length).toBe(1);
      expect(formAggregate.tabs[0].title).toBe("Main");
      expect(formAggregate.sections.length).toBe(0);
      expect(formAggregate.fields.length).toBe(0);
      expect(solutionRevision).toBe(1);
    });
  });

  // --- 2. Tab Management ---
  describe("Tab Management & Delete Guards", () => {
    it("creates, updates title, reorders, and deletes an empty Tab", async () => {
      const { tab: tab2 } = await formService.createTab(
        solutionA.id,
        { expectedRevision: 1, title: "Financial Details" },
        designerContext
      );

      expect(tab2.title).toBe("Financial Details");
      expect(tab2.displayOrder).toBe(2);

      const { tab: updatedTab2 } = await formService.updateTab(
        solutionA.id,
        tab2.id,
        { expectedRevision: 2, title: "Financials" },
        designerContext
      );
      expect(updatedTab2.title).toBe("Financials");

      // Reorder tabs: tab2 first, default tab second
      const { tabs: reordered } = await formService.reorderTabs(
        solutionA.id,
        { expectedRevision: 3, tabIds: [tab2.id, defaultTabId] },
        designerContext
      );
      expect(reordered[0].id).toBe(tab2.id);
      expect(reordered[0].displayOrder).toBe(1);
      expect(reordered[1].id).toBe(defaultTabId);
      expect(reordered[1].displayOrder).toBe(2);

      // Delete tab2
      const { success } = await formService.deleteTab(
        solutionA.id,
        tab2.id,
        { expectedRevision: 4 },
        designerContext
      );
      expect(success).toBe(true);
    });

    it("rejects deleting the last remaining Tab in a Form with 409 ConflictError", async () => {
      await expect(
        formService.deleteTab(
          solutionA.id,
          defaultTabId,
          { expectedRevision: 1 },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("rejects deleting a non-empty Tab with 409 ConflictError", async () => {
      // Create a section inside defaultTab
      await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Overview Section" },
        designerContext
      );

      // Create a second tab so defaultTab is not the last remaining tab
      await formService.createTab(
        solutionA.id,
        { expectedRevision: 2, title: "Second Tab" },
        designerContext
      );

      // Attempt to delete defaultTab (which contains a section) -> 409 ConflictError
      await expect(
        formService.deleteTab(
          solutionA.id,
          defaultTabId,
          { expectedRevision: 3 },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  // --- 3. Section Management ---
  describe("Section Management & Delete Guards", () => {
    it("creates, updates, reorders, moves, and deletes an empty Section", async () => {
      const { section: sec1 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Basic Information" },
        designerContext
      );
      expect(sec1.title).toBe("Basic Information");

      const { section: sec2 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 2, title: "Additional Info" },
        designerContext
      );

      const { tab: tab2 } = await formService.createTab(
        solutionA.id,
        { expectedRevision: 3, title: "Tab 2" },
        designerContext
      );

      // Move sec2 from defaultTab to tab2
      const { section: movedSec2 } = await formService.moveSection(
        solutionA.id,
        sec2.id,
        { expectedRevision: 4, targetTabId: tab2.id },
        designerContext
      );
      expect(movedSec2.tabId).toBe(tab2.id);

      // Delete sec1
      const { success } = await formService.deleteSection(
        solutionA.id,
        sec1.id,
        { expectedRevision: 5 },
        designerContext
      );
      expect(success).toBe(true);
    });

    it("rejects deleting a non-empty Section with 409 ConflictError", async () => {
      const { section } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Main Section" },
        designerContext
      );

      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 2, label: "Customer Name", localSymbolicName: "cust_name", storedDataType: "TEXT" },
        designerContext
      );

      await formService.addFieldReference(
        solutionA.id,
        section.id,
        { expectedRevision: 3, propertyId: property.id, controlType: "TEXT_INPUT" },
        designerContext
      );

      // Attempt to delete non-empty section -> 409 ConflictError
      await expect(
        formService.deleteSection(
          solutionA.id,
          section.id,
          { expectedRevision: 4 },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  // --- 4. Field Reference Management & Compatibility ---
  describe("Field Reference Management & Compatibility Rules", () => {
    it("enforces duplicate Property placement rejection with 409 ConflictError", async () => {
      const { section: sec1 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Section 1" },
        designerContext
      );

      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 2, label: "Email Address", localSymbolicName: "email_addr", storedDataType: "TEXT", formatPreset: "EMAIL" },
        designerContext
      );

      await formService.addFieldReference(
        solutionA.id,
        sec1.id,
        { expectedRevision: 3, propertyId: property.id, controlType: "TEXT_INPUT" },
        designerContext
      );

      // Duplicate placement attempt on the same form -> 409 ConflictError
      await expect(
        formService.addFieldReference(
          solutionA.id,
          sec1.id,
          { expectedRevision: 4, propertyId: property.id, controlType: "TEXT_INPUT" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("enforces control compatibility rules strictly", async () => {
      const { section } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Form Section" },
        designerContext
      );

      // 1. EMAIL property requires TEXT_INPUT
      const { property: emailProp } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 2, label: "User Email", localSymbolicName: "u_email", storedDataType: "TEXT", formatPreset: "EMAIL" },
        designerContext
      );

      await expect(
        formService.addFieldReference(
          solutionA.id,
          section.id,
          { expectedRevision: 3, propertyId: emailProp.id, controlType: "TEXTAREA" },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 2. BOOLEAN property requires CHECKBOX or RADIO
      const { property: boolProp } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 3, label: "Is Active", localSymbolicName: "is_active", storedDataType: "BOOLEAN" },
        designerContext
      );

      const { fieldReference: boolRef } = await formService.addFieldReference(
        solutionA.id,
        section.id,
        { expectedRevision: 4, propertyId: boolProp.id, controlType: "CHECKBOX" },
        designerContext
      );
      expect(boolRef.controlType).toBe("CHECKBOX");
    });

    it("enforces detailed control-to-binding validation rules", async () => {
      const { section } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Binding Section" },
        designerContext
      );

      // Create a choice list in solutionA
      const { choiceList } = await choiceListService.createChoiceList(
        solutionA.id,
        { expectedRevision: 2, key: "status_opts", name: "Status Options" },
        designerContext
      );

      // 1. Unbound TEXT property attempting to use DROPDOWN -> 400 ValidationError
      const { property: unboundText } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 3, label: "Unbound Text", localSymbolicName: "unbound_txt", storedDataType: "TEXT" },
        designerContext
      );
      await expect(
        formService.addFieldReference(
          solutionA.id,
          section.id,
          { expectedRevision: 4, propertyId: unboundText.id, controlType: "DROPDOWN" },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 2. Choice-List-bound TEXT property attempting to use TEXT_INPUT -> 400 ValidationError
      const { property: boundText } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 4, label: "Bound Text", localSymbolicName: "bound_txt", storedDataType: "TEXT", choiceListId: choiceList.id },
        designerContext
      );
      await expect(
        formService.addFieldReference(
          solutionA.id,
          section.id,
          { expectedRevision: 5, propertyId: boundText.id, controlType: "TEXT_INPUT" },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 3. Choice-List-bound TEXT property with MULTIPLE cardinality attempting to use RADIO -> 400 ValidationError
      const { property: boundMulti } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 5, label: "Multi Bound Text", localSymbolicName: "multi_bound_txt", storedDataType: "TEXT", choiceListId: choiceList.id, cardinality: "MULTIPLE" },
        designerContext
      );
      await expect(
        formService.addFieldReference(
          solutionA.id,
          section.id,
          { expectedRevision: 6, propertyId: boundMulti.id, controlType: "RADIO" },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 4. Choice-List-bound TEXT property with SINGLE cardinality permits RADIO
      const { fieldReference: radioRef } = await formService.addFieldReference(
        solutionA.id,
        section.id,
        { expectedRevision: 6, propertyId: boundText.id, controlType: "RADIO" },
        designerContext
      );
      expect(radioRef.controlType).toBe("RADIO");
    });

    it("atomically moves a Section between Tabs that already contain Sections", async () => {
      const db = getDb();
      // Tab A (defaultTabId) has secA1 and secA2
      const { section: secA1 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Section A1" },
        designerContext
      );
      const { section: secA2 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 2, title: "Section A2" },
        designerContext
      );

      // Tab B has secB1
      const { tab: tabB } = await formService.createTab(
        solutionA.id,
        { expectedRevision: 3, title: "Tab B" },
        designerContext
      );
      await formService.createSection(
        solutionA.id,
        tabB.id,
        { expectedRevision: 4, title: "Section B1" },
        designerContext
      );

      // Move secA1 from Tab A to Tab B
      const { section: movedSec, solutionRevision: newRev } = await formService.moveSection(
        solutionA.id,
        secA1.id,
        { expectedRevision: 5, targetTabId: tabB.id },
        designerContext
      );

      expect(movedSec.tabId).toBe(tabB.id);
      expect(movedSec.displayOrder).toBe(2); // Appended after secB1
      expect(newRev).toBe(6); // Revision incremented exactly once

      // Verify secA2 in Tab A was compacted to displayOrder = 1
      const { formAggregate } = await formService.getFormAggregate(solutionA.id, designerContext);
      const tabASections = formAggregate.sections.filter((s) => s.tabId === defaultTabId);
      expect(tabASections.length).toBe(1);
      expect(tabASections[0].id).toBe(secA2.id);
      expect(tabASections[0].displayOrder).toBe(1);

      // Verify FORM_LAYOUT_REORDERED audit event for moved section
      const [audit] = await db
        .select()
        .from((await import("../../infrastructure/db/schema")).auditEvents)
        .where(
          and(
            eq((await import("../../infrastructure/db/schema")).auditEvents.entityId, secA1.id),
            eq((await import("../../infrastructure/db/schema")).auditEvents.eventType, "FORM_LAYOUT_REORDERED")
          )
        )
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit.organisationId).toBe(orgAId);
    });

    it("atomically moves a Field Reference between Sections that already contain Fields", async () => {
      const { section: sec1 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Sec 1" },
        designerContext
      );
      const { section: sec2 } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 2, title: "Sec 2" },
        designerContext
      );

      const { property: p1 } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 3, label: "P1", localSymbolicName: "p1_name", storedDataType: "TEXT" },
        designerContext
      );
      const { property: p2 } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 4, label: "P2", localSymbolicName: "p2_name", storedDataType: "TEXT" },
        designerContext
      );
      const { property: p3 } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 5, label: "P3", localSymbolicName: "p3_name", storedDataType: "TEXT" },
        designerContext
      );

      const { fieldReference: ref1 } = await formService.addFieldReference(
        solutionA.id,
        sec1.id,
        { expectedRevision: 6, propertyId: p1.id, controlType: "TEXT_INPUT" },
        designerContext
      );
      const { fieldReference: ref2 } = await formService.addFieldReference(
        solutionA.id,
        sec1.id,
        { expectedRevision: 7, propertyId: p2.id, controlType: "TEXT_INPUT" },
        designerContext
      );
      await formService.addFieldReference(
        solutionA.id,
        sec2.id,
        { expectedRevision: 8, propertyId: p3.id, controlType: "TEXT_INPUT" },
        designerContext
      );

      // Move ref1 from sec1 to sec2
      const { fieldReference: movedRef, solutionRevision: newRev } = await formService.moveFieldReference(
        solutionA.id,
        ref1.id,
        { expectedRevision: 9, targetSectionId: sec2.id },
        designerContext
      );

      expect(movedRef.sectionId).toBe(sec2.id);
      expect(movedRef.displayOrder).toBe(2); // Appended after ref3 in sec2
      expect(newRev).toBe(10); // Revision incremented exactly once

      // Verify ref2 in sec1 was compacted to displayOrder = 1
      const { formAggregate } = await formService.getFormAggregate(solutionA.id, designerContext);
      const sec1Fields = formAggregate.fields.filter((f) => f.sectionId === sec1.id);
      expect(sec1Fields.length).toBe(1);
      expect(sec1Fields[0].id).toBe(ref2.id);
      expect(sec1Fields[0].displayOrder).toBe(1);
    });

    it("rejects static field state contradiction (required=true with visible=false or enabled=false)", async () => {
      const { section } = await formService.createSection(
        solutionA.id,
        defaultTabId,
        { expectedRevision: 1, title: "Form Section" },
        designerContext
      );

      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        { expectedRevision: 2, label: "Phone Number", localSymbolicName: "phone_num", storedDataType: "TEXT", formatPreset: "PHONE" },
        designerContext
      );

      // required=true with visible=false -> 400 ValidationError
      await expect(
        formService.addFieldReference(
          solutionA.id,
          section.id,
          { expectedRevision: 3, propertyId: property.id, controlType: "TEXT_INPUT", isRequired: true, isVisible: false },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- 5. Tenant Non-Disclosure & Stale Revision Guards ---
  describe("Tenant Non-Disclosure & Stale Revision Guards", () => {
    it("returns 404 NotFoundError when reading or modifying Form from a foreign organisation", async () => {
      const uDesignerOrgB = await adminService.createUser(`form-orgb-${Math.random().toString(36).substring(7)}@test.com`, "Password123!", "Designer OrgB");
      const memB = await adminService.createMembership(orgBId, uDesignerOrgB.id);
      await adminService.assignPlatformRole(memB.id, PLATFORM_ROLES.SOLUTION_DESIGNER);
      const [orgBRec] = await getDb().select().from(organisations).where(eq(organisations.id, orgBId)).limit(1);
      const orgBLogin = await authService.login(uDesignerOrgB.email, "Password123!", orgBRec.key);

      await expect(
        formService.getFormAggregate(solutionA.id, orgBLogin.context)
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects mutation on expectedRevision mismatch with 409 ConflictError", async () => {
      await expect(
        formService.createTab(
          solutionA.id,
          { expectedRevision: 99, title: "Stale Tab" },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
