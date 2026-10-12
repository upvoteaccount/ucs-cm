import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { GET as getQueues, POST as createQueue } from "./[id]/queues/route";
import { GET as getQueueDetails, DELETE as deleteQueue } from "./[id]/queues/[queueId]/route";
import { PUT as setQueueUsers } from "./[id]/queues/[queueId]/users/route";
import { adminService } from "@/modules/organisation";
import { authService, PLATFORM_ROLES, SessionContext } from "@/modules/auth";
import { solutionService } from "@/modules/solution";
import { getDb } from "@/infrastructure/db/client";
import { platformRoles } from "@/infrastructure/db/schema";
import { NextRequest } from "next/server";

describe("INC-04A Work Queues API Endpoints Test Suite", () => {
  let designerSessionToken: string;
  let designerContext: SessionContext;
  let runtimeUserSessionToken: string;
  let solutionId: string;
  let solutionRevision: number;

  let userA1: { id: string; email: string };

  beforeAll(async () => {
    const db = getDb();
    await db.insert(platformRoles).values([
      { key: PLATFORM_ROLES.PLATFORM_ADMIN, name: "Admin" },
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime User" },
    ]).onConflictDoNothing();
  });

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);

    const org = await adminService.createOrganisation(`queue-api-org-${suffix}`, "Queue API Org");

    // Designer User
    const des = await adminService.createUser(`apidesigner-${suffix}@test.com`, "Password123!", "API Designer");
    const memDes = await adminService.createMembership(org.id, des.id);
    await adminService.assignPlatformRole(memDes.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const desLogin = await authService.login(des.email, "Password123!", org.key);
    designerSessionToken = desLogin.sessionToken;
    designerContext = desLogin.context;

    // Runtime User
    const runUser = await adminService.createUser(`apiruntime-${suffix}@test.com`, "Password123!", "API Runtime");
    const memRun = await adminService.createMembership(org.id, runUser.id);
    await adminService.assignPlatformRole(memRun.id, PLATFORM_ROLES.RUNTIME_USER);

    const runLogin = await authService.login(runUser.email, "Password123!", org.key);
    runtimeUserSessionToken = runLogin.sessionToken;

    // Member User
    const u1 = await adminService.createUser(`apiuser1-${suffix}@test.com`, "Password123!", "API User 1");
    await adminService.createMembership(org.id, u1.id);
    userA1 = { id: u1.id, email: u1.email };

    // Create Solution
    const sol = await solutionService.createSolution(
      { name: "API Solution", solutionPrefix: `APIS${suffix.toUpperCase()}`.slice(0, 10) },
      designerContext
    );
    solutionId = sol.id;
    solutionRevision = sol.revision;
  });

  function createRequest(url: string, method: string, token: string, body?: any): NextRequest {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
    };
    if (body) {
      headers["content-type"] = "application/json";
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it("denies access to runtime-only user with HTTP 403 Forbidden", async () => {
    const req = createRequest(`/api/studio/solutions/${solutionId}/queues`, "GET", runtimeUserSessionToken);
    const params = Promise.resolve({ id: solutionId });
    const res = await getQueues(req, { params });
    expect(res.status).toBe(403);
  });

  it("lists queues and creates queue via POST endpoint", async () => {
    // POST Create
    const createReq = createRequest(
      `/api/studio/solutions/${solutionId}/queues`,
      "POST",
      designerSessionToken,
      {
        name: "SOL Maker",
        description: "Initial maker queue",
        expectedRevision: solutionRevision,
      }
    );
    const createRes = await createQueue(createReq, { params: Promise.resolve({ id: solutionId }) });
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.queue.name).toBe("SOL Maker");
    expect(createBody.queue.queueKey).toMatch(/^[A-Z0-9]+_SOL_MAKER$/);
    const queueId = createBody.queue.id;
    const newRev = createBody.solutionRevision;

    // GET List
    const listReq = createRequest(`/api/studio/solutions/${solutionId}/queues`, "GET", designerSessionToken);
    const listRes = await getQueues(listReq, { params: Promise.resolve({ id: solutionId }) });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.queues).toHaveLength(1);
    expect(listBody.queues[0].queueKey).toMatch(/^[A-Z0-9]+_SOL_MAKER$/);

    // PUT Set Users
    const setUsersReq = createRequest(
      `/api/studio/solutions/${solutionId}/queues/${queueId}/users`,
      "PUT",
      designerSessionToken,
      {
        userIds: [userA1.id],
        expectedRevision: newRev,
      }
    );
    const setUsersRes = await setQueueUsers(setUsersReq, { params: Promise.resolve({ id: solutionId, queueId }) });
    expect(setUsersRes.status).toBe(200);
    const setUsersBody = await setUsersRes.json();
    expect(setUsersBody.assignedUsers).toHaveLength(1);
    const revAfterUsers = setUsersBody.solutionRevision;

    // GET Details
    const detailsReq = createRequest(
      `/api/studio/solutions/${solutionId}/queues/${queueId}`,
      "GET",
      designerSessionToken
    );
    const detailsRes = await getQueueDetails(detailsReq, { params: Promise.resolve({ id: solutionId, queueId }) });
    expect(detailsRes.status).toBe(200);
    const detailsBody = await detailsRes.json();
    expect(detailsBody.queue.name).toBe("SOL Maker");
    expect(detailsBody.assignedUsers).toHaveLength(1);

    // DELETE Queue
    const delReq = createRequest(
      `/api/studio/solutions/${solutionId}/queues/${queueId}?expectedRevision=${revAfterUsers}`,
      "DELETE",
      designerSessionToken
    );
    const delRes = await deleteQueue(delReq, { params: Promise.resolve({ id: solutionId, queueId }) });
    expect(delRes.status).toBe(200);
  });
});
