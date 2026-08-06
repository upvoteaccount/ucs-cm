import { ValidationError } from "../../shared/errors";
import {
  CanonicalValidationRules,
  ValidationTestResult,
  ValidationErrorItem,
  VALIDATION_ERROR_CODES,
} from "./property-validation.types";
import { getRegexPresetByKey } from "./regex-presets";
import { validateCustomRegex } from "./regex-safety";

const ALLOWED_KEYS_BY_TYPE: Record<string, Set<string>> = {
  TEXT: new Set(["minLength", "maxLength", "regexPreset", "customRegex", "validationMessage"]),
  NUMBER: new Set(["minimumValue", "maximumValue", "validationMessage"]),
  DATE: new Set(["minimumDate", "maximumDate", "validationMessage"]),
  DATETIME: new Set(["minimumDatetime", "maximumDatetime", "validationMessage"]),
  BOOLEAN: new Set(),
  USER_REFERENCE: new Set(),
};

/**
 * Parses and canonicalises Property validation rules according to storedDataType and formatPreset.
 * Returns null if no validation rules are configured.
 */
export function canonicalizeValidationRules(
  storedDataType: string,
  formatPreset: string = "NONE",
  rawRules?: unknown
): CanonicalValidationRules | null {
  if (rawRules === undefined || rawRules === null) {
    return null;
  }

  if (typeof rawRules !== "object" || Array.isArray(rawRules)) {
    throw new ValidationError("validationRules must be a JSON object.");
  }

  const rulesObj = rawRules as Record<string, unknown>;
  const keys = Object.keys(rulesObj).filter((k) => rulesObj[k] !== undefined && rulesObj[k] !== null);

  if (keys.length === 0) {
    return null;
  }

  const allowedKeys = ALLOWED_KEYS_BY_TYPE[storedDataType];
  if (!allowedKeys) {
    throw new ValidationError(`Unsupported storedDataType '${storedDataType}'.`);
  }

  // Reject unknown rule keys for this data type
  for (const k of keys) {
    if (!allowedKeys.has(k)) {
      throw new ValidationError(`Validation rule '${k}' is not supported for storedDataType '${storedDataType}'.`);
    }
  }

  // Reject client-supplied compiled regex or internal properties
  if ("compiledPattern" in rulesObj || "compiledRegex" in rulesObj || "serverPattern" in rulesObj) {
    throw new ValidationError("Client-supplied compiled regex or internal patterns are strictly forbidden.");
  }

  const canonical: CanonicalValidationRules = {};

  // --- TEXT RULES ---
  if (storedDataType === "TEXT") {
    if (rulesObj.minLength !== undefined && rulesObj.minLength !== null) {
      if (typeof rulesObj.minLength !== "number" || !Number.isInteger(rulesObj.minLength) || rulesObj.minLength < 0) {
        throw new ValidationError("minLength must be a non-negative integer.");
      }
      canonical.minLength = rulesObj.minLength;
    }

    if (rulesObj.maxLength !== undefined && rulesObj.maxLength !== null) {
      if (typeof rulesObj.maxLength !== "number" || !Number.isInteger(rulesObj.maxLength) || rulesObj.maxLength <= 0) {
        throw new ValidationError("maxLength must be a positive integer.");
      }
      canonical.maxLength = rulesObj.maxLength;
    }

    if (canonical.minLength !== undefined && canonical.maxLength !== undefined) {
      if (canonical.minLength > canonical.maxLength) {
        throw new ValidationError("minLength cannot be greater than maxLength.");
      }
    }

    const hasPreset = rulesObj.regexPreset !== undefined && rulesObj.regexPreset !== null && rulesObj.regexPreset !== "";
    const hasCustom = rulesObj.customRegex !== undefined && rulesObj.customRegex !== null && Object.keys(rulesObj.customRegex as object).length > 0;

    if (hasPreset && hasCustom) {
      throw new ValidationError("regexPreset and customRegex are mutually exclusive.");
    }

    if (hasPreset) {
      const presetKey = String(rulesObj.regexPreset).trim();
      const preset = getRegexPresetByKey(presetKey);
      if (!preset) {
        throw new ValidationError(`Unknown regexPreset '${presetKey}'.`);
      }
      if (!preset.compatibleFormatPresets.includes(formatPreset)) {
        throw new ValidationError(`regexPreset '${presetKey}' is incompatible with formatPreset '${formatPreset}'.`);
      }
      canonical.regexPreset = presetKey;
    }

    if (hasCustom) {
      const custom = rulesObj.customRegex as Record<string, unknown>;
      const customKeys = Object.keys(custom);
      for (const ck of customKeys) {
        if (ck !== "pattern" && ck !== "flags") {
          throw new ValidationError(`Unknown key '${ck}' in customRegex. customRegex supports only 'pattern' and 'flags'.`);
        }
      }
      if (typeof custom.pattern !== "string" || !custom.pattern.trim()) {
        throw new ValidationError("customRegex.pattern is required and must be a non-empty string.");
      }
      const flags = custom.flags !== undefined && custom.flags !== null ? String(custom.flags) : "";
      validateCustomRegex(custom.pattern, flags);
      canonical.customRegex = { pattern: custom.pattern, flags: flags || undefined };
    }
  }

  // --- NUMBER RULES ---
  if (storedDataType === "NUMBER") {
    if (rulesObj.minimumValue !== undefined && rulesObj.minimumValue !== null) {
      if (typeof rulesObj.minimumValue !== "number" || isNaN(rulesObj.minimumValue)) {
        throw new ValidationError("minimumValue must be a valid number.");
      }
      canonical.minimumValue = rulesObj.minimumValue;
    }

    if (rulesObj.maximumValue !== undefined && rulesObj.maximumValue !== null) {
      if (typeof rulesObj.maximumValue !== "number" || isNaN(rulesObj.maximumValue)) {
        throw new ValidationError("maximumValue must be a valid number.");
      }
      canonical.maximumValue = rulesObj.maximumValue;
    }

    if (canonical.minimumValue !== undefined && canonical.maximumValue !== undefined) {
      if (canonical.minimumValue > canonical.maximumValue) {
        throw new ValidationError("minimumValue cannot be greater than maximumValue.");
      }
    }
  }

  // --- DATE RULES ---
  if (storedDataType === "DATE") {
    if (rulesObj.minimumDate !== undefined && rulesObj.minimumDate !== null) {
      const minDateStr = String(rulesObj.minimumDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(minDateStr) || isNaN(Date.parse(minDateStr))) {
        throw new ValidationError("minimumDate must be a valid ISO date string (YYYY-MM-DD).");
      }
      canonical.minimumDate = minDateStr;
    }

    if (rulesObj.maximumDate !== undefined && rulesObj.maximumDate !== null) {
      const maxDateStr = String(rulesObj.maximumDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(maxDateStr) || isNaN(Date.parse(maxDateStr))) {
        throw new ValidationError("maximumDate must be a valid ISO date string (YYYY-MM-DD).");
      }
      canonical.maximumDate = maxDateStr;
    }

    if (canonical.minimumDate && canonical.maximumDate) {
      if (canonical.minimumDate > canonical.maximumDate) {
        throw new ValidationError("minimumDate cannot be after maximumDate.");
      }
    }
  }

  // --- DATETIME RULES ---
  if (storedDataType === "DATETIME") {
    if (rulesObj.minimumDatetime !== undefined && rulesObj.minimumDatetime !== null) {
      const minDtStr = String(rulesObj.minimumDatetime).trim();
      if (isNaN(Date.parse(minDtStr))) {
        throw new ValidationError("minimumDatetime must be a valid ISO datetime string.");
      }
      canonical.minimumDatetime = minDtStr;
    }

    if (rulesObj.maximumDatetime !== undefined && rulesObj.maximumDatetime !== null) {
      const maxDtStr = String(rulesObj.maximumDatetime).trim();
      if (isNaN(Date.parse(maxDtStr))) {
        throw new ValidationError("maximumDatetime must be a valid ISO datetime string.");
      }
      canonical.maximumDatetime = maxDtStr;
    }

    if (canonical.minimumDatetime && canonical.maximumDatetime) {
      if (new Date(canonical.minimumDatetime) > new Date(canonical.maximumDatetime)) {
        throw new ValidationError("minimumDatetime cannot be after maximumDatetime.");
      }
    }
  }

  // --- VALIDATION MESSAGE ---
  if (rulesObj.validationMessage !== undefined && rulesObj.validationMessage !== null) {
    const msg = String(rulesObj.validationMessage).trim();
    if (msg.length > 250) {
      throw new ValidationError("validationMessage cannot exceed 250 characters.");
    }
    if (msg.length > 0) {
      canonical.validationMessage = msg;
    }
  }

  // If no canonical fields were set, return null
  if (Object.keys(canonical).length === 0) {
    return null;
  }

  return canonical;
}

/**
 * Evaluates sampleValue against configured canonical validation rules.
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
