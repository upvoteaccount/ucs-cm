import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { logger } from "../../shared/logger";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is missing");
    }

    const statementTimeout = parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT_MS || "10000", 10);
    const lockTimeout = parseInt(process.env.POSTGRES_LOCK_TIMEOUT_MS || "5000", 10);

    pool = new Pool({
      connectionString,
      statement_timeout: statementTimeout,
      query_timeout: statementTimeout,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    pool.on("error", (err) => {
      logger.error("Unexpected database pool error", "DatabasePool", { error: err.message, lockTimeout });
    });
  }
  return pool;
}

export function getDb() {
  const p = getDbPool();
  return drizzle(p);
}

export async function checkDatabaseHealth(): Promise<{ status: "ok" | "error"; latencyMs?: number }> {
  const start = Date.now();
  try {
    const p = getDbPool();
    const client = await p.connect();
    try {
      await client.query("SELECT 1");
      const latencyMs = Date.now() - start;
      return { status: "ok", latencyMs };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown database connection failure";
    logger.error("Database health check failed", "DatabaseHealth", { error: message });
    return { status: "error" };
  }
}
