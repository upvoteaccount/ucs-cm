import { ValidationError } from "../../shared/errors";

// Solution Prefix pattern: Starts with uppercase letter A-Z, followed by 1 to 9 uppercase letters or numbers (2 to 10 chars total). No underscores.
export const SOLUTION_PREFIX_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;

// Local Symbolic Name pattern: Starts with lowercase letter a-z, followed by 0 to 52 lowercase letters, numbers, or underscores (1 to 53 chars total).
export const LOCAL_SYMBOLIC_NAME_REGEX = /^[a-z][a-z0-9_]{0,52}$/;

// Reserved symbolic names
export const RESERVED_SYMBOLIC_NAMES = new Set([
  "id",
  "created_at",
  "updated_at",
  "organisation_id",
  "solution_id",
  "status",
  "case_number",
  "version",
  "revision",
  "actor",
  "system",
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
    return cleanWord.substring(0, Math.min( cleanWord.length, 6 ));
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
 * Normalizes a Local Symbolic Name to lowercase snake_case.
 */
export function normalizeLocalSymbolicName(rawName: string): string {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");

  return normalized;
}

/**
 * Validates a Local Symbolic Name and constructs the generated technical property name.
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
      "Local symbolic name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (1 to 53 characters)."
    );
  }

  if (RESERVED_SYMBOLIC_NAMES.has(cleanLocalName)) {
    throw new ValidationError(`"${cleanLocalName}" is a reserved system property name.`);
  }

  const totalLength = cleanPrefix.length + 1 + cleanLocalName.length;
  if (totalLength > 64) {
    throw new ValidationError(
      `Generated technical property name "${cleanPrefix}_${cleanLocalName}" exceeds maximum allowed length of 64 characters (current total length: ${totalLength}).`
    );
  }

  const generatedTechnicalName = `${cleanPrefix}_${cleanLocalName}`;
  return {
    localSymbolicName: cleanLocalName,
    generatedTechnicalName,
  };
}
