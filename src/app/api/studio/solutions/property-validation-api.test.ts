import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import { auditEvents } from "@/infrastructure/db/schema";
import { solutionService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getPresetsHandler } from "../property-validation/regex-presets/route";
import { POST as postValidationTestHandler } from "./[id]/properties/validation-test/route";
import { NextRequest } from "next/server";

describe("INC-03C6 Property Validation APIs Integration Test Suite", () => {
  let orgAId: string;
  let orgAKey: string;
  let designerUserId: string;
  let designerEmail: string;
  let designerSessionToken: string;
  let runtimeSessionToken: string;
  let solutionA: any;

  beforeAll(async () => {
    const db = getDb();
    await db.insert((await import("@/infrastructure/db/schema")).platformRoles).values([
      { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Designer" },
      { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime" },
    ]).onConflictDoNothing();

    const ts = Date.now();
    const orgA = await adminService.createOrganisation(`c6_api_a_${ts}`, "C6 API Org A");
    await adminService.createOrganisation(`c6_api_b_${ts}`, "C6 API Org B");
    orgAId = orgA.id;
    orgAKey = orgA.key;

    // Designer user in Org A
    designerEmail = `c6_api_designer_${ts}@example.com`;
    const designer = await adminService.createUser(
      designerEmail,
      "Password123!",
      "C6 API Designer"
    );
    designerUserId = designer.id;

    const memDes = await adminService.createMembership(orgAId, designerUserId);
    await adminService.assignPlatformRole(memDes.id, PLATFORM_ROLES.SOLUTION_DESIGNER);

    const desLogin = await authService.login(designerEmail, "Password123!", orgA.key);
    designerSessionToken = desLogin.sessionToken;

    // Runtime user in Org A
    const runtimeEmail = `c6_api_runtime_${ts}@example.com`;
    const runtime = await adminService.createUser(
      runtimeEmail,
      "Password123!",
      "C6 API Runtime"
    );

    const memRun = await adminService.createMembership(orgAId, runtime.id);
    await adminService.assignPlatformRole(memRun.id, PLATFORM_ROLES.RUNTIME_USER);

    const runLogin = await authService.login(runtimeEmail, "Password123!", orgA.key);
    runtimeSessionToken = runLogin.sessionToken;
  });

  let solutionApiCounter = 100;

  beforeEach(async () => {
    solutionApiCounter++;
    const prefix = `PA${solutionApiCounter}`;
    const designerContext = {
      user: { id: designerUserId, email: designerEmail, fullName: "C6 API Designer" },
      activeOrganisation: { id: orgAId, name: "C6 API Org A", key: orgAKey },
      membership: { id: designerUserId, roles: [PLATFORM_ROLES.SOLUTION_DESIGNER] },
    };
    solutionA = await solutionService.createSolution(
      { solutionPrefix: prefix, name: "C6 API Solution" },
      designerContext
    );
  });

  // --- 1. GET /api/studio/property-validation/regex-presets ---
  describe("GET /api/studio/property-validation/regex-presets", () => {
    it("returns public regex presets catalogue without internal patterns for authorized designer", async () => {
      const req = new NextRequest("http://localhost/api/studio/property-validation/regex-presets", {
        headers: { authorization: `Bearer ${designerSessionToken}` },
      });

      const res = await getPresetsHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.presets).toBeDefined();
      expect(Array.isArray(json.presets)).toBe(true);
      expect(json.presets.length).toBeGreaterThan(0);

      for (const p of json.presets) {
        expect(p.key).toBeDefined();
        expect(p.label).toBeDefined();
        expect(p.description).toBeDefined();
        expect(p.pattern).toBeUndefined(); // Pattern MUST NOT be exposed
      }
    });

    it("denies access with HTTP 403 for runtime-only user and records AUDIT_ACCESS_DENIED audit", async () => {
      const db = getDb();
      const req = new NextRequest("http://localhost/api/studio/property-validation/regex-presets", {
        headers: { authorization: `Bearer ${runtimeSessionToken}` },
      });

      const res = await getPresetsHandler(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");

      // Verify AUDIT_ACCESS_DENIED audit event
      const [audit] = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, "AUDIT_ACCESS_DENIED")
          )
        )
        .limit(1);

      expect(audit).toBeDefined();
    });

    it("denies unauthenticated access with HTTP 401", async () => {
      const req = new NextRequest("http://localhost/api/studio/property-validation/regex-presets");
      const res = await getPresetsHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  // --- 2. POST /api/studio/solutions/[id]/properties/validation-test ---
  describe("POST /api/studio/solutions/[id]/properties/validation-test", () => {
    it("returns isValid: true for matching sample and normalized rules without mutation", async () => {
      const db = getDb();
      const [solBefore] = await db
        .select()
        .from((await import("@/infrastructure/db/schema")).solutions)
        .where(eq((await import("@/infrastructure/db/schema")).solutions.id, solutionA.id));

      const initialPropCount = (
        await db
          .select()
          .from((await import("@/infrastructure/db/schema")).solutionProperties)
          .where(eq((await import("@/infrastructure/db/schema")).solutionProperties.solutionId, solutionA.id))
      ).length;

      const req = new NextRequest(`http://localhost/api/studio/solutions/${solutionA.id}/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "TEXT",
          formatPreset: "NONE",
          validationRules: {
            minLength: 3,
            maxLength: 20,
            regexPreset: "ALPHANUMERIC",
          },
          sampleValue: "VALID123",
        }),
      });

      const res = await postValidationTestHandler(req, { params: Promise.resolve({ id: solutionA.id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.isValid).toBe(true);
      expect(json.errors.length).toBe(0);
      expect(json.normalizedRules).toEqual({
        minLength: 3,
        maxLength: 20,
        regexPreset: "ALPHANUMERIC",
      });

      // Confirm non-mutating behavior strictly:
      // 1. Solution revision remained unchanged
      // 2. Solution updatedAt remained unchanged
      // 3. Zero properties created or updated
      // 4. Zero PROPERTY_CREATED or PROPERTY_UPDATED audit events
      const [solAfter] = await db
        .select()
        .from((await import("@/infrastructure/db/schema")).solutions)
        .where(eq((await import("@/infrastructure/db/schema")).solutions.id, solutionA.id));
      expect(solAfter.revision).toBe(solBefore.revision);
      expect(solAfter.updatedAt.getTime()).toBe(solBefore.updatedAt.getTime());

      const finalPropCount = (
        await db
          .select()
          .from((await import("@/infrastructure/db/schema")).solutionProperties)
          .where(eq((await import("@/infrastructure/db/schema")).solutionProperties.solutionId, solutionA.id))
      ).length;
      expect(finalPropCount).toBe(initialPropCount);

      const auditCheck = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.organisationId, orgAId),
            eq(auditEvents.entityId, solutionA.id)
          )
        );
      expect(auditCheck.some((a) => a.eventType === "PROPERTY_CREATED" || a.eventType === "PROPERTY_UPDATED")).toBe(false);
    });

    it("returns HTTP 400 for unknown preset key", async () => {
      const req = new NextRequest(`http://localhost/api/studio/solutions/${solutionA.id}/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "TEXT",
          validationRules: {
            regexPreset: "INVALID_UNKNOWN_PRESET",
          },
          sampleValue: "test",
        }),
      });

      const res = await postValidationTestHandler(req, { params: Promise.resolve({ id: solutionA.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns isValid: false and structured errors for mismatching sample", async () => {
      const req = new NextRequest(`http://localhost/api/studio/solutions/${solutionA.id}/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "NUMBER",
          validationRules: {
            minimumValue: 10,
            maximumValue: 50,
          },
          sampleValue: 100,
        }),
      });

      const res = await postValidationTestHandler(req, { params: Promise.resolve({ id: solutionA.id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.isValid).toBe(false);
      expect(json.errors.length).toBe(1);
      expect(json.errors[0].code).toBe("MAX_VALUE");
    });

    it("returns HTTP 400 for malformed or unsafe validation rules", async () => {
      const req = new NextRequest(`http://localhost/api/studio/solutions/${solutionA.id}/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "TEXT",
          validationRules: {
            customRegex: { pattern: "(a+)+$" }, // Catastrophic backtracking ReDoS pattern
          },
          sampleValue: "aaaaa",
        }),
      });

      const res = await postValidationTestHandler(req, { params: Promise.resolve({ id: solutionA.id }) });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("rejects client-supplied forbidden fields with HTTP 400", async () => {
      const req = new NextRequest(`http://localhost/api/studio/solutions/${solutionA.id}/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "TEXT",
          expectedRevision: 1, // Forbidden field
          sampleValue: "test",
        }),
      });

      const res = await postValidationTestHandler(req, { params: Promise.resolve({ id: solutionA.id }) });
      expect(res.status).toBe(400);
    });

    it("returns HTTP 404 for missing or foreign Solution ID", async () => {
      const req = new NextRequest(`http://localhost/api/studio/solutions/00000000-0000-0000-0000-000000000000/properties/validation-test`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${designerSessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storedDataType: "TEXT",
          sampleValue: "test",
        }),
      });

      const res = await postValidationTestHandler(req, {
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
