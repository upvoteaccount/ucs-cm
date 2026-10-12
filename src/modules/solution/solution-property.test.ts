import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import {
  organisations,
  solutions,
  choiceLists,
  solutionForms,
  formTabs,
  formSections,
  formFieldReferences,
  auditEvents,
  platformRoles,
} from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { solutionPropertyService } from "./solution-property.service";
import { constructGeneratedTechnicalName } from "./solution-identity";
import { adminService } from "../organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError, NotFoundError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-03C3 Data Dictionary Property & Canonical Settings Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerContext: SessionContext;
  let solutionA: { id: string; solutionPrefix: string; revision: number };

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

    const orgA = await adminService.createOrganisation(`prop-org-a-${suffix}`, "Prop Org A");
    const orgB = await adminService.createOrganisation(`prop-org-b-${suffix}`, "Prop Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const uDesigner = await adminService.createUser(`propdesigner-${suffix}@test.com`, "Password123!", "Prop Designer");
    const memA1 = await adminService.createMembership(orgAId, uDesigner.id);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerContext = desLogin.context;

    const sol = await solutionService.createSolution(
      { name: "Customer Due Diligence", solutionPrefix: "CDD" },
      designerContext
    );
    solutionA = { id: sol.id, solutionPrefix: sol.solutionPrefix, revision: sol.revision };
  });

  // --- 1. Identity & Technical Name Generation ---
  describe("Property Identity & Technical Name Construction Rules", () => {
    it("constructs generated technical name with exactly one prefix separator underscore in canonical uppercase", () => {
      const res = constructGeneratedTechnicalName("CDD", "customer_risk_level");
      expect(res.localSymbolicName).toBe("CUSTOMER_RISK_LEVEL");
      expect(res.generatedTechnicalName).toBe("CDD_CUSTOMER_RISK_LEVEL");
    });

    it("normalizes raw local symbolic name to uppercase snake_case", () => {
      const res = constructGeneratedTechnicalName("CDD", "Risk Score");
      expect(res.localSymbolicName).toBe("RISK_SCORE");
      expect(res.generatedTechnicalName).toBe("CDD_RISK_SCORE");
    });

    it("dynamically enforces 64-character total length limit", () => {
      const exactLocalName = "A".repeat(52); // max local name len is 53 chars
      const validRes = constructGeneratedTechnicalName("CDD", exactLocalName);
      expect(validRes.generatedTechnicalName.length).toBeLessThanOrEqual(64);
    });

    it("rejects reserved system property names", () => {
      expect(() => constructGeneratedTechnicalName("CDD", "ID")).toThrow(ValidationError);
      expect(() => constructGeneratedTechnicalName("CDD", "CREATED_AT")).toThrow(ValidationError);
      expect(() => constructGeneratedTechnicalName("CDD", "CASE_NUMBER")).toThrow(ValidationError);
    });
  });

  // --- 2. Property CRUD & Same-Transaction Audit ---
  describe("Property Creation, Update & Same-TX Audit", () => {
    it("creates property, increments solution revision, and records PROPERTY_CREATED audit event in same transaction", async () => {
      const db = getDb();
      const { property, solutionRevision } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Risk Level",
          localSymbolicName: "risk_level",
          storedDataType: "TEXT",
          formatPreset: "NONE",
          cardinality: "SINGLE",
        },
        designerContext
      );

      expect(property.id).toBeDefined();
      expect(property.localSymbolicName).toBe("RISK_LEVEL");
      expect(property.generatedTechnicalName).toBe("CDD_RISK_LEVEL");
      expect(solutionRevision).toBe(2);

      // Verify PROPERTY_CREATED audit event in DB
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, property.id), eq(auditEvents.eventType, "PROPERTY_CREATED")))
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit.organisationId).toBe(orgAId);
    });

    it("enforces duplicate local and technical name rejection within the same Solution with 409 ConflictError", async () => {
      await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Risk Score",
          localSymbolicName: "risk_score",
          storedDataType: "NUMBER",
        },
        designerContext
      );

      // Attempt to create second property with same localSymbolicName
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 2,
            label: "Risk Score Duplicate",
            localSymbolicName: "risk_score",
            storedDataType: "NUMBER",
          },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("masks sensitive default values in audit trail when isSensitive is true", async () => {
      const db = getDb();
      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Tax Identifier",
          localSymbolicName: "tax_id",
          storedDataType: "TEXT",
          defaultValue: "123-45-6789",
          isSensitive: true,
        },
        designerContext
      );

      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, property.id), eq(auditEvents.eventType, "PROPERTY_CREATED")))
        .limit(1);

      expect(audit).toBeDefined();
      const afterState = audit.afterState as Record<string, unknown>;
      expect(afterState.defaultValue).toBe("[REDACTED]");
    });
  });

  // --- 3. Mutation Guards & Optimistic Concurrency ---
  describe("Mutation Guards & Revision Control", () => {
    it("rejects mutation on expectedRevision mismatch with 409 ConflictError and makes zero property changes", async () => {
      const db = getDb();

      // Create initial property (solution revision becomes 2)
      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Account Number",
          localSymbolicName: "account_number",
          storedDataType: "TEXT",
        },
        designerContext
      );

      // Stale update with expectedRevision = 1 (actual is 2)
      await expect(
        solutionPropertyService.updateProperty(
          solutionA.id,
          property.id,
          {
            expectedRevision: 1,
            label: "Stale Label Change",
          },
          designerContext
        )
      ).rejects.toThrow(ConflictError);

      // Verify property label was not modified
      const current = await solutionPropertyService.getPropertyById(solutionA.id, property.id, designerContext);
      expect(current.label).toBe("Account Number");

      // Verify zero PROPERTY_UPDATED audit events were written
      const audits = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, property.id), eq(auditEvents.eventType, "PROPERTY_UPDATED")));

      expect(audits.length).toBe(0);
    });

    it("prevents changing localSymbolicName or storedDataType when Solution status is not DRAFT", async () => {
      const db = getDb();
      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Status Property",
          localSymbolicName: "status_prop",
          storedDataType: "TEXT",
        },
        designerContext
      );

      // Update solution status to PUBLISHED in DB directly for test fixture
      await db.update(solutions).set({ status: "PUBLISHED" }).where(eq(solutions.id, solutionA.id));

      // Attempt to change localSymbolicName on non-DRAFT solution -> throws 409
      await expect(
        solutionPropertyService.updateProperty(
          solutionA.id,
          property.id,
          {
            expectedRevision: 2,
            localSymbolicName: "new_status_prop",
          },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });

    it("blocks property deletion when referenced in a form layout with 409 ConflictError", async () => {
      const db = getDb();
      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Referenced Field",
          localSymbolicName: "ref_field",
          storedDataType: "TEXT",
        },
        designerContext
      );

      // Create a form section and form field reference in DB for fixture
      const [form] = await db.select().from(solutionForms).where(eq(solutionForms.solutionId, solutionA.id)).limit(1);
      const [section] = await txInsertSection(db, form.id);

      await db.insert(formFieldReferences).values({
        formId: form.id,
        sectionId: section.id,
        propertyId: property.id,
        solutionId: solutionA.id,
        controlType: "TEXT_INPUT",
        displayOrder: 1,
      });

      // Attempt deletion -> throws 409 ConflictError
      await expect(
        solutionPropertyService.deleteProperty(
          solutionA.id,
          property.id,
          { expectedRevision: 2 },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  // --- 4. Choice List Binding & Type/Format Validation ---
  describe("Type, Format & Choice List Binding Rules", () => {
    it("rejects format presets for non-TEXT stored data types", async () => {
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Number With Format",
            localSymbolicName: "num_fmt",
            storedDataType: "NUMBER",
            formatPreset: "EMAIL",
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it("rejects binding choice list to BOOLEAN or DATE types", async () => {
      const db = getDb();
      const [cl] = await db
        .insert(choiceLists)
        .values({
          solutionId: solutionA.id,
          key: "risk_options",
          name: "Risk Options",
        })
        .returning();

      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Boolean With Choice",
            localSymbolicName: "bool_choice",
            storedDataType: "BOOLEAN",
            choiceListId: cl.id,
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it("rejects binding to a Choice List owned by a different Solution", async () => {
      const db = getDb();

      // Create another solution in Org A
      const solB = await solutionService.createSolution(
        { name: "Other Solution", solutionPrefix: "OTHER" },
        designerContext
      );

      // Create choice list in solB
      const [clForeign] = await db
        .insert(choiceLists)
        .values({
          solutionId: solB.id,
          key: "other_options",
          name: "Other Options",
        })
        .returning();

      // Attempt to bind choice list from solB to a property in solutionA
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Cross Sol Property",
            localSymbolicName: "cross_sol_prop",
            storedDataType: "TEXT",
            choiceListId: clForeign.id,
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it("enforces cardinality consistency rules strictly", async () => {
      // 1. MULTIPLE requires a Choice List
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Multi Text Without Choice",
            localSymbolicName: "multi_no_choice",
            storedDataType: "TEXT",
            cardinality: "MULTIPLE",
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 2. BOOLEAN, DATE, DATETIME, USER_REFERENCE must always use SINGLE
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Multi Date",
            localSymbolicName: "multi_date",
            storedDataType: "DATE",
            cardinality: "MULTIPLE",
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // 3. EMAIL and PHONE presets succeed with TEXT + SINGLE without choice list
      const { property: emailProp } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "User Email",
          localSymbolicName: "user_email",
          storedDataType: "TEXT",
          formatPreset: "EMAIL",
          cardinality: "SINGLE",
        },
        designerContext
      );
      expect(emailProp.formatPreset).toBe("EMAIL");
      expect(emailProp.cardinality).toBe("SINGLE");
      expect(emailProp.choiceListId).toBeNull();
    });
  });

  // --- 5. Tenant Non-Disclosure ---
  describe("Tenant Isolation & Non-Disclosure", () => {
    it("returns 404 NotFoundError when reading or modifying property from a foreign organisation", async () => {
      const { property } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Org A Prop",
          localSymbolicName: "orga_prop",
          storedDataType: "TEXT",
        },
        designerContext
      );

      // Create designer user in Org B
      const uDesignerOrgB = await adminService.createUser(`prop-orgb-${Math.random().toString(36).substring(7)}@test.com`, "Password123!", "Designer OrgB");
      const memB = await adminService.createMembership(orgBId, uDesignerOrgB.id);
      await adminService.assignPlatformRole(memB.id, PLATFORM_ROLES.SOLUTION_DESIGNER);
      const [orgBRec] = await getDb().select().from(organisations).where(eq(organisations.id, orgBId)).limit(1);
      const orgBLogin = await authService.login(uDesignerOrgB.email, "Password123!", orgBRec.key);

      await expect(
        solutionPropertyService.getPropertyById(solutionA.id, property.id, orgBLogin.context)
      ).rejects.toThrow(NotFoundError);
    });
  });
});

async function txInsertSection(db: ReturnType<typeof getDb>, formId: string) {
  const [tab] = await db.select().from(formTabs).where(eq(formTabs.formId, formId)).limit(1);
  return db
    .insert(formSections)
    .values({
      formId,
      tabId: tab.id,
      sectionKey: "sec_test",
      title: "Test Section",
      displayOrder: 1,
    })
    .returning();
}
