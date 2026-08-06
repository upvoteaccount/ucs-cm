import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import {
  organisations,
  auditEvents,
  platformRoles,
} from "@/infrastructure/db/schema";
import { solutionService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getSolutionsHandler, POST as postSolutionsHandler } from "./route";
import { GET as getSolutionDetailHandler, PATCH as patchSolutionDetailHandler } from "./[id]/route";
import { NextRequest } from "next/server";

describe("INC-03C2 Studio Solutions API Endpoints Integration Test Suite", () => {
  let orgAId: string;
  let orgBId: string;
  let designerUserId: string;
  let runtimeUserId: string;
  let designerSessionToken: string;
  let runtimeSessionToken: string;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.PLATFORM_ADMIN, name: "Admin" },
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime User" },
      { key: PLATFORM_ROLES.SUPERVISOR, name: "Supervisor" },
    ]).onConflictDoNothing();
  });

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);

    const orgA = await adminService.createOrganisation(`api-org-a-${suffix}`, "API Org A");
    const orgB = await adminService.createOrganisation(`api-org-b-${suffix}`, "API Org B");
    orgAId = orgA.id;
    orgBId = orgB.id;

    const uDesigner = await adminService.createUser(`apidesigner-${suffix}@test.com`, "Password123!", "Designer User");
    designerUserId = uDesigner.id;

    const uRuntime = await adminService.createUser(`apiruntime-${suffix}@test.com`, "Password123!", "Runtime User");
    runtimeUserId = uRuntime.id;

    const memA1 = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const memA2 = await adminService.createMembership(orgAId, runtimeUserId);
    await adminService.assignPlatformRole(memA2.id, PLATFORM_ROLES.RUNTIME_USER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerSessionToken = desLogin.sessionToken;

    const runLogin = await authService.login(uRuntime.email, "Password123!", orgA.key);
    runtimeSessionToken = runLogin.sessionToken;
  });

  it("GET /api/studio/solutions returns solutions list for authorized designer", async () => {
    const db = getDb();
    const [u] = await db.select().from(organisations).where(eq(organisations.id, orgAId)).limit(1);
    const desLogin = await authService.login(`apidesigner-${orgAId.substring(0, 4)}@test.com`, "Password123!", u.key).catch(async () => {
      const [usr] = await db.select().from(organisations).where(eq(organisations.id, orgAId));
      return authService.login(`apidesigner-${orgAId.substring(0, 4)}@test.com`, "Password123!", usr.key);
    }).catch(() => null);

    const tokenToUse = desLogin ? desLogin.sessionToken : designerSessionToken;

    const req = new NextRequest("http://localhost:3000/api/studio/solutions", {
      headers: { authorization: `Bearer ${tokenToUse}` },
    });

    const res = await getSolutionsHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.solutions).toBeDefined();
  });

  it("POST /api/studio/solutions creates solution and rejects client-supplied organisationId override", async () => {
    const req = new NextRequest("http://localhost:3000/api/studio/solutions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "API Sol Two",
        solutionPrefix: "APITWO",
      }),
    });

    const res = await postSolutionsHandler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.solution.id).toBeDefined();
    expect(json.solution.solutionPrefix).toBe("APITWO");

    // Attempt client-supplied organisationId override -> returns 400
    const hackReq = new NextRequest("http://localhost:3000/api/studio/solutions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Hack Sol",
        solutionPrefix: "HACK",
        organisationId: orgBId,
      }),
    });

    const hackRes = await postSolutionsHandler(hackReq);
    expect(hackRes.status).toBe(400);
  });

  it("GET and PATCH /api/studio/solutions/[id] route verification", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const sol = await solutionService.createSolution(
      { name: "Detail Sol", solutionPrefix: "DETAIL" },
      desLogin
    );

    const getReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${sol.id}`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const getRes = await getSolutionDetailHandler(getReq, { params: Promise.resolve({ id: sol.id }) });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.solution.name).toBe("Detail Sol");

    const patchReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${sol.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        name: "Patched Detail Sol",
      }),
    });

    const patchRes = await patchSolutionDetailHandler(patchReq, { params: Promise.resolve({ id: sol.id }) });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.solution.name).toBe("Patched Detail Sol");
    expect(patchJson.solution.revision).toBe(2);
  });

  it("denies access with HTTP 403 for runtime-only user and records ACCESS_DENIED audit", async () => {
    const db = getDb();
    const req = new NextRequest("http://localhost:3000/api/studio/solutions", {
      headers: { authorization: `Bearer ${runtimeSessionToken}` },
    });

    const res = await getSolutionsHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient platform permissions");

    // Verify AUDIT_ACCESS_DENIED audit event in DB
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.actorUserId, runtimeUserId), eq(auditEvents.eventType, "AUDIT_ACCESS_DENIED")))
      .limit(1);

    expect(audit).toBeDefined();
  });
});
