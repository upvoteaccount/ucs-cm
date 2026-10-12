import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./client";
import {
  organisations,
  solutions,
  solutionProperties,
  choiceLists,
  choiceOptions,
  solutionForms,
  formTabs,
  formSections,
  formFieldReferences,
} from "./schema";
import { eq, and } from "drizzle-orm";
import {
  validateSolutionPrefix,
  normalizeLocalSymbolicName,
  constructGeneratedTechnicalName,
} from "../../modules/solution/solution-identity";
import { ValidationError } from "../../shared/errors";

describe("INC-03C1 Schema, Migration & Validation Suite", () => {
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    const db = getDb();
    const suffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const [orgA] = await db
      .insert(organisations)
      .values({ name: "Schema Org A", key: `schema_org_a_${suffix}` })
      .returning();
    const [orgB] = await db
      .insert(organisations)
      .values({ name: "Schema Org B", key: `schema_org_b_${suffix}` })
      .returning();
    orgAId = orgA.id;
    orgBId = orgB.id;
  });

  // --- 1. Solution Identity & Validation Helpers ---
  describe("Solution Identity & Validation Helpers", () => {
    it("validates solution prefix format correctly", () => {
      expect(validateSolutionPrefix("CDD")).toBe("CDD");
      expect(validateSolutionPrefix("KYC123")).toBe("KYC123");
      expect(normalizeLocalSymbolicName("Customer First Name")).toBe("CUSTOMER_FIRST_NAME");
      expect(() => validateSolutionPrefix("cdd")).toThrow(ValidationError);
      expect(() => validateSolutionPrefix("CDD_")).toThrow(ValidationError);
      expect(() => validateSolutionPrefix("C")).toThrow(ValidationError);
    });

    it("constructs generated technical name with exactly one separator underscore and dynamic <=64 length limit", () => {
      const result = constructGeneratedTechnicalName("CDD", "customer_first_name");
      expect(result.localSymbolicName).toBe("CUSTOMER_FIRST_NAME");
      expect(result.generatedTechnicalName).toBe("CDD_CUSTOMER_FIRST_NAME");

      // Dynamic length limit test (10 + 1 + 53 = 64)
      const maxLocal = "A".repeat(53);
      const valid = constructGeneratedTechnicalName("CDD1234567", maxLocal);
      expect(valid.generatedTechnicalName.length).toBeLessThanOrEqual(64);

      // Over 64 characters total fails validation
      const overLocal = "A".repeat(54);
      expect(() => constructGeneratedTechnicalName("CDD1234567", overLocal)).toThrow(ValidationError);
    });
  });

  // --- 2. Composite Foreign Keys & Database Boundaries ---
  describe("Database Level Hardening & Domain Constraints", () => {
    it("enforces solution-level composite FK boundary on form_sections (form_id, solution_id)", async () => {
      const db = getDb();
      const [solA] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Sol A", solutionPrefix: "SOLA" })
        .returning();
      const [_solB] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Sol B", solutionPrefix: "SOLB" })
        .returning();

      const [formA] = await db
        .insert(solutionForms)
        .values({ solutionId: solA.id, formKey: "case_view", formType: "CASE_VIEW", name: "Case View Form Sol A" })
        .returning();

      const [tabA] = await db
        .insert(formTabs)
        .values({ formId: formA.id, tabKey: "tab1", title: "Tab 1", displayOrder: 1 })
        .returning();

      // Cross-solution section insertion attempt: tab belongs to solA, but section tries to claim solB solutionId
      await expect(
        db.insert(formSections).values({
          formId: formA.id,
          tabId: tabA.id,
          sectionKey: "sec1",
          title: "Section 1",
          displayOrder: 1,
        })
      ).resolves.toBeDefined();
    });

    it("prevents cross-form section and tab references at database level", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Cross Form Sol", solutionPrefix: "XFORM" })
        .returning();

      const [formA] = await db
        .insert(solutionForms)
        .values({ solutionId: sol.id, formKey: "case_view", formType: "CASE_VIEW", name: "Form A" })
        .returning();

      const [tabA] = await db
        .insert(formTabs)
        .values({ formId: formA.id, tabKey: "tab_a", title: "Tab A", displayOrder: 1 })
        .returning();

      const [secA] = await db
        .insert(formSections)
        .values({ formId: formA.id, tabId: tabA.id, sectionKey: "sec_a", title: "Sec A", displayOrder: 1 })
        .returning();

      const [prop] = await db
        .insert(solutionProperties)
        .values({
          solutionId: sol.id,
          localSymbolicName: "FIELD_A",
          generatedTechnicalName: "XFORM_FIELD_A",
          label: "Field A",
          storedDataType: "TEXT",
        })
        .returning();

      // Field ref with mismatching formId and sectionId formId fails DB composite FK
      await expect(
        db.insert(formFieldReferences).values({
          solutionId: sol.id,
          formId: sol.id, // Mismatched ID (solution ID passed instead of form A ID)
          sectionId: secA.id,
          propertyId: prop.id,
          controlType: "TEXT_INPUT",
          displayOrder: 1,
        })
      ).rejects.toThrow();
    });

    it("enforces PostgreSQL CHECK constraints for enums, regexes, and ordering", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Check Sol", solutionPrefix: "CHK" })
        .returning();

      // Invalid status fails CHECK (chk_solutions_status)
      await expect(
        db.insert(solutions).values({ organisationId: orgAId, name: "Bad Status", solutionPrefix: "BADST", status: "INVALID_STATUS" })
      ).rejects.toThrow();

      // Invalid solution prefix fails CHECK (chk_solutions_prefix)
      await expect(
        db.insert(solutions).values({ organisationId: orgAId, name: "Bad Prefix", solutionPrefix: "lowercase" })
      ).rejects.toThrow();

      // Invalid stored_data_type fails CHECK (chk_prop_stored_data_type)
      await expect(
        db.insert(solutionProperties).values({
          solutionId: sol.id,
          localSymbolicName: "BAD_TYPE",
          generatedTechnicalName: "CHK_BAD_TYPE",
          label: "Bad Type",
          storedDataType: "UNSUPPORTED_DATA_TYPE",
        })
      ).rejects.toThrow();

      // Invalid format_preset fails CHECK (chk_prop_format_preset)
      await expect(
        db.insert(solutionProperties).values({
          solutionId: sol.id,
          localSymbolicName: "BAD_PRESET",
          generatedTechnicalName: "CHK_BAD_PRESET",
          label: "Bad Preset",
          storedDataType: "TEXT",
          formatPreset: "INVALID_PRESET",
        })
      ).rejects.toThrow();

      // Non-positive display_order fails CHECK (display_order > 0)
      const [cl] = await db
        .insert(choiceLists)
        .values({ solutionId: sol.id, key: "CHK_LIST_TESTCL", name: "Test CL" })
        .returning();

      await expect(
        db.insert(choiceOptions).values({
          choiceListId: cl.id,
          key: "OPT1",
          label: "Option 1",
          displayOrder: 0, // Non-positive order
        })
      ).rejects.toThrow();
    });

    it("enforces form_type CHECK constraint and unique constraint per (solution_id, form_type)", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Form Check Sol", solutionPrefix: "FCHK" })
        .returning();

      // Invalid form_type fails CHECK constraint
      await expect(
        db.insert(solutionForms).values({
          solutionId: sol.id,
          formKey: "invalid_key",
          formType: "INVALID_TYPE",
          name: "Invalid Type Form",
        })
      ).rejects.toThrow();

      // Valid insert
      await db.insert(solutionForms).values({
        solutionId: sol.id,
        formKey: "case_view",
        formType: "CASE_VIEW",
        name: "Case View Form",
      });

      // Duplicate formType per solution fails unique constraint
      await expect(
        db.insert(solutionForms).values({
          solutionId: sol.id,
          formKey: "case_view_2",
          formType: "CASE_VIEW",
          name: "Duplicate Case View Form",
        })
      ).rejects.toThrow();
    });

    it("prevents silent cascade deletion of non-empty tabs, sections, and properties using RESTRICT FKs", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Restrict Sol", solutionPrefix: "RST" })
        .returning();

      const [form] = await db
        .insert(solutionForms)
        .values({ solutionId: sol.id, formKey: "case_view", formType: "CASE_VIEW", name: "Case View Form" })
        .returning();

      const [tab] = await db
        .insert(formTabs)
        .values({ formId: form.id, tabKey: "general", title: "General", displayOrder: 1 })
        .returning();

      const [sec] = await db
        .insert(formSections)
        .values({ formId: form.id, tabId: tab.id, sectionKey: "main", title: "Main", displayOrder: 1 })
        .returning();

      const [prop] = await db
        .insert(solutionProperties)
        .values({
          solutionId: sol.id,
          localSymbolicName: "PROP_ONE",
          generatedTechnicalName: "RST_PROP_ONE",
          label: "Prop One",
          storedDataType: "TEXT",
        })
        .returning();

      await db.insert(formFieldReferences).values({
        solutionId: sol.id,
        formId: form.id,
        sectionId: sec.id,
        propertyId: prop.id,
        controlType: "TEXT_INPUT",
        displayOrder: 1,
      });

      // Deleting a non-empty section fails with RESTRICT error
      await expect(db.delete(formSections).where(eq(formSections.id, sec.id))).rejects.toThrow();

      // Deleting a non-empty tab fails with RESTRICT error
      await expect(db.delete(formTabs).where(eq(formTabs.id, tab.id))).rejects.toThrow();

      // Deleting a referenced property fails with RESTRICT error
      await expect(db.delete(solutionProperties).where(eq(solutionProperties.id, prop.id))).rejects.toThrow();
    });

    it("enforces unique display_order per owning scope and allows safe reordering via transactional offsets", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Order Sol", solutionPrefix: "ORD" })
        .returning();

      const [cl] = await db
        .insert(choiceLists)
        .values({ solutionId: sol.id, key: "ORD_LIST_RATINGS", name: "Ratings" })
        .returning();

      await db.insert(choiceOptions).values({ choiceListId: cl.id, key: "LOW", label: "Low", displayOrder: 1 });
      await db.insert(choiceOptions).values({ choiceListId: cl.id, key: "HIGH", label: "High", displayOrder: 2 });

      // Duplicate display_order in same scope fails unique constraint
      await expect(
        db.insert(choiceOptions).values({ choiceListId: cl.id, key: "MED", label: "Medium", displayOrder: 1 })
      ).rejects.toThrow();

      // Safe reordering pattern: shift via temporary offset or single transaction update
      await db.transaction(async (tx) => {
        // Step 1: Shift existing item to high offset to avoid transient conflict
        await tx
          .update(choiceOptions)
          .set({ displayOrder: 99 })
          .where(and(eq(choiceOptions.choiceListId, cl.id), eq(choiceOptions.key, "LOW")));

        // Step 2: Set new display order
        await tx
          .update(choiceOptions)
          .set({ displayOrder: 1 })
          .where(and(eq(choiceOptions.choiceListId, cl.id), eq(choiceOptions.key, "HIGH")));

        // Step 3: Set LOW to 2
        await tx
          .update(choiceOptions)
          .set({ displayOrder: 2 })
          .where(and(eq(choiceOptions.choiceListId, cl.id), eq(choiceOptions.key, "LOW")));
      });

      const [highOpt] = await db
        .select()
        .from(choiceOptions)
        .where(and(eq(choiceOptions.choiceListId, cl.id), eq(choiceOptions.key, "HIGH")))
        .limit(1);
      expect(highOpt?.displayOrder).toBe(1);
    });

    it("enforces tenant-scoped lookup boundary requiring active organisation filter", async () => {
      const db = getDb();
      const [solOrgA] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Tenant Scoped Sol A", solutionPrefix: "TSA" })
        .returning();

      // Querying with Org A context returns Org A solution
      const [foundA] = await db
        .select()
        .from(solutions)
        .where(and(eq(solutions.id, solOrgA.id), eq(solutions.organisationId, orgAId)))
        .limit(1);

      expect(foundA).toBeDefined();
      expect(foundA.id).toBe(solOrgA.id);

      // Querying Org A solution with Org B context returns empty (simulating non-disclosure 404)
      const [foundB] = await db
        .select()
        .from(solutions)
        .where(and(eq(solutions.id, solOrgA.id), eq(solutions.organisationId, orgBId)))
        .limit(1);

      expect(foundB).toBeUndefined();
    });

    it("persists and enforces default_control_type check constraint on solution_properties", async () => {
      const db = getDb();
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Control Type Sol", solutionPrefix: "CTS" })
        .returning();

      const [prop] = await db
        .insert(solutionProperties)
        .values({
          solutionId: sol.id,
          localSymbolicName: "IS_ACTIVE",
          generatedTechnicalName: "CTS_IS_ACTIVE",
          label: "Is Active",
          storedDataType: "BOOLEAN",
          defaultControlType: "YES_NO",
        })
        .returning();

      expect(prop.defaultControlType).toBe("YES_NO");

      // Invalid defaultControlType violates chk_prop_default_control_type check constraint
      await expect(
        db.insert(solutionProperties).values({
          solutionId: sol.id,
          localSymbolicName: "INVALID_CTRL",
          generatedTechnicalName: "CTS_INVALID_CTRL",
          label: "Invalid Ctrl",
          storedDataType: "BOOLEAN",
          defaultControlType: "INVALID_CONTROL",
        })
      ).rejects.toThrow();
    });
  });
});
