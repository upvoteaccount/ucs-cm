import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../../infrastructure/db/client";
import { auditEvents, platformRoles } from "../../infrastructure/db/schema";
import { solutionService } from "./solution.service";
import { solutionPropertyService } from "./solution-property.service";
import {
  getPublicRegexPresets,
  getRegexPresetByKey,
  validateCustomRegex,
  canonicalizeValidationRules,
  evaluateValidation,
} from "./index";
import { adminService } from "../organisation";
import { PLATFORM_ROLES, SessionContext } from "../auth";
import { ValidationError, ConflictError } from "../../shared/errors";
import { eq, and } from "drizzle-orm";

describe("INC-03C6 Property Validation Rules & Safety Test Suite", () => {
  let orgAId: string;
  let orgAKey: string;
  let designerUserId: string;
  let designerEmail: string;
  let designerContext: SessionContext;
  let solutionA: any;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime" },
    ]).onConflictDoNothing();

    const ts = Date.now();
    const orgA = await adminService.createOrganisation(`c6_val_a_${ts}`, "C6 Org A");
    await adminService.createOrganisation(`c6_val_b_${ts}`, "C6 Org B");
    orgAId = orgA.id;
    orgAKey = orgA.key;

    designerEmail = `c6_designer_${ts}@example.com`;
    const user = await adminService.createUser(
      designerEmail,
      "Password123!",
      "C6 Designer"
    );
    designerUserId = user.id;

    const memA = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    designerContext = {
      user: { id: designerUserId, email: designerEmail, fullName: "C6 Designer" },
      activeOrganisation: { id: orgAId, name: "C6 Org A", key: orgAKey },
      membership: { id: memA.id, roles: [PLATFORM_ROLES.SOLUTION_DESIGNER] },
    };
  });

  let solutionCounter = 100;

  beforeEach(async () => {
    solutionCounter++;
    const prefix = `PV${solutionCounter}`;
    solutionA = await solutionService.createSolution(
      { solutionPrefix: prefix, name: "C6 Validation Solution" },
      designerContext
    );
  });

  // --- 1. Preset Catalogue & Public Exposure ---
  describe("Regex Preset Catalogue", () => {
    it("returns stable preset catalogue containing all 6 approved keys and excluding server-owned patterns", () => {
      const publicPresets = getPublicRegexPresets();
      expect(publicPresets.length).toBe(6);
      const keys = publicPresets.map((p) => p.key);
      expect(keys).toEqual([
        "LETTERS_ONLY",
        "ALPHANUMERIC",
        "ALPHANUMERIC_SPACES",
        "NO_SPECIAL_CHARACTERS",
        "INDIAN_MOBILE",
        "EMAIL_BASIC",
      ]);
      for (const preset of publicPresets) {
        expect(preset.key).toBeDefined();
        expect(preset.label).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.compatibleStoredTypes).toContain("TEXT");
        // Ensure pattern is NOT exposed in public metadata
        expect((preset as any).pattern).toBeUndefined();
      }
    });

    it("retrieves internal preset pattern cleanly by key", () => {
      const letters = getRegexPresetByKey("LETTERS_ONLY");
      expect(letters).not.toBeNull();
      expect(letters?.pattern).toBe("^[A-Za-z]+$");
      expect(getRegexPresetByKey("UNKNOWN_KEY")).toBeNull();
    });
  });

  // --- 2. Custom Regex Safety Engine ---
  describe("Custom Regex Safety Engine", () => {
    it("accepts valid custom regex patterns and allowed flags ('', 'i', 'm', 'im')", () => {
      expect(() => validateCustomRegex("^[A-Z0-9]+$", "i")).not.toThrow();
      expect(() => validateCustomRegex("^[a-z]+$", "m")).not.toThrow();
      expect(() => validateCustomRegex("^[a-z]+$", "im")).not.toThrow();
      expect(() => validateCustomRegex("^[a-z]+$", "")).not.toThrow();
    });

    it("rejects invalid or forbidden flags ('g', 'y', 's', 'u', 'v', duplicates)", () => {
      expect(() => validateCustomRegex("^[A-Z]+$", "g")).toThrow(ValidationError);
      expect(() => validateCustomRegex("^[A-Z]+$", "u")).toThrow(ValidationError);
      expect(() => validateCustomRegex("^[A-Z]+$", "ii")).toThrow(ValidationError);
    });

    it("rejects patterns exceeding maximum length limit of 256 characters", () => {
      const longPattern = "^" + "a".repeat(256) + "$";
      expect(() => validateCustomRegex(longPattern, "")).toThrow(ValidationError);
    });

    it("rejects control characters and null bytes", () => {
      expect(() => validateCustomRegex("^[a-z]\x00[0-9]+$", "")).toThrow(ValidationError);
      expect(() => validateCustomRegex("^[a-z]\x07[0-9]+$", "")).toThrow(ValidationError);
    });

    it("rejects unsupported constructs (lookbehinds and backreferences)", () => {
      expect(() => validateCustomRegex("(?<=foo)bar", "")).toThrow(ValidationError);
      expect(() => validateCustomRegex("(?<!foo)bar", "")).toThrow(ValidationError);
      expect(() => validateCustomRegex("(a)\\1", "")).toThrow(ValidationError);
    });

    it("rejects syntactically invalid regex patterns", () => {
      expect(() => validateCustomRegex("^[a-z++", "")).toThrow(ValidationError);
    });

    it("rejects unsafe regex patterns susceptible to catastrophic backtracking via safe-regex", () => {
      // (a+)+ is a classic ReDoS catastrophic backtracking pattern
      expect(() => validateCustomRegex("(a+)+$", "")).toThrow(ValidationError);
      expect(() => validateCustomRegex("(a*)*$", "")).toThrow(ValidationError);
    });
  });

  // --- 3. Canonicalisation & Rule Compatibility ---
  describe("Canonicalisation & Boundary Rules", () => {
    it("returns null for empty or absent validation rules", () => {
      expect(canonicalizeValidationRules("TEXT", "NONE", undefined)).toBeNull();
      expect(canonicalizeValidationRules("TEXT", "NONE", null)).toBeNull();
      expect(canonicalizeValidationRules("TEXT", "NONE", {})).toBeNull();
    });

    it("rejects unknown rule keys, required/isRequired, or client-supplied compiled regex", () => {
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { invalidKey: 123 })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { required: true })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { isRequired: true })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { compiledRegex: ".*" })).toThrow(ValidationError);
    });

    it("enforces preset/custom regex mutual exclusion", () => {
      expect(() =>
        canonicalizeValidationRules("TEXT", "NONE", {
          regexPreset: "LETTERS_ONLY",
          customRegex: { pattern: "^[A-Z]+$" },
        })
      ).toThrow(ValidationError);
    });

    it("enforces TEXT-only regex and length rules", () => {
      expect(() => canonicalizeValidationRules("NUMBER", "NONE", { minLength: 1 })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("NUMBER", "NONE", { regexPreset: "LETTERS_ONLY" })).toThrow(ValidationError);
    });

    it("enforces minLength <= maxLength consistency", () => {
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { minLength: 10, maxLength: 5 })).toThrow(ValidationError);
      expect(canonicalizeValidationRules("TEXT", "NONE", { minLength: 5, maxLength: 10 })).toEqual({
        minLength: 5,
        maxLength: 10,
      });
    });

    it("enforces NUMBER minimumValue <= maximumValue consistency", () => {
      expect(() => canonicalizeValidationRules("NUMBER", "NONE", { minimumValue: 100, maximumValue: 50 })).toThrow(ValidationError);
      expect(canonicalizeValidationRules("NUMBER", "NONE", { minimumValue: 10, maximumValue: 20 })).toEqual({
        minimumValue: 10,
        maximumValue: 20,
      });
    });

    it("enforces DATE boundary consistency (minimumDate <= maximumDate)", () => {
      expect(() => canonicalizeValidationRules("DATE", "NONE", { minimumDate: "2026-12-31", maximumDate: "2026-01-01" })).toThrow(ValidationError);
      expect(canonicalizeValidationRules("DATE", "NONE", { minimumDate: "2026-01-01", maximumDate: "2026-12-31" })).toEqual({
        minimumDate: "2026-01-01",
        maximumDate: "2026-12-31",
      });
    });

    it("enforces DATETIME boundary consistency (minimumDatetime <= maximumDatetime)", () => {
      expect(() =>
        canonicalizeValidationRules("DATETIME", "NONE", {
          minimumDatetime: "2026-12-31T23:59:59Z",
          maximumDatetime: "2026-01-01T00:00:00Z",
        })
      ).toThrow(ValidationError);
    });

    it("rejects validation rules on BOOLEAN and USER_REFERENCE properties", () => {
      expect(() => canonicalizeValidationRules("BOOLEAN", "NONE", { minLength: 1 })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("USER_REFERENCE", "NONE", { minimumValue: 5 })).toThrow(ValidationError);
      expect(canonicalizeValidationRules("BOOLEAN", "NONE", undefined)).toBeNull();
    });

    it("enforces EMAIL and PHONE preset compatibility", () => {
      expect(() => canonicalizeValidationRules("TEXT", "NONE", { regexPreset: "EMAIL_BASIC" })).not.toThrow();
      expect(() => canonicalizeValidationRules("TEXT", "PHONE", { regexPreset: "EMAIL_BASIC" })).toThrow(ValidationError);
      expect(() => canonicalizeValidationRules("TEXT", "PHONE", { regexPreset: "INDIAN_MOBILE" })).not.toThrow();
    });
  });

  // --- 4. Sample Evaluation Engine ---
  describe("Sample Evaluation Engine", () => {
    it("returns isValid: true for matching sample and normalized rules", () => {
      const rules = canonicalizeValidationRules("TEXT", "NONE", {
        minLength: 3,
        maxLength: 10,
        regexPreset: "ALPHANUMERIC",
        validationMessage: "Must be 3-10 alphanumeric characters",
      });

      const res = evaluateValidation("TEXT", rules, "ABC123");
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.normalizedRules).toEqual(rules);
    });

    it("returns isValid: false and structured errors for sample mismatch", () => {
      const rules = canonicalizeValidationRules("TEXT", "NONE", {
        minLength: 5,
        regexPreset: "LETTERS_ONLY",
        validationMessage: "Must be letters only and at least 5 chars",
      });

      const res = evaluateValidation("TEXT", rules, "AB12");
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBe(2); // minLength and REGEX_MISMATCH
      expect(res.errors[0].code).toBe("MIN_LENGTH");
      expect(res.errors[1].code).toBe("REGEX_MISMATCH");
    });

    it("rejects sampleValue exceeding maximum limit of 2,000 characters", () => {
      const rules = canonicalizeValidationRules("TEXT", "NONE", { minLength: 1 });
      const longSample = "a".repeat(2001);
      expect(() => evaluateValidation("TEXT", rules, longSample)).toThrow(ValidationError);
    });
  });

  // --- 5. Property Mutation Integration & Audit Masking ---
  describe("Property Mutation Integration & Audit Masking", () => {
    it("creates property with canonical validation rules and masks custom regex in audit if isSensitive: true", async () => {
      const db = getDb();
      const { property, solutionRevision } = await solutionPropertyService.createProperty(
        solutionA.id,
        {
          expectedRevision: 1,
          label: "Secret Code",
          localSymbolicName: "secret_code",
          storedDataType: "TEXT",
          isSensitive: true,
          validationRules: {
            customRegex: { pattern: "^[A-Z0-9]{8}$", flags: "i" },
            validationMessage: "Secret code must be 8 alphanumeric characters",
          },
        },
        designerContext
      );

      expect(solutionRevision).toBe(2);
      expect(property.validationRules).toEqual({
        customRegex: { pattern: "^[A-Z0-9]{8}$", flags: "i" },
        validationMessage: "Secret code must be 8 alphanumeric characters",
      });

      // Verify audit payload masked custom regex pattern
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, property.id), eq(auditEvents.eventType, "PROPERTY_CREATED")))
        .limit(1);

      expect(audit).toBeDefined();
      const afterState = audit.afterState as any;
      expect(afterState.validationRules.customRegex.pattern).toBe("*****");
      expect(afterState.validationRules.customRegex.flags).toBe("i");
    });

    it("fails Property creation on invalid rules with zero revision changes and zero audit events", async () => {
      const db = getDb();
      const initialAudits = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.organisationId, orgAId));

      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 1,
            label: "Bad Prop",
            localSymbolicName: "bad_prop",
            storedDataType: "NUMBER",
            validationRules: { minimumValue: 100, maximumValue: 10 }, // Impossible range
          },
          designerContext
        )
      ).rejects.toThrow(ValidationError);

      // Verify zero audit events added
      const finalAudits = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.organisationId, orgAId));
      expect(finalAudits.length).toBe(initialAudits.length);

      // Verify Solution revision remains 1
      const currentSol = await solutionService.getSolutionById(solutionA.id, designerContext);
      expect(currentSol.revision).toBe(1);
    });

    it("rejects property mutation on stale expectedRevision with 409 ConflictError", async () => {
      await expect(
        solutionPropertyService.createProperty(
          solutionA.id,
          {
            expectedRevision: 999, // Stale revision
            label: "Stale Prop",
            localSymbolicName: "stale_prop",
            storedDataType: "TEXT",
          },
          designerContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
