import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { POST, GET, DELETE } from "./route";
import { NextRequest } from "next/server";
import { getDb } from "@/infrastructure/db/client";
import { organisations, users, organisationMemberships, platformRoles, membershipPlatformRoles } from "@/infrastructure/db/schema";
import { authService, PLATFORM_ROLES } from "@/modules/auth";

describe("Canonical Authentication & Session API Contract Suite (/api/auth/session)", () => {
  let orgId: string;
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
    ]).onConflictDoNothing();
  });

  beforeEach(async () => {
    const db = getDb();
    const suffix = Math.random().toString(36).substring(7);
    userEmail = `designer-${suffix}@test.com`;

    const [org] = await db.insert(organisations).values({ key: `org-${suffix}`, name: "Test Org" }).returning();
    orgId = org.id;

    const hash = await authService.hashPassword("Password123!");
    const [user] = await db.insert(users).values({ email: userEmail, passwordHash: hash, fullName: "Test Designer" }).returning();
    userId = user.id;

    const [mem] = await db.insert(organisationMemberships).values({ organisationId: orgId, userId }).returning();
    await db.insert(membershipPlatformRoles).values({ membershipId: mem.id, roleKey: PLATFORM_ROLES.SOLUTION_DESIGNER });
  });

  it("POST /api/auth/session succeeds with valid credentials and sets secure cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("SUCCESS");
    expect(body.context.user.email).toBe(userEmail);
    expect(body.context.sessionId).toBeUndefined(); // Verify sessionId is not exposed
    expect(body.sessionToken).toBeUndefined(); // Verify sessionToken is not exposed in body

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("ucs_session_token=");
    expect(cookie).toContain("HttpOnly");
  });

  it("POST /api/auth/session returns generic 401 for invalid password without leaking user state", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "WrongPassword!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  it("GET /api/auth/session returns 401 when no cookie is present", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/session", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/session returns 200 and context when valid cookie is present", async () => {
    const { sessionToken } = await authService.login(userEmail, "Password123!");

    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: { cookie: `ucs_session_token=${sessionToken}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.context.user.email).toBe(userEmail);
  });

  it("GET /api/auth/session returns 401 when session has been revoked", async () => {
    const { sessionToken } = await authService.login(userEmail, "Password123!");
    await authService.logout(sessionToken);

    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: { cookie: `ucs_session_token=${sessionToken}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/auth/session revokes database session and clears cookie", async () => {
    const { sessionToken } = await authService.login(userEmail, "Password123!");

    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "DELETE",
      headers: { cookie: `ucs_session_token=${sessionToken}` },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("ucs_session_token=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Expires=");

    // Verify token can no longer be used
    const getReq = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: { cookie: `ucs_session_token=${sessionToken}` },
    });
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(401);
  });

  it("DELETE /api/auth/session succeeds gracefully when cookie is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("Expires=");
  });
});
