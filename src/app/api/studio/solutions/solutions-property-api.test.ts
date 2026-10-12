import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import {
  auditEvents,
  platformRoles,
  solutionProperties,
} from "@/infrastructure/db/schema";
import { solutionService, solutionPropertyService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getPropertiesHandler, POST as postPropertiesHandler } from "./[id]/properties/route";
import {
  GET as getPropertyDetailHandler,
  PATCH as patchPropertyDetailHandler,
  DELETE as deletePropertyDetailHandler,
} from "./[id]/properties/[propertyId]/route";
import { NextRequest } from "next/server";

describe("INC-03C3 Solution Properties API Integration Test Suite", () => {
  let orgAId: string;
  let designerUserId: string;
  let runtimeUserId: string;
  let designerSessionToken: string;
  let runtimeSessionToken: string;
  let solutionId: string;

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

    const orgA = await adminService.createOrganisation(`propapi-org-${suffix}`, "Prop API Org");
    orgAId = orgA.id;

    const uDesigner = await adminService.createUser(`propapidesigner-${suffix}@test.com`, "Password123!", "Designer User");
    designerUserId = uDesigner.id;

    const uRuntime = await adminService.createUser(`propapiruntime-${suffix}@test.com`, "Password123!", "Runtime User");
    runtimeUserId = uRuntime.id;

    const memA1 = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memA1.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const memA2 = await adminService.createMembership(orgAId, runtimeUserId);
    await adminService.assignPlatformRole(memA2.id, PLATFORM_ROLES.RUNTIME_USER);

    const desLogin = await authService.login(uDesigner.email, "Password123!", orgA.key);
    designerSessionToken = desLogin.sessionToken;

    const runLogin = await authService.login(uRuntime.email, "Password123!", orgA.key);
    runtimeSessionToken = runLogin.sessionToken;

    const sol = await solutionService.createSolution(
      { name: "Property Test Solution", solutionPrefix: "PROP" },
      desLogin.context
    );
    solutionId = sol.id;
  });

  it("GET and POST /api/studio/solutions/[id]/properties route handler test", async () => {
    const reqPost = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        label: "Risk Rating",
        localSymbolicName: "risk_rating",
        storedDataType: "TEXT",
      }),
    });

    const resPost = await postPropertiesHandler(reqPost, { params: Promise.resolve({ id: solutionId }) });
    expect(resPost.status).toBe(201);
    const jsonPost = await resPost.json();
    expect(jsonPost.property.id).toBeDefined();
    expect(jsonPost.property.generatedTechnicalName).toBe("PROP_RISK_RATING");
    expect(jsonPost.solutionRevision).toBe(2);

    const reqGet = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const resGet = await getPropertiesHandler(reqGet, { params: Promise.resolve({ id: solutionId }) });
    expect(resGet.status).toBe(200);
    const jsonGet = await resGet.json();
    expect(jsonGet.properties.length).toBe(1);
  });

  it("GET, PATCH, and DELETE /api/studio/solutions/[id]/properties/[propertyId] route handler test", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { property } = await solutionPropertyService.createProperty(
      solutionId,
      {
        expectedRevision: 1,
        label: "Amount Limit",
        localSymbolicName: "amount_limit",
        storedDataType: "NUMBER",
      },
      desLogin
    );

    // GET detail
    const getReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties/${property.id}`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });
    const getRes = await getPropertyDetailHandler(getReq, { params: Promise.resolve({ id: solutionId, propertyId: property.id }) });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.property.label).toBe("Amount Limit");

    // PATCH update defaultControlType to RADIO (SINGLE)
    const patchReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties/${property.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        label: "Updated Amount Limit",
        defaultControlType: "RADIO",
      }),
    });
    const patchRes = await patchPropertyDetailHandler(patchReq, { params: Promise.resolve({ id: solutionId, propertyId: property.id }) });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.property.label).toBe("Updated Amount Limit");
    expect(patchJson.property.defaultControlType).toBe("RADIO");
    expect(patchJson.solutionRevision).toBe(3);

    // Verify DB level value
    const db = getDb();
    const [dbProp] = await db
      .select()
      .from(solutionProperties)
      .where(eq(solutionProperties.id, property.id));
    expect(dbProp.defaultControlType).toBe("RADIO");

    // GET detail after update
    const getReq2 = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties/${property.id}`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });
    const getRes2 = await getPropertyDetailHandler(getReq2, { params: Promise.resolve({ id: solutionId, propertyId: property.id }) });
    expect(getRes2.status).toBe(200);
    const getJson2 = await getRes2.json();
    expect(getJson2.property.defaultControlType).toBe("RADIO");

    // DELETE property
    const delReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties/${property.id}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 3,
      }),
    });
    const delRes = await deletePropertyDetailHandler(delReq, { params: Promise.resolve({ id: solutionId, propertyId: property.id }) });
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
    expect(delJson.solutionRevision).toBe(4);
  });

  it("denies access with HTTP 403 for runtime-only user and records AUDIT_ACCESS_DENIED audit", async () => {
    const db = getDb();
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/properties`, {
      headers: { authorization: `Bearer ${runtimeSessionToken}` },
    });

    const res = await getPropertiesHandler(req, { params: Promise.resolve({ id: solutionId }) });
    expect(res.status).toBe(403);

    // Verify AUDIT_ACCESS_DENIED audit event in DB
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.actorUserId, runtimeUserId), eq(auditEvents.eventType, "AUDIT_ACCESS_DENIED")))
      .limit(1);

    expect(audit).toBeDefined();
  });
});
