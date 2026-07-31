import { z } from "zod";
import { ValidationError } from "../errors";

// Environment Variable Validation Schema
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  SESSION_INACTIVITY_TIMEOUT_MINUTES: z.coerce.number().default(30),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./storage"),
  POSTGRES_STATEMENT_TIMEOUT_MS: z.coerce.number().default(10000),
  POSTGRES_LOCK_TIMEOUT_MS: z.coerce.number().default(5000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.format();
    throw new ValidationError("Environment validation failed", { errors: errorDetails });
  }
  return result.data;
}

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Input validation failed", { errors: result.error.flatten() });
  }
  return result.data;
}
