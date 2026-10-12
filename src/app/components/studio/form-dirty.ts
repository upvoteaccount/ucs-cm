/**
 * Canonical semantic equality comparator for Form dirty-state tracking.
 * 
 * Form dirty state must be derived strictly by comparing persistedAggregate
 * against draftAggregate. Imperative mutation-event tracking is prohibited.
 */

export interface FormTabComparable {
  id: string;
  title?: string | null;
  displayOrder?: number | string | null;
  [key: string]: any;
}

export interface FormSectionComparable {
  id: string;
  tabId: string;
  title?: string | null;
  displayOrder?: number | string | null;
  [key: string]: any;
}

export interface FormFieldComparable {
  id?: string;
  sectionId: string;
  propertyId: string;
  controlType?: string | null;
  isRequired?: boolean | null;
  isVisible?: boolean | null;
  isEnabled?: boolean | null;
  isEditable?: boolean | null;
  displayOrder?: number | string | null;
  [key: string]: any;
}

export interface FormFieldQueueRuleComparable {
  id?: string;
  fieldReferenceId: string;
  queueId: string;
  isVisible?: boolean | null;
  isEditable?: boolean | null;
  isRequired?: boolean | null;
  [key: string]: any;
}

export interface FormAggregateComparable {
  form?: {
    id?: string;
    formType?: string | null;
    formKey?: string | null;
    name?: string | null;
    [key: string]: any;
  } | null;
  tabs?: FormTabComparable[] | null;
  sections?: FormSectionComparable[] | null;
  fields?: FormFieldComparable[] | null;
  queueRules?: FormFieldQueueRuleComparable[] | null;
}

export interface FormDraftComparable {
  tabs: FormTabComparable[];
  sections: FormSectionComparable[];
  fields: FormFieldComparable[];
  queueRules?: FormFieldQueueRuleComparable[] | null;
}

/**
 * Returns true if the draft aggregate has material business changes compared to the persisted aggregate.
 *
 * Reversible changes (e.g. add then delete same entity, rename back, move back, toggle mandatory back,
 * restore control type, or revert queue rules to default/persisted) evaluate strictly to false (clean).
 *
 * Workspace-only state (activeTabId, selectedFieldId, selectedQueueId, modal flags, pendingNavigation, error/saving states)
 * and legacy/suppressed flags (enabledOverride) are excluded.
 */
