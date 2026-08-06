import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./client";
import {
  organisations,
  solutions,
  choiceLists,
  choiceOptions,
  solutionProperties,
  solutionForms,
  formTabs,
  formSections,
  formFieldReferences,
} from "./schema";
import { eq, and } from "drizzle-orm";
import {
  suggestSolutionPrefix,
  validateSolutionPrefix,
  normalizeLocalSymbolicName,
  constructGeneratedTechnicalName,
} from "../../modules/solution/solution-identity";
import { ValidationError } from "../../shared/errors";

describe("INC-03C1 Schema, Migration & Validation Suite", () => {
  let db: ReturnType<typeof getDb>;
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    db = getDb();

    // Create seed organisations for testing schema isolation & constraints
    const [orgA] = await db
      .insert(organisations)
      .values({
        name: "INC03 Test Org A",
        key: `inc03_org_a_${Date.now()}`,
      })
      .returning();

    const [orgB] = await db
      .insert(organisations)
      .values({
        name: "INC03 Test Org B",
        key: `inc03_org_b_${Date.now()}`,
      })
      .returning();

    orgAId = orgA.id;
    orgBId = orgB.id;
  });

  describe("Solution Identity & Validation Helpers", () => {
    it("suggests uppercase prefix using meaningful word initials", () => {
      expect(suggestSolutionPrefix("Customer Due Diligence")).toBe("CDD");
      expect(suggestSolutionPrefix("Patient Grievance Management")).toBe("PGM");
      expect(suggestSolutionPrefix("KYC Exception")).toBe("KE");
      expect(suggestSolutionPrefix("Singleword")).toBe("SINGLE");
    });

    it("validates solution prefix format correctly", () => {
      expect(validateSolutionPrefix("CDD")).toBe("CDD");
      expect(validateSolutionPrefix("KYC123")).toBe("KYC123");
      expect(normalizeLocalSymbolicName("Customer First Name")).toBe("customer_first_name");
      expect(() => validateSolutionPrefix("cdd")).toThrow(ValidationError);
      expect(() => validateSolutionPrefix("CDD_")).toThrow(ValidationError);
      expect(() => validateSolutionPrefix("C")).toThrow(ValidationError);
    });

    it("constructs generated technical name with exactly one separator underscore and dynamic <=64 length limit", () => {
      const result = constructGeneratedTechnicalName("CDD", "customer_first_name");
      expect(result.localSymbolicName).toBe("customer_first_name");
      expect(result.generatedTechnicalName).toBe("CDD_customer_first_name");

      // Dynamic length limit test (10 + 1 + 53 = 64)
      const maxLocal = "a".repeat(53);
      const maxResult = constructGeneratedTechnicalName("TENCHARPFX", maxLocal);
      expect(maxResult.generatedTechnicalName.length).toBe(64);

      // Exceeding 64 total characters throws ValidationError
      const tooLongLocal = "a".repeat(54);
      expect(() => constructGeneratedTechnicalName("TENCHARPFX", tooLongLocal)).toThrow(ValidationError);
    });
  });

  describe("Database Level Hardening & Domain Constraints", () => {
    it("prevents cross-solution Choice List reference at database level", async () => {
      const [sol1] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Solution One", solutionPrefix: "SOLONE" })
        .returning();

      const [sol2] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Solution Two", solutionPrefix: "SOLTWO" })
        .returning();

      const [clSol1] = await db
        .insert(choiceLists)
        .values({ solutionId: sol1.id, key: "RiskLevels", name: "Risk Levels" })
        .returning();

      // Sol2 property attempting to reference Sol1's Choice List fails via composite FK
      await expect(
        db.insert(solutionProperties).values({
          solutionId: sol2.id,
          localSymbolicName: "risk_rating",
          generatedTechnicalName: "SOLTWO_risk_rating",
          label: "Risk Rating",
          storedDataType: "TEXT",
          choiceListId: clSol1.id,
        })
      ).rejects.toThrow();
    });

    it("prevents cross-solution Property placement on form field reference at database level", async () => {
      const [sol1] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Cross Sol Property Sol 1", solutionPrefix: "CSOLONE" })
        .returning();

      const [sol2] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Cross Sol Property Sol 2", solutionPrefix: "CSOLTWO" })
        .returning();

      // Property belongs to Solution 1
      const [propSol1] = await db
        .insert(solutionProperties)
        .values({
          solutionId: sol1.id,
          localSymbolicName: "prop_sol1",
          generatedTechnicalName: "CSOLONE_prop_sol1",
          label: "Prop Sol 1",
          storedDataType: "TEXT",
        })
        .returning();

      // Form belongs to Solution 2
      const [formSol2] = await db
        .insert(solutionForms)
        .values({ solutionId: sol2.id, formKey: "initial_form", name: "Initial Form Sol 2" })
        .returning();

      const [tabSol2] = await db
        .insert(formTabs)
        .values({ formId: formSol2.id, tabKey: "tab_sol2", title: "Tab Sol 2", displayOrder: 1 })
        .returning();

      const [secSol2] = await db
        .insert(formSections)
        .values({ formId: formSol2.id, tabId: tabSol2.id, sectionKey: "sec_sol2", title: "Sec Sol 2", displayOrder: 1 })
        .returning();

      // Attempting to place Sol1's property into Sol2's form field reference fails composite FK fk_field_refs_prop_same_sol
      await expect(
        db.insert(formFieldReferences).values({
          solutionId: sol2.id, // Form's solution ID passed
          formId: formSol2.id,
          sectionId: secSol2.id,
          propertyId: propSol1.id, // Property from Solution 1
          controlType: "TEXT_INPUT",
          displayOrder: 1,
        })
      ).rejects.toThrow();
    });

    it("prevents cross-form section and tab references at database level", async () => {
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Cross Form Sol", solutionPrefix: "XFORM" })
        .returning();

      const [formA] = await db
        .insert(solutionForms)
        .values({ solutionId: sol.id, formKey: "initial_form", name: "Initial Form" })
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
          localSymbolicName: "field_a",
          generatedTechnicalName: "XFORM_field_a",
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
          localSymbolicName: "bad_type",
          generatedTechnicalName: "CHK_bad_type",
          label: "Bad Type",
          storedDataType: "UNSUPPORTED_DATA_TYPE",
        })
      ).rejects.toThrow();

      // Invalid format_preset fails CHECK (chk_prop_format_preset)
      await expect(
        db.insert(solutionProperties).values({
          solutionId: sol.id,
          localSymbolicName: "bad_preset",
          generatedTechnicalName: "CHK_bad_preset",
          label: "Bad Preset",
          storedDataType: "TEXT",
          formatPreset: "INVALID_PRESET",
        })
      ).rejects.toThrow();

      // Non-positive display_order fails CHECK (display_order > 0)
      const [cl] = await db
        .insert(choiceLists)
        .values({ solutionId: sol.id, key: "TestCL", name: "Test CL" })
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

    it("enforces exactly 1 initial_form per solution via CHECK constraint for INC-03", async () => {
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Form Check Sol", solutionPrefix: "FCHK" })
        .returning();

      // Custom form_key other than 'initial_form' fails CHECK constraint for INC-03
      await expect(
        db.insert(solutionForms).values({
          solutionId: sol.id,
          formKey: "custom_second_form",
          name: "Second Form",
        })
      ).rejects.toThrow();
    });

    it("prevents silent cascade deletion of non-empty tabs, sections, and properties using RESTRICT FKs", async () => {
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Restrict Sol", solutionPrefix: "RST" })
        .returning();

      const [form] = await db
        .insert(solutionForms)
        .values({ solutionId: sol.id, formKey: "initial_form", name: "Initial Form" })
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
          localSymbolicName: "prop_one",
          generatedTechnicalName: "RST_prop_one",
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
      const [sol] = await db
        .insert(solutions)
        .values({ organisationId: orgAId, name: "Order Sol", solutionPrefix: "ORD" })
        .returning();

      const [cl] = await db
        .insert(choiceLists)
        .values({ solutionId: sol.id, key: "Ratings", name: "Ratings" })
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
  });
});
