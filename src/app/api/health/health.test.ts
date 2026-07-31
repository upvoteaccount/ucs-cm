import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import * as dbClient from "@/infrastructure/db/client";

describe("Sanitized Health API Endpoint", () => {
  it("should return HTTP 200 with UP status when database is healthy", async () => {
    vi.spyOn(dbClient, "checkDatabaseHealth").mockResolvedValueOnce({ status: "ok", latencyMs: 5 });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("UP");
    expect(body.components.application.status).toBe("UP");
    expect(body.components.database.status).toBe("UP");
  });

  it("should return HTTP 503 with DOWN status without exposing internal error strings", async () => {
    vi.spyOn(dbClient, "checkDatabaseHealth").mockResolvedValueOnce({
      status: "error",
    });

    const response = await GET();
    const bodyText = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(bodyText).not.toContain("ucs_user");
    expect(bodyText).not.toContain("password");
    expect(bodyText).not.toContain("localhost");
    expect(bodyText).not.toContain("SELECT");
    expect(bodyText).not.toContain("error");
    expect(bodyText).not.toContain("connection");
  });
});
