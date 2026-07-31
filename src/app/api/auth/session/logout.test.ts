import { describe, it, expect } from "vitest";
import { DELETE } from "./route";
import { NextRequest } from "next/server";
import { getDb } from "@/infrastructure/db/client";
import { organisations, users, organisationMemberships, platformRoles, membershipPlatformRoles } from "@/infrastructure/db/schema";
import { authService, PLATFORM_ROLES } from "@/modules/auth";

describe("Logout Cookie Deletion & Header Specification Test", () => {
  it("DELETE /api/auth/session clears session cookie with exact security parameters", async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Worker" },
    ]).onConflictDoNothing();

    const suffix = Math.random().toString(36).substring(7);
    const [org] = await db.insert(organisations).values({ key: `org-${suffix}`, name: "Org" }).returning();
    const hash = await authService.hashPassword("Password123!");
    const [user] = await db.insert(users).values({ email: `u-${suffix}@test.com`, passwordHash: hash, fullName: "User" }).returning();
    const [mem] = await db.insert(organisationMemberships).values({ organisationId: org.id, userId: user.id }).returning();
    await db.insert(membershipPlatformRoles).values({ membershipId: mem.id, roleKey: PLATFORM_ROLES.RUNTIME_USER });

    const { sessionToken } = await authService.login(user.email, "Password123!", org.key);

    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "DELETE",
      headers: {
        cookie: `ucs_session_token=${sessionToken}`,
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("ucs_session_token=");
    expect(cookieHeader).toContain("Path=/");
    expect(cookieHeader).toContain("Expires=");

    // Verify session token is revoked in DB
    await expect(authService.validateSession(sessionToken)).rejects.toThrow("Invalid or revoked session");
  });
});
