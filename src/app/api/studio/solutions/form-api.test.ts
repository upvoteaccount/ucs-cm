import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import { auditEvents, platformRoles } from "@/infrastructure/db/schema";
import { solutionService, formService, solutionPropertyService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getFormHandler } from "./[id]/form/route";
import { POST as postSectionsHandler } from "./[id]/form/tabs/[tabId]/sections/route";
import { POST as postFieldsHandler } from "./[id]/form/sections/[sectionId]/fields/route";
import { NextRequest } from "next/server";

describe("INC-03C5 Form Layout APIs Integration Test Suite", () => {
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

    const orgA = await adminService.createOrganisation(`formapi-org-${suffix}`, "Form API Org");
    orgAId = orgA.id;

    const uDesigner = await adminService.createUser(`formapidesigner-${suffix}@test.com`, "Password123!", "Designer User");
    designerUserId = uDesigner.id;

    const uRuntime = await adminService.createUser(`formapiruntime-${suffix}@test.com`, "Password123!", "Runtime User");
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
      { name: "Form Layout App", solutionPrefix: "FLA" },
      desLogin.context
    );
    solutionId = sol.id;
  });

  it("GET /api/studio/solutions/[id]/form returns full Form aggregate", async () => {
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/form`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const res = await getFormHandler(req, { params: Promise.resolve({ id: solutionId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.formAggregate.form.id).toBeDefined();
    expect(json.formAggregate.tabs.length).toBe(1);
    expect(json.solutionRevision).toBe(1);
  });

  it("Tab, Section, and Field creation route verification", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { formAggregate } = await formService.getFormAggregate(solutionId, desLogin);
    const defaultTabId = formAggregate.tabs[0].id;

    // 1. Create Section inside defaultTab
    const postSecReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/form/tabs/${defaultTabId}/sections`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        title: "Header Section",
      }),
    });
    const resSec = await postSectionsHandler(postSecReq, { params: Promise.resolve({ id: solutionId, tabId: defaultTabId }) });
    expect(resSec.status).toBe(201);
    const jsonSec = await resSec.json();
    const sectionId = jsonSec.section.id;
    expect(jsonSec.solutionRevision).toBe(2);

    // 2. Create Property
    const { property } = await solutionPropertyService.createProperty(
      solutionId,
      { expectedRevision: 2, label: "Account Name", localSymbolicName: "acct_name", storedDataType: "TEXT" },
      desLogin
    );

    // 3. Add Field Reference to Section
    const postFieldReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/form/sections/${sectionId}/fields`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 3,
        propertyId: property.id,
        controlType: "TEXT_INPUT",
        isRequired: true,
      }),
    });
    const resField = await postFieldsHandler(postFieldReq, { params: Promise.resolve({ id: solutionId, sectionId }) });
    expect(resField.status).toBe(201);
    const jsonField = await resField.json();
    expect(jsonField.fieldReference.controlType).toBe("TEXT_INPUT");
    expect(jsonField.solutionRevision).toBe(4);
  });

  it("denies access with HTTP 403 for runtime-only user and records AUDIT_ACCESS_DENIED audit", async () => {
    const db = getDb();
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/form`, {
      headers: { authorization: `Bearer ${runtimeSessionToken}` },
    });

    const res = await getFormHandler(req, { params: Promise.resolve({ id: solutionId }) });
    expect(res.status).toBe(403);

    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.actorUserId, runtimeUserId), eq(auditEvents.eventType, "AUDIT_ACCESS_DENIED")))
      .limit(1);

    expect(audit).toBeDefined();
  });
});
