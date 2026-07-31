import { describe, it, expect } from "vitest";
import { parseEnv } from "./index";

describe("Shared Environment Validation", () => {
  it("should validate valid environment configuration", () => {
    const validRaw = {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      SESSION_SECRET: "super-secret-key-at-least-16-chars",
    };
    const parsed = parseEnv(validRaw);
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.PORT).toBe(3000);
    expect(parsed.SESSION_INACTIVITY_TIMEOUT_MINUTES).toBe(30);
  });

  it("should throw ValidationError if DATABASE_URL is missing", () => {
    const invalidRaw = {
      NODE_ENV: "test",
      SESSION_SECRET: "super-secret-key-at-least-16-chars",
    };
    expect(() => parseEnv(invalidRaw)).toThrow("Environment validation failed");
  });
});
