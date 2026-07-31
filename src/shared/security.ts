import crypto from "crypto";

/**
 * Normalizes email address to lowercase trim format.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Computes SHA-256 hash of a string (used for resting session token hashing).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Safely compares two sensitive hash strings in constant time to prevent timing attacks.
 */
export function safeCompareHashes(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Masks sensitive email or actor identifiers for audit logging without exposing raw credentials.
 * Example: "john.doe@company.com" -> "j***e@company.com"
 */
export function maskIdentifier(identifier: string): string {
  if (!identifier) return "anonymous";
  const parts = identifier.split("@");
  if (parts.length !== 2) {
    return identifier.length > 2
      ? `${identifier[0]}***${identifier[identifier.length - 1]}`
      : "***";
  }
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
