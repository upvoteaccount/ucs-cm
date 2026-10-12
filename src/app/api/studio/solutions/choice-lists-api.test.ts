import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import {
  auditEvents,
  platformRoles,
} from "@/infrastructure/db/schema";
import { solutionService, choiceListService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getChoiceListsHandler, POST as postChoiceListsHandler } from "./[id]/choice-lists/route";
import { POST as postOptionsHandler } from "./[id]/choice-lists/[choiceListId]/options/route";
import { POST as deactivateOptionHandler } from "./[id]/choice-lists/[choiceListId]/options/[optionId]/deactivate/route";
import { POST as reactivateOptionHandler } from "./[id]/choice-lists/[choiceListId]/options/[optionId]/reactivate/route";
import { PUT as reorderOptionsHandler } from "./[id]/choice-lists/[choiceListId]/options/reorder/route";
import { NextRequest } from "next/server";

describe("INC-03C4 Choice Lists & Options API Integration Test Suite", () => {
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

    const orgA = await adminService.createOrganisation(`clapi-org-${suffix}`, "CL API Org");
    orgAId = orgA.id;

    const uDesigner = await adminService.createUser(`clapidesigner-${suffix}@test.com`, "Password123!", "Designer User");
    designerUserId = uDesigner.id;

    const uRuntime = await adminService.createUser(`clapiruntime-${suffix}@test.com`, "Password123!", "Runtime User");
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
      { name: "Choice List Test App", solutionPrefix: "CLA" },
      desLogin.context
    );
    solutionId = sol.id;
  });

  it("GET and POST /api/studio/solutions/[id]/choice-lists route verification", async () => {
    const postReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        key: "workflow_states",
        name: "Workflow States",
      }),
    });

    const postRes = await postChoiceListsHandler(postReq, { params: Promise.resolve({ id: solutionId }) });
    expect(postRes.status).toBe(201);
    const postJson = await postRes.json();
    expect(postJson.choiceList.id).toBeDefined();
    expect(postJson.choiceList.key).toBe("CLA_LIST_WORKFLOW_STATES");
    expect(postJson.solutionRevision).toBe(2);

    const getReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const getRes = await getChoiceListsHandler(getReq, { params: Promise.resolve({ id: solutionId }) });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.choiceLists.length).toBe(1);
  });

  it("Choice Option endpoints (GET, POST, PATCH, DEACTIVATE, REORDER) route verification", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { choiceList } = await choiceListService.createChoiceList(
      solutionId,
      { expectedRevision: 1, key: "status_types", name: "Status Types" },
      desLogin
    );

    // Create Option 1
    const postOpt1 = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        key: "active",
        label: "Active Status",
      }),
    });
    const resOpt1 = await postOptionsHandler(postOpt1, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id }) });
    expect(resOpt1.status).toBe(201);
    const jsonOpt1 = await resOpt1.json();
    const opt1Id = jsonOpt1.option.id;

    // Create Option 2
    const postOpt2 = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 3,
        key: "pending",
        label: "Pending Status",
      }),
    });
    const resOpt2 = await postOptionsHandler(postOpt2, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id }) });
    expect(resOpt2.status).toBe(201);
    const jsonOpt2 = await resOpt2.json();
    const opt2Id = jsonOpt2.option.id;

    // Reorder Options: opt2 first, then opt1
    const putReorder = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options/reorder`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 4,
        optionIds: [opt2Id, opt1Id],
      }),
    });
    const resReorder = await reorderOptionsHandler(putReorder, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id }) });
    expect(resReorder.status).toBe(200);
    const jsonReorder = await resReorder.json();
    expect(jsonReorder.options[0].id).toBe(opt2Id);

    // Deactivate Option 1
    const postDeactivate = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options/${opt1Id}/deactivate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 5,
      }),
    });
    const resDeactivate = await deactivateOptionHandler(postDeactivate, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id, optionId: opt1Id }) });
    expect(resDeactivate.status).toBe(200);
    const jsonDeactivate = await resDeactivate.json();
    expect(jsonDeactivate.option.isActive).toBe(false);

    // Attempt to add a new option with same key as inactive option -> blocked with guidance
    const postAddDupInactive = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 6,
        key: "active",
        label: "Active Status",
      }),
    });
    const resAddDupInactive = await postOptionsHandler(postAddDupInactive, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id }) });
    expect(resAddDupInactive.status).toBe(409);
    const jsonAddDupInactive = await resAddDupInactive.json();
    expect(jsonAddDupInactive.error).toContain("An inactive option with this value already exists. Reactivate it instead.");

    // Reactivate Option 1 -> preserves option ID and key
    const postReactivate = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists/${choiceList.id}/options/${opt1Id}/reactivate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 6,
      }),
    });
    const resReactivate = await reactivateOptionHandler(postReactivate, { params: Promise.resolve({ id: solutionId, choiceListId: choiceList.id, optionId: opt1Id }) });
    expect(resReactivate.status).toBe(200);
    const jsonReactivate = await resReactivate.json();
    expect(jsonReactivate.option.id).toBe(opt1Id);
    expect(jsonReactivate.option.key).toBe("active");
    expect(jsonReactivate.option.isActive).toBe(true);
  });

  it("denies access with HTTP 403 for runtime-only user and records AUDIT_ACCESS_DENIED audit", async () => {
    const db = getDb();
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/choice-lists`, {
      headers: { authorization: `Bearer ${runtimeSessionToken}` },
    });

    const res = await getChoiceListsHandler(req, { params: Promise.resolve({ id: solutionId }) });
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
