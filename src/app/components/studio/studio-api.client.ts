export interface ApiErrorResponse {
  status: number;
  code?: string;
  message: string;
  details?: any;
}

export class StudioApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = "StudioApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorPayload = json.error || json;
    const message =
      typeof errorPayload === "string"
        ? errorPayload
        : errorPayload.message || json.message || "An unexpected error occurred.";
    const code = errorPayload.code || json.code || (res.status === 409 ? "REVISION_CONFLICT" : "ERROR");
    const details = errorPayload.details || json.details;

    throw new StudioApiError(res.status, message, code, details);
  }

  return json as T;
}

// --- Solution API ---
export function apiFetchSolutions() {
  return request<{ solutions: any[] }>("/api/studio/solutions");
}

export function apiCreateSolutionMain(payload: { name: string; description?: string | null; prefix?: string; solutionPrefix?: string }) {
  return request<{ solution: any }>("/api/studio/solutions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiFetchSolution(solutionId: string) {
  return request<{ solution: any }>(`/api/studio/solutions/${solutionId}`);
}

// --- Queue API ---
export interface SolutionQueue {
  id: string;
  solutionId: string;
  queueKey: string;
  name: string;
  description: string | null;
  assignedUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueAssignedUser {
  id: string;
  fullName: string;
  email: string;
  assignedAt: string;
}

export interface EligibleUser {
  id: string;
  fullName: string;
  email: string;
}

export function apiFetchQueues(solutionId: string) {
  return request<{ queues: SolutionQueue[] }>(`/api/studio/solutions/${solutionId}/queues`);
}

export function apiFetchQueueDetails(solutionId: string, queueId: string) {
  return request<{ queue: SolutionQueue; assignedUsers: QueueAssignedUser[] }>(
    `/api/studio/solutions/${solutionId}/queues/${queueId}`
  );
}

export function apiFetchEligibleUsers(solutionId: string) {
  return request<{ users: EligibleUser[] }>(`/api/studio/solutions/${solutionId}/queues/users`);
}

export function apiCreateQueue(
  solutionId: string,
  payload: { name: string; description?: string | null; expectedRevision: number }
) {
  return request<{ queue: SolutionQueue; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/queues`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function apiUpdateQueue(
  solutionId: string,
  queueId: string,
  payload: { name?: string; description?: string | null; expectedRevision: number }
) {
  return request<{ queue: SolutionQueue; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/queues/${queueId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function apiDeleteQueue(solutionId: string, queueId: string, expectedRevision: number) {
  return request<{ solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/queues/${queueId}?expectedRevision=${expectedRevision}`,
    {
      method: "DELETE",
    }
  );
}

export function apiSetQueueUsers(
  solutionId: string,
  queueId: string,
  payload: { userIds: string[]; expectedRevision: number }
) {
  return request<{ assignedUsers: QueueAssignedUser[]; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/queues/${queueId}/users`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function apiUpdateSolution(solutionId: string, payload: { name?: string; description?: string | null; expectedRevision: number }) {
  return request<{ solution: any }>(`/api/studio/solutions/${solutionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// --- Properties API ---
export function apiFetchProperties(solutionId: string) {
  return request<{ properties: any[] }>(`/api/studio/solutions/${solutionId}/properties`);
}

export function apiCreateProperty(solutionId: string, payload: any) {
  return request<{ property: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/properties`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiUpdateProperty(solutionId: string, propertyId: string, payload: any) {
  return request<{ property: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/properties/${propertyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiDeleteProperty(solutionId: string, propertyId: string, expectedRevision: number) {
  return request<{ deletedPropertyId: string; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/properties/${propertyId}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision }),
  });
}

// --- Validation Rules & Test API ---
export function apiFetchRegexPresets() {
  return request<{ presets: any[] }>(`/api/studio/property-validation/regex-presets`);
}

export function apiTestValidation(solutionId: string, payload: any) {
  return request<{ isValid: boolean; normalizedRules: any; errors: any[] }>(`/api/studio/solutions/${solutionId}/properties/validation-test`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Choice Lists API ---
export function apiFetchChoiceLists(solutionId: string) {
  return request<{ choiceLists: any[] }>(`/api/studio/solutions/${solutionId}/choice-lists`);
}

export function apiCreateChoiceList(
  solutionId: string,
  payload: { expectedRevision: number; key: string; name: string; description?: string | null }
) {
  return request<{ choiceList: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function apiUpdateChoiceList(
  solutionId: string,
  choiceListId: string,
  payload: { expectedRevision?: number; name?: string; description?: string | null }
) {
  return request<{ choiceList: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function apiDeleteChoiceList(
  solutionId: string,
  choiceListId: string,
  expectedRevision: number
) {
  return request<{ success: boolean; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}?expectedRevision=${expectedRevision}`,
    {
      method: "DELETE",
    }
  );
}

// --- Choice Options API ---
export function apiFetchChoiceOptions(solutionId: string, choiceListId: string) {
  return request<{ choiceOptions: any[] }>(`/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options`);
}

export function apiCreateChoiceOption(
  solutionId: string,
  choiceListId: string,
  payload: { expectedRevision?: number; key: string; label: string }
) {
  return request<{ choiceOption: any; solutionRevision?: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function apiUpdateChoiceOptionLabel(
  solutionId: string,
  choiceListId: string,
  optionId: string,
  payload: { expectedRevision: number; label: string }
) {
  return request<{ choiceOption: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options/${optionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function apiDeactivateChoiceOption(
  solutionId: string,
  choiceListId: string,
  optionId: string,
  payload: { expectedRevision: number }
) {
  return request<{ choiceOption: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options/${optionId}/deactivate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function apiReactivateChoiceOption(
  solutionId: string,
  choiceListId: string,
  optionId: string,
  payload: { expectedRevision: number }
) {
  return request<{ choiceOption: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options/${optionId}/reactivate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function apiReorderChoiceOptions(
  solutionId: string,
  choiceListId: string,
  payload: { expectedRevision: number; optionIds: string[] }
) {
  return request<{ options: any[]; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/choice-lists/${choiceListId}/options/reorder`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

// --- Form Aggregate API ---
export async function apiFetchForms(solutionId: string) {
  return request<{ forms: any[]; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/forms`
  );
}

export async function apiFetchForm(solutionId: string, formId?: string) {
  const url = formId
    ? `/api/studio/solutions/${solutionId}/forms/${formId}`
    : `/api/studio/solutions/${solutionId}/form`;
  const res = await request<{ formAggregate: { form: any; tabs: any[]; sections: any[]; fields: any[] }; solutionRevision: number }>(
    url
  );
  return res.formAggregate;
}

export async function apiSaveFormAggregate(
  solutionId: string,
  formId: string,
  payload: {
    expectedRevision: number;
    tabs: any[];
    sections: any[];
    fields: any[];
    queueRules?: any[];
  }
) {
  return request<{ formAggregate: any; solutionRevision: number }>(
    `/api/studio/solutions/${solutionId}/forms/${formId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

// --- Form Tabs API ---
export function apiCreateTab(solutionId: string, formId: string, payload: { title: string; expectedRevision: number }) {
  return request<{ tab: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/tabs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiUpdateTab(solutionId: string, formId: string, tabId: string, payload: { title?: string; expectedRevision: number }) {
  return request<{ tab: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/tabs/${tabId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiDeleteTab(solutionId: string, formId: string, tabId: string, expectedRevision: number) {
  return request<{ deletedTabId: string; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/tabs/${tabId}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision }),
  });
}

export function apiReorderTabs(solutionId: string, formId: string, payload: { tabIds: string[]; expectedRevision: number }) {
  return request<{ tabs: any[]; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/tabs/reorder`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Form Sections API ---
export function apiCreateSection(solutionId: string, formId: string, tabId: string, payload: { title: string; expectedRevision: number }) {
  return request<{ section: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/tabs/${tabId}/sections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiUpdateSection(solutionId: string, formId: string, sectionId: string, payload: { title?: string; expectedRevision: number }) {
  return request<{ section: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiDeleteSection(solutionId: string, formId: string, sectionId: string, expectedRevision: number) {
  return request<{ deletedSectionId: string; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/sections/${sectionId}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision }),
  });
}

export function apiMoveSection(solutionId: string, formId: string, sectionId: string, payload: { targetTabId: string; displayOrder?: number; expectedRevision: number }) {
  return request<{ section: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/sections/${sectionId}/move`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiReorderSections(solutionId: string, formId: string, payload: { tabId: string; sectionIds: string[]; expectedRevision: number }) {
  return request<{ sections: any[]; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/sections/reorder`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Form Fields API ---
export function apiAddFieldReference(solutionId: string, formId: string, sectionId: string, payload: { propertyId: string; controlType?: string; isRequired?: boolean; isVisible?: boolean; isEnabled?: boolean; isEditable?: boolean; expectedRevision: number }) {
  return request<{ fieldReference: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/sections/${sectionId}/fields`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiUpdateFieldReference(solutionId: string, formId: string, fieldReferenceId: string, payload: { controlType?: string; isRequired?: boolean; isVisible?: boolean; isEnabled?: boolean; isEditable?: boolean; expectedRevision: number }) {
  return request<{ fieldReference: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/fields/${fieldReferenceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiDeleteFieldReference(solutionId: string, formId: string, fieldReferenceId: string, expectedRevision: number) {
  return request<{ deletedFieldReferenceId: string; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/fields/${fieldReferenceId}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision }),
  });
}

export function apiMoveFieldReference(solutionId: string, formId: string, fieldReferenceId: string, payload: { targetSectionId: string; displayOrder?: number; expectedRevision: number }) {
  return request<{ fieldReference: any; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/fields/${fieldReferenceId}/move`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiReorderFieldReferences(solutionId: string, formId: string, payload: { sectionId: string; fieldReferenceIds: string[]; expectedRevision: number }) {
  return request<{ fieldReferences: any[]; solutionRevision: number }>(`/api/studio/solutions/${solutionId}/forms/${formId}/fields/reorder`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
