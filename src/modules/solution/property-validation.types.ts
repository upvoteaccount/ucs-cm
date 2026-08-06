export interface CustomRegexConfig {
  pattern: string;
  flags?: string;
}

export interface CanonicalValidationRules {
  minLength?: number;
  maxLength?: number;
  regexPreset?: string | null;
  customRegex?: CustomRegexConfig | null;
  minimumValue?: number;
  maximumValue?: number;
  minimumDate?: string;
  maximumDate?: string;
  minimumDatetime?: string;
  maximumDatetime?: string;
  validationMessage?: string;
}

export const VALIDATION_ERROR_CODES = {
  REQUIRED: "REQUIRED",
  MIN_LENGTH: "MIN_LENGTH",
  MAX_LENGTH: "MAX_LENGTH",
  REGEX_MISMATCH: "REGEX_MISMATCH",
  MIN_VALUE: "MIN_VALUE",
  MAX_VALUE: "MAX_VALUE",
  MIN_DATE: "MIN_DATE",
  MAX_DATE: "MAX_DATE",
  MIN_DATETIME: "MIN_DATETIME",
  MAX_DATETIME: "MAX_DATETIME",
  INVALID_VALUE_TYPE: "INVALID_VALUE_TYPE",
} as const;

export interface ValidationErrorItem {
  code: string;
  message: string;
  ruleKey?: string;
}

export interface ValidationTestResult {
  isValid: boolean;
  normalizedRules: CanonicalValidationRules | null;
  errors: ValidationErrorItem[];
}
