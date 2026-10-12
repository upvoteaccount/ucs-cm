import { ValidationError } from "../../shared/errors";

// Solution Prefix pattern: Starts with uppercase letter A-Z, followed by 1 to 9 uppercase letters or numbers (2 to 10 chars total). No underscores.
export const SOLUTION_PREFIX_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;

// Local Symbolic Name pattern: Starts with uppercase letter A-Z, followed by 0 to 52 uppercase letters, numbers, or underscores (1 to 53 chars total).
export const LOCAL_SYMBOLIC_NAME_REGEX = /^[A-Z][A-Z0-9_]{0,52}$/;

// Reserved symbolic names (in uppercase)
export const RESERVED_SYMBOLIC_NAMES = new Set([
  "ID",
  "CREATED_AT",
  "UPDATED_AT",
  "ORGANISATION_ID",
  "SOLUTION_ID",
  "STATUS",
  "CASE_NUMBER",
  "VERSION",
  "REVISION",
  "ACTOR",
  "SYSTEM",
]);

/**
 * Suggests an uppercase Solution Prefix from a Solution Name using meaningful word initials.
 * Example: "Customer Due Diligence" -> "CDD", "KYC Exception" -> "KE" (or "KYCE").
 */
export function suggestSolutionPrefix(name: string): string {
  const words = name
    .trim()
    .split(/[\s_\-]+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return "SOL";

  if (words.length === 1) {
    const cleanWord = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!cleanWord) return "SOL";
    if (cleanWord.length <= 1) return (cleanWord + "SOL").substring(0, 3);
    return cleanWord.substring(0, Math.min(cleanWord.length, 6));
  }

  const initials = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "")[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const validInitials = initials.replace(/[^A-Z0-9]/g, "");
  if (validInitials.length >= 2) {
    return validInitials.substring(0, 10);
  }

  const fallback = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return fallback.substring(0, Math.min(fallback.length, 6)) || "SOL";
}

/**
 * Validates a Solution Prefix string.
 */
export function validateSolutionPrefix(prefix: string): string {
  const cleanPrefix = prefix.trim();
  if (!SOLUTION_PREFIX_REGEX.test(cleanPrefix)) {
    throw new ValidationError(
      "Solution prefix must start with an uppercase letter, contain only uppercase letters and numbers (2-10 characters), and contain no underscores or special characters."
    );
  }
  return cleanPrefix;
}

/**
 * Normalizes a Local Symbolic Name to uppercase snake_case.
 * Example: "First Name" -> "FIRST_NAME"
 */
export function normalizeLocalSymbolicName(rawName: string): string {
  const normalized = rawName
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized;
}

/**
 * Validates a Local Symbolic Name and constructs the generated full Symbolic Name.
 * Dynamically enforces prefix.length + 1 + localSymbolicName.length <= 64.
 */
export function constructGeneratedTechnicalName(
  prefix: string,
  localSymbolicName: string
): { localSymbolicName: string; generatedTechnicalName: string } {
  const cleanPrefix = validateSolutionPrefix(prefix);
  const cleanLocalName = normalizeLocalSymbolicName(localSymbolicName);

  if (!LOCAL_SYMBOLIC_NAME_REGEX.test(cleanLocalName)) {
    throw new ValidationError(
      "Local symbolic name must start with an uppercase letter and contain only uppercase letters, numbers, and underscores (1 to 53 characters)."
    );
  }

  if (RESERVED_SYMBOLIC_NAMES.has(cleanLocalName)) {
    throw new ValidationError(`"${cleanLocalName}" is a reserved system property name.`);
  }

  const totalLength = cleanPrefix.length + 1 + cleanLocalName.length;
  if (totalLength > 64) {
    throw new ValidationError(
      `Generated Symbolic Name "${cleanPrefix}_${cleanLocalName}" exceeds maximum allowed length of 64 characters (current total length: ${totalLength}).`
    );
  }

  const generatedTechnicalName = `${cleanPrefix}_${cleanLocalName}`;
  return {
    localSymbolicName: cleanLocalName,
    generatedTechnicalName,
  };
}

/**
 * Constructs a canonical uppercase Choice Set Symbolic Key: <PREFIX>_LIST_<NORMALIZED_NAME>
 * Example: ("PLA", "Existing Loans") -> "PLA_LIST_EXISTING_LOANS"
 */
export function constructChoiceListKey(prefix: string, rawName: string): string {
  const cleanPrefix = validateSolutionPrefix(prefix);
  let cleanName = rawName
    .trim()
    .toUpperCase()
    .replace(/^.*_LIST_/, "") // Strip prefix if passed
    .replace(/[\s\-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleanName) cleanName = "SET";

  const key = `${cleanPrefix}_LIST_${cleanName}`;
  if (key.length > 64) {
    throw new ValidationError(
      `Generated Choice Set Key "${key}" exceeds maximum allowed length of 64 characters (current length: ${key.length}).`
    );
  }

  return key;
}
