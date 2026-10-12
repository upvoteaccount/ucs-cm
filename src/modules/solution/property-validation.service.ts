import { ValidationError } from "../../shared/errors";
import { CanonicalValidationRules } from "./property-validation.types";

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

export { evaluateValidation } from "../../shared/validation/evaluate-validation";

