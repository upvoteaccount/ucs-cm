import { ValidationError } from "../errors";
import {
  CanonicalValidationRules,
  ValidationErrorItem,
  ValidationTestResult,
  VALIDATION_ERROR_CODES,
} from "./property-validation.types";
import { getRegexPresetByKey } from "./regex-presets";

/**
 * Pure evaluator for property validation rules against a sample/field value.
 * Safe for execution in both client-side and server-side runtimes.
 */
export function evaluateValidation(
  storedDataType: string,
  rules: CanonicalValidationRules | null,
  sampleValue?: unknown
): ValidationTestResult {
  const errors: ValidationErrorItem[] = [];

  if (!rules || Object.keys(rules).length === 0) {
    return { isValid: true, normalizedRules: null, errors: [] };
  }

  // If sampleValue is not provided or null/undefined, return valid with normalized rules
  if (sampleValue === undefined || sampleValue === null) {
    return { isValid: true, normalizedRules: rules, errors: [] };
  }

  // Sample length limit (max 2,000 characters)
  if (typeof sampleValue === "string" && sampleValue.length > 2000) {
    throw new ValidationError("sampleValue exceeds maximum limit of 2,000 characters.");
  }

  const defaultMsg = rules.validationMessage;

  switch (storedDataType) {
    case "TEXT": {
      if (typeof sampleValue !== "string") {
        errors.push({
          code: VALIDATION_ERROR_CODES.INVALID_VALUE_TYPE,
          message: "Sample value must be a string for TEXT property.",
        });
        break;
      }

      if (rules.minLength !== undefined && sampleValue.length < rules.minLength) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MIN_LENGTH,
          message: defaultMsg || `Value length must be at least ${rules.minLength} characters.`,
          ruleKey: "minLength",
        });
      }

      if (rules.maxLength !== undefined && sampleValue.length > rules.maxLength) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MAX_LENGTH,
          message: defaultMsg || `Value length cannot exceed ${rules.maxLength} characters.`,
          ruleKey: "maxLength",
        });
      }

      let regexToTest: RegExp | null = null;
      let ruleKeyTested: string | undefined = undefined;

      if (rules.regexPreset) {
        const preset = getRegexPresetByKey(rules.regexPreset);
        if (preset) {
          regexToTest = new RegExp(preset.pattern);
          ruleKeyTested = "regexPreset";
        }
      } else if (rules.customRegex?.pattern) {
        regexToTest = new RegExp(rules.customRegex.pattern, rules.customRegex.flags || "");
        ruleKeyTested = "customRegex";
      }

      if (regexToTest && !regexToTest.test(sampleValue)) {
        errors.push({
          code: VALIDATION_ERROR_CODES.REGEX_MISMATCH,
          message: defaultMsg || "Value does not match the required pattern.",
          ruleKey: ruleKeyTested,
        });
      }
      break;
    }

    case "NUMBER": {
      const numVal = Number(sampleValue);
      if (typeof sampleValue !== "number" && (isNaN(numVal) || typeof sampleValue === "boolean")) {
        errors.push({
          code: VALIDATION_ERROR_CODES.INVALID_VALUE_TYPE,
          message: "Sample value must be a valid number for NUMBER property.",
        });
        break;
      }

      if (rules.minimumValue !== undefined && numVal < rules.minimumValue) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MIN_VALUE,
          message: defaultMsg || `Value must be greater than or equal to ${rules.minimumValue}.`,
          ruleKey: "minimumValue",
        });
      }

      if (rules.maximumValue !== undefined && numVal > rules.maximumValue) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MAX_VALUE,
          message: defaultMsg || `Value must be less than or equal to ${rules.maximumValue}.`,
          ruleKey: "maximumValue",
        });
      }
      break;
    }

    case "DATE": {
      const valStr = String(sampleValue).trim();
      const valTime = Date.parse(valStr);
      if (isNaN(valTime) || !/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
        errors.push({
          code: VALIDATION_ERROR_CODES.INVALID_VALUE_TYPE,
          message: "Sample value must be a valid ISO date string (YYYY-MM-DD).",
        });
        break;
      }

      if (rules.minimumDate && valStr < rules.minimumDate) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MIN_DATE,
          message: defaultMsg || `Date must be on or after ${rules.minimumDate}.`,
          ruleKey: "minimumDate",
        });
      }

      if (rules.maximumDate && valStr > rules.maximumDate) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MAX_DATE,
          message: defaultMsg || `Date must be on or before ${rules.maximumDate}.`,
          ruleKey: "maximumDate",
        });
      }
      break;
    }

    case "DATETIME": {
      const valStr = String(sampleValue).trim();
      const valTime = Date.parse(valStr);
      if (isNaN(valTime)) {
        errors.push({
          code: VALIDATION_ERROR_CODES.INVALID_VALUE_TYPE,
          message: "Sample value must be a valid ISO datetime string.",
        });
        break;
      }

      if (rules.minimumDatetime && valTime < Date.parse(rules.minimumDatetime)) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MIN_DATETIME,
          message: defaultMsg || `Datetime must be on or after ${rules.minimumDatetime}.`,
          ruleKey: "minimumDatetime",
        });
      }

      if (rules.maximumDatetime && valTime > Date.parse(rules.maximumDatetime)) {
        errors.push({
          code: VALIDATION_ERROR_CODES.MAX_DATETIME,
          message: defaultMsg || `Datetime must be on or before ${rules.maximumDatetime}.`,
          ruleKey: "maximumDatetime",
        });
      }
      break;
    }

    default:
      break;
  }

  return {
    isValid: errors.length === 0,
    normalizedRules: rules,
    errors,
  };
}
