import { describe, it, expect } from "vitest";
import { isFormAggregateDirty, FormAggregateComparable, FormDraftComparable } from "./form-dirty";

describe("isFormAggregateDirty pure canonical comparison specification", () => {
  const baseAggregate: FormAggregateComparable = {
    form: {
      id: "form-1",
      formKey: "add_case",
      formType: "ADD_CASE",
      name: "Add Case Form",
    },
    tabs: [
      { id: "tab-1", tabKey: "tab_1", title: "General", displayOrder: 1 },
      { id: "tab-2", tabKey: "tab_2", title: "Details", displayOrder: 2 },
    ],
    sections: [
      { id: "sec-1", tabId: "tab-1", sectionKey: "sec_1", title: "Customer Info", displayOrder: 1 },
      { id: "sec-2", tabId: "tab-2", sectionKey: "sec_2", title: "Additional Info", displayOrder: 1 },
    ],
    fields: [
      {
        id: "field-1",
        sectionId: "sec-1",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        isRequired: false,
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        displayOrder: 1,
      },
      {
        id: "field-2",
        sectionId: "sec-1",
        propertyId: "prop-2",
        controlType: "EMAIL_INPUT",
        isRequired: false,
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        displayOrder: 2,
      },
    ],
  };

  const createDraft = (): FormDraftComparable => ({
    tabs: [
      { id: "tab-1", title: "General", displayOrder: 1 },
      { id: "tab-2", title: "Details", displayOrder: 2 },
    ],
    sections: [
      { id: "sec-1", tabId: "tab-1", title: "Customer Info", displayOrder: 1 },
      { id: "sec-2", tabId: "tab-2", title: "Additional Info", displayOrder: 1 },
    ],
    fields: [
      {
        id: "field-1",
        sectionId: "sec-1",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        isRequired: false,
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        displayOrder: 1,
      },
      {
        id: "field-2",
        sectionId: "sec-1",
        propertyId: "prop-2",
        controlType: "EMAIL_INPUT",
        isRequired: false,
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        displayOrder: 2,
      },
    ],
  });

  it("evaluates clean when draft matches persisted baseline exactly", () => {
    expect(isFormAggregateDirty(baseAggregate, createDraft())).toBe(false);
  });

  it("evaluates clean when both persisted or draft are null/undefined", () => {
    expect(isFormAggregateDirty(null, null)).toBe(false);
    expect(isFormAggregateDirty(undefined, createDraft())).toBe(false);
    expect(isFormAggregateDirty(baseAggregate, null)).toBe(false);
  });

  // 1. add Tab -> delete same Tab -> clean
  it("add Tab -> delete same Tab -> returns to clean", () => {
    const draft = createDraft();
    const newTabId = "client-tab-new";
    draft.tabs.push({ id: newTabId, title: "Unsaved Tab", displayOrder: 3 });
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    // Delete that same unsaved Tab
    draft.tabs = draft.tabs.filter((t) => t.id !== newTabId);
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 2. rename Tab -> rename back -> clean
  it("rename Tab -> rename back -> returns to clean", () => {
    const draft = createDraft();
    draft.tabs[0].title = "General Updated";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.tabs[0].title = "General";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);

    // Whitespace trimming normalization
    draft.tabs[0].title = "  General  ";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 3. reorder Tabs -> restore original order -> clean
  it("reorder Tabs -> restore original order -> returns to clean", () => {
    const draft = createDraft();
    // Swap tab orders
    draft.tabs = [
      { ...draft.tabs[1], displayOrder: 1 },
      { ...draft.tabs[0], displayOrder: 2 },
    ];
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    // Restore original order
    draft.tabs = [
      { ...draft.tabs[1], displayOrder: 1 },
      { ...draft.tabs[0], displayOrder: 2 },
    ];
    // Re-index cleanly
    draft.tabs = [
      { id: "tab-1", title: "General", displayOrder: 1 },
      { id: "tab-2", title: "Details", displayOrder: 2 },
    ];
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 4. add Section -> delete same Section -> clean
  it("add Section -> delete same Section -> returns to clean", () => {
    const draft = createDraft();
    const newSecId = "client-sec-new";
    draft.sections.push({ id: newSecId, tabId: "tab-1", title: "New Unsaved Section", displayOrder: 2 });
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.sections = draft.sections.filter((s) => s.id !== newSecId);
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 5. rename Section -> rename back -> clean
  it("rename Section -> rename back -> returns to clean", () => {
    const draft = createDraft();
    draft.sections[0].title = "Customer Info Renamed";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.sections[0].title = "Customer Info";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 6. move Section -> move back -> clean
  it("move Section -> move back -> returns to clean", () => {
    const draft = createDraft();
    // Move sec-1 from tab-1 to tab-2
    draft.sections[0].tabId = "tab-2";
    draft.sections[0].displayOrder = 2;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    // Move sec-1 back to tab-1
    draft.sections[0].tabId = "tab-1";
    draft.sections[0].displayOrder = 1;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 7. add Field -> remove same Field -> clean
  it("add Field -> remove same Field -> returns to clean", () => {
    const draft = createDraft();
    const newFieldId = "client-field-new";
    draft.fields.push({
      id: newFieldId,
      sectionId: "sec-1",
      propertyId: "prop-3",
      controlType: "TEXT_INPUT",
      isRequired: false,
      displayOrder: 3,
    });
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.fields = draft.fields.filter((f) => f.id !== newFieldId);
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 8. move Field -> move back -> clean
  it("move Field -> move back -> returns to clean", () => {
    const draft = createDraft();
    // Move field-1 to sec-2
    draft.fields[0].sectionId = "sec-2";
    draft.fields[0].displayOrder = 1;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    // Move field-1 back to sec-1
    draft.fields[0].sectionId = "sec-1";
    draft.fields[0].displayOrder = 1;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 9. reorder Field -> restore original position -> clean
  it("reorder Field -> restore original position -> returns to clean", () => {
    const draft = createDraft();
    draft.fields[0].displayOrder = 2;
    draft.fields[1].displayOrder = 1;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.fields[0].displayOrder = 1;
    draft.fields[1].displayOrder = 2;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 10. ADD_CASE Mandatory false -> true -> false -> clean
  it("ADD_CASE Mandatory false -> true -> false -> returns to clean", () => {
    const draft = createDraft();
    draft.fields[0].isRequired = true;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.fields[0].isRequired = false;
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 11. control type A -> B -> A -> clean
  it("control type A -> B -> A -> returns to clean", () => {
    const draft = createDraft();
    draft.fields[0].controlType = "TEXTAREA";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

    draft.fields[0].controlType = "TEXT_INPUT";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 12. CASE_VIEW ignores isRequired and deferred static badges
  it("CASE_VIEW ignores isRequired, isVisible, isEnabled, isEditable changes", () => {
    const caseViewAggregate: FormAggregateComparable = {
      ...baseAggregate,
      form: {
        id: "form-2",
        formKey: "case_view",
        formType: "CASE_VIEW",
        name: "Case View Form",
      },
    };

    const draft = createDraft();
    // In CASE_VIEW, mutating isRequired, isVisible, isEnabled, isEditable should NOT cause dirty
    draft.fields[0].isRequired = true;
    draft.fields[0].isVisible = false;
    draft.fields[0].isEnabled = false;
    draft.fields[0].isEditable = false;
    expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);

    // But changing controlType or structure on CASE_VIEW MUST cause dirty
    draft.fields[0].controlType = "TEXTAREA";
    expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(true);
  });

  // 13. UI-only properties excluded
  it("ignores UI-only properties, client IDs, and timestamps", () => {
    const draft = createDraft();
    // Extra client fields or UI markers
    (draft as any).activeTabId = "tab-999";
    (draft as any).selectedFieldId = "field-999";
    (draft as any).isModalOpen = true;
    (draft as any).pendingNavigation = () => {};
    (draft.fields[0] as any).createdAt = new Date();
    (draft.fields[0] as any).updatedAt = new Date();
    (draft.tabs[0] as any).clientTempId = "temp-123";

    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
  });

  // 14. A genuine change remains dirty
  it("a genuine change remains dirty", () => {
    const draft = createDraft();
    draft.tabs[0].title = "Genuine Changed Title";
    expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);
  });

  describe("ADD_CASE static behaviour settings dirty comparison", () => {
    it("Visible true -> false -> true returns to clean", () => {
      const draft = createDraft();
      draft.fields[0].isVisible = false;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

      draft.fields[0].isVisible = true;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
    });

    it("Editable true -> false -> true returns to clean", () => {
      const draft = createDraft();
      draft.fields[0].isEditable = false;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

      draft.fields[0].isEditable = true;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
    });

    it("Independent combination (Hidden + Mandatory) is valid and reverts cleanly", () => {
      const draft = createDraft();
      draft.fields[0].isVisible = false;
      draft.fields[0].isRequired = true;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(true);

      draft.fields[0].isVisible = true;
      draft.fields[0].isRequired = false;
      expect(isFormAggregateDirty(baseAggregate, draft)).toBe(false);
    });
  });

  describe("CASE_VIEW queue rules sparse default semantics", () => {
    const caseViewAggregate: FormAggregateComparable = {
      ...baseAggregate,
      form: {
        id: "form-2",
        formKey: "case_view",
        formType: "CASE_VIEW",
        name: "Case View Form",
      },
      queueRules: [],
    };

    it("default -> Hidden -> default returns clean", () => {
      const draft = createDraft();
      // Initially no queueRules in draft or persisted (both default: visible=true, editable=true, required=false)
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);

      // Set Hidden for queue-1 on field-1
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: false, isEditable: true, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(true);

      // Return to default (isVisible: true)
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: true, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);

      // Omission of rule is also default -> clean
      draft.queueRules = [];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);
    });

    it("default -> Read-only -> default returns clean", () => {
      const draft = createDraft();
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);

      // Set Read-only (isEditable: false)
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: false, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(true);

      // Return to default (isEditable: true)
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: true, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);
    });

    it("default -> Mandatory -> default returns clean", () => {
      const draft = createDraft();
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);

      // Set Mandatory (isRequired: true)
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: true, isRequired: true },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(true);

      // Return to default (isRequired: false)
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: true, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);
    });

    it("creating an explicit all-default rule does not create dirty state", () => {
      const draft = createDraft();
      // An explicit rule with all default values: isVisible=true, isEditable=true, isRequired=false
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: true, isEditable: true, isRequired: false },
        { fieldReferenceId: "field-2", queueId: "queue-2", isVisible: true, isEditable: true, isRequired: false },
      ];
      expect(isFormAggregateDirty(caseViewAggregate, draft)).toBe(false);
    });

    it("persisted non-default rule compared with identical draft rule evaluates clean", () => {
      const persistedWithRule: FormAggregateComparable = {
        ...caseViewAggregate,
        queueRules: [
          { id: "rule-1", fieldReferenceId: "field-1", queueId: "queue-1", isVisible: false, isEditable: false, isRequired: true },
        ],
      };

      const draft = createDraft();
      draft.queueRules = [
        { fieldReferenceId: "field-1", queueId: "queue-1", isVisible: false, isEditable: false, isRequired: true },
      ];

      expect(isFormAggregateDirty(persistedWithRule, draft)).toBe(false);

      // Changing one setting makes it dirty
      draft.queueRules[0].isRequired = false;
      expect(isFormAggregateDirty(persistedWithRule, draft)).toBe(true);

      // Restoring it makes it clean again
      draft.queueRules[0].isRequired = true;
      expect(isFormAggregateDirty(persistedWithRule, draft)).toBe(false);
    });
  });
});
