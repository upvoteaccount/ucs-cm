import { describe, it, expect } from "vitest";
import {
  evaluateValidation,
  getPublicRegexPresets,
  getRegexPresetByKey,
  VALIDATION_ERROR_CODES,
  CanonicalValidationRules,
} from "./index";
import { ValidationError } from "../errors";

describe("Shared Pure Validation Engine", () => {
  it("evaluates regex preset correctly", () => {
    const rules: CanonicalValidationRules = {
      regexPreset: "LETTERS_ONLY",
    };
    const validRes = evaluateValidation("TEXT", rules, "HelloWorld");
    expect(validRes.isValid).toBe(true);
    expect(validRes.errors).toHaveLength(0);

    const invalidRes = evaluateValidation("TEXT", rules, "Hello123");
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors[0].code).toBe(VALIDATION_ERROR_CODES.REGEX_MISMATCH);
  });

  it("evaluates custom regex correctly", () => {
    const rules: CanonicalValidationRules = {
      customRegex: { pattern: "^[A-Z]{3}$" },
    };
    const validRes = evaluateValidation("TEXT", rules, "ABC");
    expect(validRes.isValid).toBe(true);

    const invalidRes = evaluateValidation("TEXT", rules, "abcd");
    expect(invalidRes.isValid).toBe(false);
  });

  it("evaluates minLength and maxLength", () => {
    const rules: CanonicalValidationRules = {
      minLength: 3,
      maxLength: 6,
    };
    expect(evaluateValidation("TEXT", rules, "hi").isValid).toBe(false);
    expect(evaluateValidation("TEXT", rules, "toolonghere").isValid).toBe(false);
    expect(evaluateValidation("TEXT", rules, "hello").isValid).toBe(true);
  });

  it("evaluates number ranges", () => {
    const rules: CanonicalValidationRules = {
      minimumValue: 10,
      maximumValue: 100,
    };
    expect(evaluateValidation("NUMBER", rules, 5).isValid).toBe(false);
    expect(evaluateValidation("NUMBER", rules, 150).isValid).toBe(false);
    expect(evaluateValidation("NUMBER", rules, 50).isValid).toBe(true);
  });

  it("enforces 2000 character sampleValue limit", () => {
    const rules: CanonicalValidationRules = { minLength: 1 };
    const longValue = "A".repeat(2001);
    expect(() => evaluateValidation("TEXT", rules, longValue)).toThrow(ValidationError);
  });

  it("returns presets metadata without leaking internal pattern", () => {
    const publicPresets = getPublicRegexPresets();
    expect(publicPresets.length).toBeGreaterThan(0);
    for (const p of publicPresets) {
      expect((p as any).pattern).toBeUndefined();
      expect(p.key).toBeDefined();
    }
  });

  it("retrieves full internal preset by key", () => {
    const preset = getRegexPresetByKey("INDIAN_MOBILE");
    expect(preset).not.toBeNull();
    expect(preset?.pattern).toBe("^[6-9]\\d{9}$");
  });
});
