import safeRegex from "safe-regex";
import { ValidationError } from "../../shared/errors";

const ALLOWED_FLAGS = new Set(["", "i", "m", "im"]);

export function validateCustomRegex(pattern: string, flags: string = ""): void {
  if (!pattern || typeof pattern !== "string") {
    throw new ValidationError("Custom regex pattern is required and must be a string.");
  }

  // 1. Flag validation
  if (!ALLOWED_FLAGS.has(flags)) {
    throw new ValidationError(
      `Invalid or forbidden regex flags '${flags}'. Allowed flags: '', 'i', 'm', 'im'.`
    );
  }

  // 2. Pattern length bounds
  if (pattern.length > 256) {
    throw new ValidationError("Custom regex pattern exceeds maximum length of 256 characters.");
  }

  // 3. Reject control characters and null bytes
  if (/[\x00-\x1F\x7F]/.test(pattern)) {
    throw new ValidationError("Custom regex pattern contains forbidden control characters or null bytes.");
  }

  // 4. Reject unsupported constructs: lookbehinds and backreferences
  if (/\(\?<=|\(\?<!/.test(pattern)) {
    throw new ValidationError("Custom regex pattern contains unsupported lookbehind assertions.");
  }
  if (/\\[1-9]|\\[kK]</.test(pattern)) {
    throw new ValidationError("Custom regex pattern contains unsupported backreferences.");
  }

  // 5. Syntax compilation check
  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern, flags);
  } catch (err: any) {
    throw new ValidationError(`Syntactically invalid regex pattern: ${err?.message || "Invalid regular expression"}`);
  }

  // 6. safe-regex structural static analysis
  if (!safeRegex(compiled)) {
    throw new ValidationError(
      "Unsafe regex pattern rejected: Potential catastrophic backtracking vulnerability detected."
    );
  }
}
