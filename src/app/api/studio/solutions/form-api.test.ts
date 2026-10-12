import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "@/infrastructure/db/client";
import { auditEvents, platformRoles } from "@/infrastructure/db/schema";
import { solutionService, formService, solutionPropertyService } from "@/modules/solution/index";
import { adminService } from "@/modules/organisation/index";
import { authService, PLATFORM_ROLES } from "@/modules/auth/index";
import { eq, and } from "drizzle-orm";
import { GET as getFormsHandler } from "./[id]/forms/route";
import { GET as getFormByIdHandler, PUT as putFormByIdHandler } from "./[id]/forms/[formId]/route";
import { POST as postSectionsHandler } from "./[id]/forms/[formId]/tabs/[tabId]/sections/route";
import { POST as postFieldsHandler } from "./[id]/forms/[formId]/sections/[sectionId]/fields/route";
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

  it("GET /api/studio/solutions/[id]/forms returns both system forms (ADD_CASE and CASE_VIEW)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const res = await getFormsHandler(req, { params: Promise.resolve({ id: solutionId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.forms).toHaveLength(2);
    expect(json.forms.map((f: any) => f.formType)).toEqual(["ADD_CASE", "CASE_VIEW"]);
    expect(json.forms.map((f: any) => f.formKey)).toEqual(["add_case", "case_view"]);
    expect(json.solutionRevision).toBe(1);
  });

  it("GET /api/studio/solutions/[id]/forms/[formId] returns canonical form aggregate", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { forms } = await formService.listForms(solutionId, desLogin);
    const targetForm = forms[0];

    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${targetForm.id}`, {
      headers: { authorization: `Bearer ${designerSessionToken}` },
    });

    const res = await getFormByIdHandler(req, { params: Promise.resolve({ id: solutionId, formId: targetForm.id }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.formAggregate.form.id).toBe(targetForm.id);
    expect(json.formAggregate.tabs).toHaveLength(1);
    expect(json.formAggregate.tabs[0].title).toBe("Default Tab");
    expect(json.formAggregate.sections).toHaveLength(0);
    expect(json.solutionRevision).toBe(1);
  });

  it("Tab, Section, and Field creation via form-scoped routes", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { forms } = await formService.listForms(solutionId, desLogin);
    const addCaseForm = forms.find((f: any) => f.formType === "ADD_CASE")!;

    const { formAggregate } = await formService.getFormAggregate(solutionId, addCaseForm.id, desLogin);
    const defaultTabId = formAggregate.tabs[0].id;

    // 1. Create Section inside defaultTab via form-scoped route
    const postSecReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${addCaseForm.id}/tabs/${defaultTabId}/sections`, {
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
    const resSec = await postSectionsHandler(postSecReq, { params: Promise.resolve({ id: solutionId, formId: addCaseForm.id, tabId: defaultTabId }) });
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

    // 3. Add Field Reference to Section via form-scoped route
    const postFieldReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${addCaseForm.id}/sections/${sectionId}/fields`, {
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
    const resField = await postFieldsHandler(postFieldReq, { params: Promise.resolve({ id: solutionId, formId: addCaseForm.id, sectionId }) });
    expect(resField.status).toBe(201);
    const jsonField = await resField.json();
    expect(jsonField.fieldReference.controlType).toBe("TEXT_INPUT");
    expect(jsonField.solutionRevision).toBe(4);
  });

  it("denies access with HTTP 403 for runtime-only user on forms routes", async () => {
    const db = getDb();
    const req = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms`, {
      headers: { authorization: `Bearer ${runtimeSessionToken}` },
    });

    const res = await getFormsHandler(req, { params: Promise.resolve({ id: solutionId }) });
    expect(res.status).toBe(403);

    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.actorUserId, runtimeUserId), eq(auditEvents.eventType, "AUDIT_ACCESS_DENIED")))
      .limit(1);

    expect(audit).toBeDefined();
  });

  it("PUT /api/studio/solutions/[id]/forms/[formId] saves entire draft aggregate in one transaction", async () => {
    const db = getDb();
    const desLogin = await authService.validateSession(designerSessionToken);
    const { forms } = await formService.listForms(solutionId, desLogin);
    const addCaseForm = forms.find((f: any) => f.formType === "ADD_CASE")!;

    // Create 2 properties
    const { property: prop1 } = await solutionPropertyService.createProperty(
      solutionId,
      { expectedRevision: 1, label: "First Name", localSymbolicName: "first_name", storedDataType: "TEXT" },
      desLogin
    );
    const { property: prop2 } = await solutionPropertyService.createProperty(
      solutionId,
      { expectedRevision: 2, label: "Last Name", localSymbolicName: "last_name", storedDataType: "TEXT" },
      desLogin
    );

    // Prepare a whole-form draft aggregate with 2 tabs, 2 sections, and 2 fields
    const draft = {
      expectedRevision: 3,
      tabs: [
        { id: "temp-tab-1", title: "Personal Info" },
        { id: "temp-tab-2", title: "Details" },
      ],
      sections: [
        { id: "temp-sec-1", tabId: "temp-tab-1", title: "Name Details" },
        { id: "temp-sec-2", tabId: "temp-tab-2", title: "Notes" },
      ],
      fields: [
        { id: "temp-f-1", sectionId: "temp-sec-1", propertyId: prop1.id, controlType: "TEXT_INPUT", isRequired: true },
        { id: "temp-f-2", sectionId: "temp-sec-1", propertyId: prop2.id, controlType: "TEXT_INPUT", isRequired: false },
      ],
    };

    const putReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${addCaseForm.id}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(draft),
    });

    const res = await putFormByIdHandler(putReq, { params: Promise.resolve({ id: solutionId, formId: addCaseForm.id }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.solutionRevision).toBe(4);
    expect(json.formAggregate.tabs).toHaveLength(2);
    expect(json.formAggregate.tabs[0].title).toBe("Personal Info");
    expect(json.formAggregate.tabs[1].title).toBe("Details");
    expect(json.formAggregate.sections).toHaveLength(2);
    expect(json.formAggregate.fields).toHaveLength(2);
    expect(json.formAggregate.fields[0].isRequired).toBe(true);

    // Verify exactly one FORM_LAYOUT_SAVED audit event was logged
    const audits = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.actorUserId, designerUserId), eq(auditEvents.eventType, "FORM_LAYOUT_SAVED")));
    expect(audits.length).toBeGreaterThanOrEqual(1);
    const lastAudit = audits[audits.length - 1];
    expect(lastAudit.metadata).toMatchObject({
      formId: addCaseForm.id,
      formType: "ADD_CASE",
    });
  });

  it("PUT /api/studio/solutions/[id]/forms/[formId] rejects revision conflict (HTTP 409)", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { forms } = await formService.listForms(solutionId, desLogin);
    const addCaseForm = forms.find((f: any) => f.formType === "ADD_CASE")!;

    const putReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${addCaseForm.id}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 999, // stale revision
        tabs: [{ id: "temp-tab-1", title: "Tab 1" }],
        sections: [],
        fields: [],
      }),
    });

    const res = await putFormByIdHandler(putReq, { params: Promise.resolve({ id: solutionId, formId: addCaseForm.id }) });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("CONFLICT");
  });

  it("PUT /api/studio/solutions/[id]/forms/[formId] strictly validates ownership and scoping", async () => {
    const desLogin = await authService.validateSession(designerSessionToken);
    const { forms } = await formService.listForms(solutionId, desLogin);
    const addCaseForm = forms.find((f: any) => f.formType === "ADD_CASE")!;

    // Case 1: Unowned fake property ID
    const fakePropReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${addCaseForm.id}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        tabs: [{ id: "temp-tab-1", title: "Tab 1" }],
        sections: [{ id: "temp-sec-1", tabId: "temp-tab-1", title: "Sec 1" }],
        fields: [{ id: "temp-f-1", sectionId: "temp-sec-1", propertyId: "00000000-0000-0000-0000-000000000000", controlType: "TEXT_INPUT", isRequired: false }],
      }),
    });
    const resFakeProp = await putFormByIdHandler(fakePropReq, { params: Promise.resolve({ id: solutionId, formId: addCaseForm.id }) });
    expect(resFakeProp.status).toBe(400);

    // Case 2: Invariant check: Case View Form cannot have mandatory fields
    const caseViewForm = forms.find((f: any) => f.formType === "CASE_VIEW")!;
    const { property: prop } = await solutionPropertyService.createProperty(
      solutionId,
      { expectedRevision: 1, label: "Subject", localSymbolicName: "subject", storedDataType: "TEXT" },
      desLogin
    );

    const caseViewMandatoryReq = new NextRequest(`http://localhost:3000/api/studio/solutions/${solutionId}/forms/${caseViewForm.id}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${designerSessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        tabs: [{ id: "temp-tab-1", title: "Tab 1" }],
        sections: [{ id: "temp-sec-1", tabId: "temp-tab-1", title: "Sec 1" }],
        fields: [{ id: "temp-f-1", sectionId: "temp-sec-1", propertyId: prop.id, controlType: "TEXT_INPUT", isRequired: true }],
      }),
    });
    const resCaseView = await putFormByIdHandler(caseViewMandatoryReq, { params: Promise.resolve({ id: solutionId, formId: caseViewForm.id }) });
    expect(resCaseView.status).toBe(400);
    const jsonCaseView = await resCaseView.json();
    expect(jsonCaseView.message || jsonCaseView.error).toContain("Case View Form");
  });
});

