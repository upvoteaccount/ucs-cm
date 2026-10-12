export interface RegexPresetMetadata {
  key: string;
  label: string;
  description: string;
  compatibleStoredTypes: string[];
  compatibleFormatPresets: string[];
}

export interface InternalRegexPreset extends RegexPresetMetadata {
  pattern: string;
}

export const REGEX_PRESETS_CATALOGUE: Record<string, InternalRegexPreset> = {
  LETTERS_ONLY: {
    key: "LETTERS_ONLY",
    label: "Letters Only",
    description: "Matches ASCII letters (A-Z, a-z) only.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["NONE"],
    pattern: "^[A-Za-z]+$",
  },
  ALPHANUMERIC: {
    key: "ALPHANUMERIC",
    label: "Alphanumeric",
    description: "Matches ASCII letters and numbers only.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["NONE"],
    pattern: "^[A-Za-z0-9]+$",
  },
  ALPHANUMERIC_SPACES: {
    key: "ALPHANUMERIC_SPACES",
    label: "Alphanumeric with Spaces",
    description: "Matches ASCII letters, numbers, and ordinary spaces.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["NONE"],
    pattern: "^[A-Za-z0-9 ]+$",
  },
  NO_SPECIAL_CHARACTERS: {
    key: "NO_SPECIAL_CHARACTERS",
    label: "No Special Characters",
    description: "Matches ASCII letters, numbers, ordinary spaces, underscores, and hyphens.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["NONE"],
    pattern: "^[A-Za-z0-9 _-]+$",
  },
  INDIAN_MOBILE: {
    key: "INDIAN_MOBILE",
    label: "Indian Mobile Number",
    description: "10-digit mobile number starting with 6-9.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["PHONE", "NONE"],
    pattern: "^[6-9]\\d{9}$",
  },
  EMAIL_BASIC: {
    key: "EMAIL_BASIC",
    label: "Basic Email Format",
    description: "Basic email format verification.",
    compatibleStoredTypes: ["TEXT"],
    compatibleFormatPresets: ["EMAIL", "NONE"],
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  },
};

/**
 * Returns public preset catalogue metadata excluding server-owned regex patterns.
 */
export function getPublicRegexPresets(): RegexPresetMetadata[] {
  return Object.values(REGEX_PRESETS_CATALOGUE).map(({ pattern, ...rest }) => rest);
}

export function getRegexPresetByKey(key: string): InternalRegexPreset | null {
  return REGEX_PRESETS_CATALOGUE[key] || null;
}
