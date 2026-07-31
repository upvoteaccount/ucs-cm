import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/infrastructure/db/client";

export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  const isHealthy = dbHealth.status === "ok";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      components: {
        application: {
          status: "UP",
        },
        database: {
          status: dbHealth.status === "ok" ? "UP" : "DOWN",
        },
      },
    },
    { status: statusCode }
  );
}