export function isFormAggregateDirty(
  persisted: FormAggregateComparable | null | undefined,
  draft: FormDraftComparable | null | undefined
): boolean {
  if (!persisted || !draft) {
    return false;
  }

  const formType = (persisted.form?.formType || "").toUpperCase();
  const isAddCase = formType === "ADD_CASE";

  // --- 1. Tabs Comparison ---
  const pTabs = persisted.tabs || [];
  const dTabs = draft.tabs || [];

  if (pTabs.length !== dTabs.length) {
    return true;
  }

  // Sort both by displayOrder to compare canonical sequence
  const sortedPTabs = [...pTabs].sort(
    (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0)
  );
  const sortedDTabs = [...dTabs].sort(
    (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0)
  );

  for (let i = 0; i < sortedPTabs.length; i++) {
    const pTab = sortedPTabs[i];
    const dTab = sortedDTabs[i];

    if (pTab.id !== dTab.id) {
      return true;
    }
    if ((pTab.title ?? "").trim() !== (dTab.title ?? "").trim()) {
      return true;
    }
    if ((Number(pTab.displayOrder) || 0) !== (Number(dTab.displayOrder) || 0)) {
      return true;
    }
  }

  // --- 2. Sections Comparison ---
  const pSections = persisted.sections || [];
  const dSections = draft.sections || [];

  if (pSections.length !== dSections.length) {
    return true;
  }

  const pSectionMap = new Map<string, FormSectionComparable>();
  for (const sec of pSections) {
    pSectionMap.set(sec.id, sec);
  }

  for (const dSec of dSections) {
    const pSec = pSectionMap.get(dSec.id);
    if (!pSec) {
      // Draft has a section not found in persisted (e.g. newly added unsaved section)
      return true;
    }
    if ((pSec.title ?? "").trim() !== (dSec.title ?? "").trim()) {
      return true;
    }
    if (pSec.tabId !== dSec.tabId) {
      return true;
    }
    if ((Number(pSec.displayOrder) || 0) !== (Number(dSec.displayOrder) || 0)) {
      return true;
    }
  }

  // --- 3. Fields Comparison ---
  const pFields = persisted.fields || [];
  const dFields = draft.fields || [];

  if (pFields.length !== dFields.length) {
    return true;
  }

  // Field business identity is anchored to propertyId (unique placement per form in Phase 1)
  const pFieldMap = new Map<string, FormFieldComparable>();
  for (const f of pFields) {
    pFieldMap.set(f.propertyId, f);
  }

  const visitedPropertyIds = new Set<string>();

  for (const dField of dFields) {
    if (visitedPropertyIds.has(dField.propertyId)) {
      // Duplicate property placement in draft
      return true;
    }
    visitedPropertyIds.add(dField.propertyId);

    const pField = pFieldMap.get(dField.propertyId);
    if (!pField) {
      // Unrecognized property placed in draft
      return true;
    }

    // Placement in section
    if (pField.sectionId !== dField.sectionId) {
      return true;
    }

    // Relative order within section
    if ((Number(pField.displayOrder) || 0) !== (Number(dField.displayOrder) || 0)) {
      return true;
    }

    // Control type
    if ((pField.controlType ?? "").trim() !== (dField.controlType ?? "").trim()) {
      return true;
    }

    // ADD_CASE evaluates 3 independent static settings
    if (isAddCase) {
      const pVisible = pField.isVisible ?? true;
      const dVisible = dField.isVisible ?? true;
      if (pVisible !== dVisible) {
        return true;
      }

      const pEditable = pField.isEditable ?? true;
      const dEditable = dField.isEditable ?? true;
      if (pEditable !== dEditable) {
        return true;
      }

      const pRequired = Boolean(pField.isRequired);
      const dRequired = Boolean(dField.isRequired);
      if (pRequired !== dRequired) {
        return true;
      }
    }
  }

  // --- 4. Queue Rules Comparison (CASE_VIEW only) ---
  if (!isAddCase) {
    // Normalizes queue rules into non-default entries:
    // Absence of a rule == explicit { isVisible: true, isEditable: true, isRequired: false }
    const normalizeQueueRules = (rules?: FormFieldQueueRuleComparable[] | null) => {
      const map = new Map<string, { isVisible: boolean; isEditable: boolean; isRequired: boolean }>();
      if (!rules) return map;

      for (const r of rules) {
        const isVis = r.isVisible ?? true;
        const isEdit = r.isEditable ?? true;
        const isReq = Boolean(r.isRequired);

        // Omit default-valued rule from normalized set
        if (isVis === true && isEdit === true && isReq === false) {
          continue;
        }

        const key = `${r.fieldReferenceId}:${r.queueId}`;
        map.set(key, { isVisible: isVis, isEditable: isEdit, isRequired: isReq });
      }
      return map;
    };

    const pRuleMap = normalizeQueueRules(persisted.queueRules);
    const dRuleMap = normalizeQueueRules(draft.queueRules);

    if (pRuleMap.size !== dRuleMap.size) {
      return true;
    }

    for (const [key, pRule] of pRuleMap.entries()) {
      const dRule = dRuleMap.get(key);
      if (!dRule) {
        return true;
      }
      if (
        pRule.isVisible !== dRule.isVisible ||
        pRule.isEditable !== dRule.isEditable ||
        pRule.isRequired !== dRule.isRequired
      ) {
        return true;
      }
    }
  }

  return false;
}
