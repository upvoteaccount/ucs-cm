import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function runMigrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("Running Drizzle migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully!");

  await pool.end();
}

runMigrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
