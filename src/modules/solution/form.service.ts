import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository } from "./solution.repository";
import { solutionPropertyRepository } from "./solution-property.repository";
import { solutionQueueRepository } from "./queue.repository";
import {
  formRepository,
  FormRow,
  FormAggregate,
  FormTabRow,
  FormSectionRow,
  FormFieldRefRow,
} from "./form.repository";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors";

import { validateSymbolicKey } from "./choice-list.service";

export function validateControlCompatibility(property: any, controlType: string): void {
  const type = property.storedDataType;
  const preset = property.formatPreset || "NONE";
  const choiceListId = property.choiceListId;
  const cardinality = property.cardinality || "SINGLE";

  // Common rule: MULTIPLE cardinality permits ONLY DROPDOWN control
  if (cardinality === "MULTIPLE" && controlType !== "DROPDOWN") {
    throw new ValidationError(`MULTIPLE cardinality properties permit only DROPDOWN control.`);
  }

  // Common rule: RADIO control requires SINGLE cardinality
  if (controlType === "RADIO" && cardinality !== "SINGLE") {
    throw new ValidationError(`RADIO control is only supported for SINGLE cardinality.`);
  }

  switch (type) {
    case "TEXT":
      if (preset === "EMAIL" || preset === "PHONE") {
        if (controlType !== "TEXT_INPUT") {
          throw new ValidationError(`EMAIL and PHONE format presets require TEXT_INPUT control.`);
        }
      } else if (choiceListId) {
        if (controlType !== "DROPDOWN" && controlType !== "RADIO") {
          throw new ValidationError(`Choice-list-bound TEXT properties require DROPDOWN or RADIO control.`);
        }
      } else {
        if (controlType === "DROPDOWN" || controlType === "RADIO") {
          throw new ValidationError(`DROPDOWN and choice RADIO controls require a Choice List to be bound to the property.`);
        }
        if (controlType !== "TEXT_INPUT" && controlType !== "TEXTAREA") {
          throw new ValidationError(`TEXT properties without a Choice List require TEXT_INPUT or TEXTAREA control.`);
        }
      }
      break;

    case "NUMBER":
      if (choiceListId) {
        if (controlType !== "DROPDOWN" && controlType !== "RADIO") {
          throw new ValidationError(`Choice-list-bound NUMBER properties require DROPDOWN or RADIO control.`);
        }
      } else {
        if (controlType === "DROPDOWN" || controlType === "RADIO") {
          throw new ValidationError(`DROPDOWN and choice RADIO controls require a Choice List to be bound to the property.`);
        }
        if (controlType !== "NUMBER_INPUT") {
          throw new ValidationError(`NUMBER properties without a Choice List require NUMBER_INPUT control.`);
        }
      }
      break;

    case "BOOLEAN":
      if (controlType !== "CHECKBOX" && controlType !== "RADIO") {
        throw new ValidationError(`BOOLEAN properties require CHECKBOX or RADIO control.`);
      }
      break;

    case "DATE":
      if (controlType !== "DATE_PICKER") {
        throw new ValidationError(`DATE properties require DATE_PICKER control.`);
      }
      break;

    case "DATETIME":
      if (controlType !== "DATETIME_PICKER") {
        throw new ValidationError(`DATETIME properties require DATETIME_PICKER control.`);
      }
      break;

    case "USER_REFERENCE":
      if (controlType !== "USER_PICKER") {
        throw new ValidationError(`USER_REFERENCE properties require USER_PICKER control.`);
      }
      break;

    default:
      throw new ValidationError(`Unsupported storedDataType '${type}'.`);
  }
}

export function validateStaticFieldStates(input: {
  isVisible?: boolean;
  isEnabled?: boolean;
  isEditable?: boolean;
  isRequired?: boolean;
}): void {
  const isVisible = input.isVisible ?? true;
  const isEnabled = input.isEnabled ?? true;
  const isRequired = input.isRequired ?? false;

  if (isRequired && (!isVisible || !isEnabled)) {
    throw new ValidationError(
      "A field cannot be required while being hidden (visible=false) or disabled (enabled=false)."
    );
  }
}

export class FormService {
  /**
   * Resolves form by ID or falls back to initial/case_view form.
   */
  async resolveForm(solutionId: string, orgId: string, formId?: string): Promise<FormRow> {
    const form = formId
      ? await formRepository.findFormById(formId, solutionId, orgId)
      : await formRepository.findInitialFormBySolution(solutionId, orgId);
    if (!form) throw new NotFoundError("Form not found for this Solution");
    return form;
  }

  /**
   * Lists all forms for a Solution.
   */
  async listForms(
    solutionId: string,
    context: SessionContext
  ): Promise<{ forms: FormRow[]; solutionRevision: number }> {
    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const forms = await formRepository.listFormsBySolution(solutionId, orgId);
    return { forms, solutionRevision: solution.revision };
  }

  /**
   * Reads full Form aggregate for a Solution (optionally for a specific formId).
   */
  async getFormAggregate(
    solutionId: string,
    formIdOrContext: string | SessionContext,
    contextArg?: SessionContext
  ): Promise<{ formAggregate: FormAggregate; solutionRevision: number }> {
    const formId = typeof formIdOrContext === "string" ? formIdOrContext : undefined;
    const context = (typeof formIdOrContext === "string" ? contextArg : formIdOrContext) as SessionContext;

    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const agg = await formRepository.getFormAggregate(solutionId, orgId, formId);
    if (!agg) {
      throw new NotFoundError("Form not found for this Solution");
    }

    return { formAggregate: agg, solutionRevision: solution.revision };
  }

  /**
   * Canonical Whole-Form Aggregate Save:
   * Validates layout invariants, locks solution revision, atomically synchronizes tabs/sections/fields,
   * records FORM_LAYOUT_SAVED audit event with change details, and returns updated FormAggregate.
   */
  async saveFormAggregate(
    solutionId: string,
    formId: string,
    input: {
      expectedRevision: number;
      tabs: { id?: string; key?: string; title: string; displayOrder?: number }[];
      sections: { id?: string; tabId: string; key?: string; title: string; displayOrder?: number }[];
      fields: {
        id?: string;
        sectionId: string;
        propertyId: string;
        controlType: string;
        isVisible?: boolean;
        isEditable?: boolean;
        isRequired?: boolean;
        displayOrder?: number;
      }[];
      queueRules?: {
        fieldReferenceId: string;
        queueId: string;
        isVisible?: boolean;
        isEditable?: boolean;
        isRequired?: boolean;
      }[];
    },
    context: SessionContext
  ): Promise<{ formAggregate: FormAggregate; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
      throw new ValidationError("expectedRevision is required and must be a positive integer.");
    }
    if (!Array.isArray(input.tabs) || input.tabs.length === 0) {
      throw new ValidationError("Form must contain at least one tab.");
    }
    if (!Array.isArray(input.sections)) {
      throw new ValidationError("sections array is required.");
    }
    if (!Array.isArray(input.fields)) {
      throw new ValidationError("fields array is required.");
    }

    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const form = await formRepository.findFormById(formId, solutionId, orgId);
    if (!form) {
      throw new NotFoundError("Form not found for this Solution");
    }

    // 1. Validate tabs
    for (const t of input.tabs) {
      if (!t.title || typeof t.title !== "string" || !t.title.trim()) {
        throw new ValidationError("Tab title cannot be empty.");
      }
    }

    // Tab ID/key index for resolving section parent
    const submittedTabKeys = new Set(input.tabs.map((t) => t.id || t.key).filter(Boolean));

    // 2. Validate sections
    for (const s of input.sections) {
      if (!s.title || typeof s.title !== "string" || !s.title.trim()) {
        throw new ValidationError("Section title cannot be empty.");
      }
      if (!s.tabId || !submittedTabKeys.has(s.tabId)) {
        throw new ValidationError(`Section '${s.title}' references an invalid or missing tab.`);
      }
    }

    const submittedSecKeys = new Set(input.sections.map((s) => s.id || s.key).filter(Boolean));

    // 3. Validate fields
    // Fetch all solution properties for ownership & compatibility checks
    const solProperties = await solutionPropertyRepository.listBySolution(solutionId, orgId);
    const propMap = new Map<string, any>(solProperties.map((p: any) => [p.id, p]));

    // Check per-form property uniqueness
    const seenPropertyIds = new Set<string>();

    for (const f of input.fields) {
      if (!f.sectionId || !submittedSecKeys.has(f.sectionId)) {
        throw new ValidationError("Field references an invalid or missing section.");
      }
      if (!f.propertyId || !propMap.has(f.propertyId)) {
        throw new ValidationError(`Property ${f.propertyId} not found in this Solution.`);
      }
      if (seenPropertyIds.has(f.propertyId)) {
        const propLabel = propMap.get(f.propertyId)?.label || f.propertyId;
        throw new ConflictError(`Property '${propLabel}' is already placed on this form.`);
      }
      seenPropertyIds.add(f.propertyId);

      const prop = propMap.get(f.propertyId)!;
      validateControlCompatibility(prop, f.controlType);

      if (f.isVisible !== undefined && typeof f.isVisible !== "boolean") {
        throw new ValidationError("isVisible must be a boolean.");
      }
      if (f.isEditable !== undefined && typeof f.isEditable !== "boolean") {
        throw new ValidationError("isEditable must be a boolean.");
      }
      if (f.isRequired !== undefined && typeof f.isRequired !== "boolean") {
        throw new ValidationError("isRequired must be a boolean.");
      }
      if (form.formType === "CASE_VIEW" && f.isRequired) {
        throw new ValidationError("Case View Form does not support static mandatory configuration. Mandatory behaviour must be configured per queue.");
      }
    }

    // 4. Validate queueRules
    if (form.formType === "ADD_CASE") {
      if (input.queueRules && input.queueRules.length > 0) {
        throw new ValidationError("Add Case Form does not support queue-specific behaviour rules.");
      }
    } else if (form.formType === "CASE_VIEW") {
      if (input.queueRules !== undefined) {
        if (!Array.isArray(input.queueRules)) {
          throw new ValidationError("queueRules must be an array.");
        }
        const solQueues = await solutionQueueRepository.listBySolution(solutionId, orgId);
        const validQueueIds = new Set(solQueues.map((q) => q.id));
        const validFieldIdentifiers = new Set(
          input.fields.map((f) => f.id).filter((id): id is string => !!id)
        );
        const seenFieldQueuePairs = new Set<string>();

        for (const qr of input.queueRules) {
          if (!qr.queueId || !validQueueIds.has(qr.queueId)) {
            throw new ValidationError("Queue rule references an invalid or missing queue in this Solution.");
          }
          if (
            !qr.fieldReferenceId ||
            (!validFieldIdentifiers.has(qr.fieldReferenceId) &&
              !input.fields.some((f) => f.id === qr.fieldReferenceId))
          ) {
            throw new ValidationError("Queue rule references an invalid or missing field reference.");
          }
          const pairKey = `${qr.fieldReferenceId}:${qr.queueId}`;
          if (seenFieldQueuePairs.has(pairKey)) {
            throw new ConflictError("Duplicate queue rule for field reference and queue.");
          }
          seenFieldQueuePairs.add(pairKey);

          if (qr.isVisible !== undefined && typeof qr.isVisible !== "boolean") {
            throw new ValidationError("isVisible must be a boolean.");
          }
          if (qr.isEditable !== undefined && typeof qr.isEditable !== "boolean") {
            throw new ValidationError("isEditable must be a boolean.");
          }
          if (qr.isRequired !== undefined && typeof qr.isRequired !== "boolean") {
            throw new ValidationError("isRequired must be a boolean.");
          }
        }
      }
    }

    const db = getDb();
    return await db.transaction(async (tx) => {
      // 5. Baseline aggregate before changes (for diffing)
      const baselineAgg = await formRepository.getFormAggregate(solutionId, orgId, formId, tx);
      if (!baselineAgg) {
        throw new NotFoundError("Form not found for this Solution");
      }

      // 6. Optimistic concurrency check & solution revision increment
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx,
        solutionId,
        orgId,
        input.expectedRevision,
        {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          expectedRevision: input.expectedRevision,
        });
      }

      // 7. Synchronize full form aggregate
      const savedAgg = await formRepository.saveFormAggregateInTx(
        tx,
        solutionId,
        orgId,
        formId,
        input
      );

      // 8. Calculate change details for audit
      const baseTabIds = new Set(baselineAgg.tabs.map((t) => t.id));
      const baseSecIds = new Set(baselineAgg.sections.map((s) => s.id));
      const baseFieldIds = new Set(baselineAgg.fields.map((f) => f.id));

      const submittedTabIds = new Set(input.tabs.map((t) => t.id).filter((id): id is string => !!id && baseTabIds.has(id)));
      const submittedSecIds = new Set(input.sections.map((s) => s.id).filter((id): id is string => !!id && baseSecIds.has(id)));
      const submittedFieldIds = new Set(input.fields.map((f) => f.id).filter((id): id is string => !!id && baseFieldIds.has(id)));

      let tabsAdded = 0;
      let tabsRemoved = 0;
      let tabsRenamed = 0;
      for (const t of input.tabs) {
        if (!t.id || !baseTabIds.has(t.id)) tabsAdded++;
        else {
          const old = baselineAgg.tabs.find((bt) => bt.id === t.id);
          if (old && old.title !== t.title.trim()) tabsRenamed++;
        }
      }
      for (const bt of baselineAgg.tabs) {
        if (!submittedTabIds.has(bt.id)) tabsRemoved++;
      }

      let sectionsAdded = 0;
      let sectionsRemoved = 0;
      let sectionsRenamed = 0;
      let sectionsMoved = 0;
      for (const s of input.sections) {
        if (!s.id || !baseSecIds.has(s.id)) sectionsAdded++;
        else {
          const old = baselineAgg.sections.find((bs) => bs.id === s.id);
          if (old) {
            if (old.title !== s.title.trim()) sectionsRenamed++;
            if (old.tabId !== s.tabId) sectionsMoved++;
          }
        }
      }
      for (const bs of baselineAgg.sections) {
        if (!submittedSecIds.has(bs.id)) sectionsRemoved++;
      }

      let fieldsAdded = 0;
      let fieldsRemoved = 0;
      let fieldsMoved = 0;
      let fieldsConfigured = 0;
      for (const f of input.fields) {
        if (!f.id || !baseFieldIds.has(f.id)) fieldsAdded++;
        else {
          const old = baselineAgg.fields.find((bf) => bf.id === f.id);
          if (old) {
            if (old.sectionId !== f.sectionId) fieldsMoved++;
            const controlChanged = old.controlType !== f.controlType;
            const reqChanged = f.isRequired !== undefined && old.isRequired !== f.isRequired;
            const visChanged = f.isVisible !== undefined && old.isVisible !== f.isVisible;
            const editChanged = f.isEditable !== undefined && old.isEditable !== f.isEditable;
            if (controlChanged || reqChanged || visChanged || editChanged) {
              fieldsConfigured++;
            }
          }
        }
      }
      for (const bf of baselineAgg.fields) {
        if (!submittedFieldIds.has(bf.id)) fieldsRemoved++;
      }

      // 9. Calculate queue rules changes for audit
      const baseRuleMap = new Map(
        baselineAgg.queueRules.map((r) => [`${r.fieldReferenceId}:${r.queueId}`, r])
      );
      const savedRuleMap = new Map(
        savedAgg.queueRules.map((r) => [`${r.fieldReferenceId}:${r.queueId}`, r])
      );

      const allRuleKeys = new Set([...baseRuleMap.keys(), ...savedRuleMap.keys()]);
      const queueRulesChanged: Array<{
        queueId: string;
        fieldReferenceId: string;
        previousEffectiveBehaviour: { isVisible: boolean; isEditable: boolean; isRequired: boolean };
        newEffectiveBehaviour: { isVisible: boolean; isEditable: boolean; isRequired: boolean };
      }> = [];

      for (const key of allRuleKeys) {
        const bRule = baseRuleMap.get(key);
        const sRule = savedRuleMap.get(key);

        const prevEff = {
          isVisible: bRule?.isVisible ?? true,
          isEditable: bRule?.isEditable ?? true,
          isRequired: bRule?.isRequired ?? false,
        };
        const newEff = {
          isVisible: sRule?.isVisible ?? true,
          isEditable: sRule?.isEditable ?? true,
          isRequired: sRule?.isRequired ?? false,
        };

        if (
          prevEff.isVisible !== newEff.isVisible ||
          prevEff.isEditable !== newEff.isEditable ||
          prevEff.isRequired !== newEff.isRequired
        ) {
          const [fieldRefId, queueId] = key.split(":");
          queueRulesChanged.push({
            queueId,
            fieldReferenceId: fieldRefId,
            previousEffectiveBehaviour: prevEff,
            newEffectiveBehaviour: newEff,
          });
        }
      }

      // 10. Record single top-level FORM_LAYOUT_SAVED audit event
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_SAVED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "SOLUTION_FORM",
        entityId: form.id,
        beforeState: {
          tabCount: baselineAgg.tabs.length,
          sectionCount: baselineAgg.sections.length,
          fieldCount: baselineAgg.fields.length,
          queueRuleCount: baselineAgg.queueRules.length,
        },
        afterState: {
          tabCount: savedAgg.tabs.length,
          sectionCount: savedAgg.sections.length,
          fieldCount: savedAgg.fields.length,
          queueRuleCount: savedAgg.queueRules.length,
        },
        metadata: {
          formId: form.id,
          formType: form.formType,
          formKey: form.formKey,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
          changeSummary: {
            tabsAdded,
            tabsRemoved,
            tabsRenamed,
            sectionsAdded,
            sectionsRemoved,
            sectionsRenamed,
            sectionsMoved,
            fieldsAdded,
            fieldsRemoved,
            fieldsMoved,
            fieldsConfigured,
            queueRulesChanged: queueRulesChanged.length,
          },
          ...(queueRulesChanged.length > 0 ? { queueRulesChanged } : {}),
        },
      });

      return { formAggregate: savedAgg, solutionRevision: updatedSolution.revision };
    });
  }

  async createTab(
    solutionId: string,
    input: { formId?: string; expectedRevision: number; key?: string; title: string },
    context: SessionContext
  ): Promise<{ tab: FormTabRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Tab title is required.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const key = input.key ? validateSymbolicKey(input.key, "Tab key") : `tab_${Math.random().toString(36).substring(7)}`;

    const db = getDb();
    try {
      return await db.transaction(async (tx) => {
        const updatedSolution = await solutionRepository.updateSolutionInTx(
          tx, solutionId, orgId, input.expectedRevision, {}
        );
        if (!updatedSolution) {
          throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
        }

        const maxOrder = await formRepository.getMaxTabDisplayOrderInTx(tx, form.id);
        const tab = await formRepository.createTabInTx(tx, {
          formId: form.id,
          key,
          title: input.title.trim(),
          displayOrder: maxOrder + 1,
        });

        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "FORM_TAB_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "FORM_TAB",
          entityId: tab.id,
          afterState: { id: tab.id, formId: tab.formId, key: tab.key, title: tab.title, displayOrder: tab.displayOrder },
          metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
        });

        return { tab, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;
      if (code === "23505") {
        throw new ConflictError(`Tab with key '${key}' already exists in this form.`);
      }
      throw err;
    }
  }

  async updateTab(
    solutionId: string,
    tabId: string,
    input: { formId?: string; expectedRevision: number; title: string },
    context: SessionContext
  ): Promise<{ tab: FormTabRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Tab title cannot be empty.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const currentTab = await formRepository.findTabById(tabId, form.id);
    if (!currentTab) throw new NotFoundError("Tab not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const tab = await formRepository.updateTabInTx(tx, tabId, form.id, input.title.trim());
      if (!tab) throw new NotFoundError("Tab not found");

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_TAB_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_TAB",
        entityId: tab.id,
        beforeState: { title: currentTab.title },
        afterState: { title: tab.title },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { tab, solutionRevision: updatedSolution.revision };
    });
  }

  async deleteTab(
    solutionId: string,
    tabId: string,
    input: { formId?: string; expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const tab = await formRepository.findTabById(tabId, form.id);
    if (!tab) throw new NotFoundError("Tab not found");

    const totalTabs = await formRepository.countTabsInForm(form.id);
    if (totalTabs <= 1) {
      throw new ConflictError("Cannot delete the only remaining tab in the form.");
    }

    const sectionCount = await formRepository.countSectionsInTab(tabId);
    if (sectionCount > 0) {
      throw new ConflictError("Cannot delete a non-empty tab. Delete or move all sections out of this tab first.");
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      await formRepository.deleteTabInTx(tx, tabId, form.id);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_TAB_DELETED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_TAB",
        entityId: tabId,
        beforeState: { id: tab.id, title: tab.title, key: tab.key },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { success: true, solutionRevision: updatedSolution.revision };
    });
  }

  async reorderTabs(
    solutionId: string,
    input: { formId?: string; expectedRevision: number; tabIds: string[] },
    context: SessionContext
  ): Promise<{ tabs: FormTabRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!Array.isArray(input.tabIds)) {
      throw new ValidationError("tabIds must be an array of tab IDs.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);
    const agg = await formRepository.getFormAggregate(solutionId, orgId, form.id);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const existingTabs = agg.tabs;
    const existingIdsSet = new Set(existingTabs.map((t) => t.id));

    if (input.tabIds.length !== existingTabs.length || new Set(input.tabIds).size !== existingTabs.length) {
      throw new ValidationError("Reorder payload must contain every existing tab ID for this form exactly once.");
    }
    for (const id of input.tabIds) {
      if (!existingIdsSet.has(id)) {
        throw new ValidationError("Reorder payload contains invalid, missing, or foreign tab IDs.");
      }
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const reordered = await formRepository.reorderTabsInTx(tx, form.id, input.tabIds);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_TAB",
        entityId: form.id,
        afterState: { newTabOrder: input.tabIds },
        metadata: {
          entityType: "TAB",
          parentId: form.id,
          affectedIds: input.tabIds,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { tabs: reordered, solutionRevision: updatedSolution.revision };
    });
  }

  // --- SECTION OPERATIONS ---

  async createSection(
    solutionId: string,
    tabId: string,
    input: { formId?: string; expectedRevision: number; key?: string; title: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Section title is required.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const tab = await formRepository.findTabById(tabId, form.id);
    if (!tab) throw new NotFoundError("Tab not found");

    const key = input.key ? validateSymbolicKey(input.key, "Section key") : `sec_${Math.random().toString(36).substring(7)}`;

    const db = getDb();
    try {
      return await db.transaction(async (tx) => {
        const updatedSolution = await solutionRepository.updateSolutionInTx(
          tx, solutionId, orgId, input.expectedRevision, {}
        );
        if (!updatedSolution) {
          throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
        }

        const maxOrder = await formRepository.getMaxSectionDisplayOrderInTx(tx, tabId);
        const section = await formRepository.createSectionInTx(tx, {
          formId: form.id,
          tabId,
          key,
          title: input.title.trim(),
          displayOrder: maxOrder + 1,
        });

        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "FORM_SECTION_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "FORM_SECTION",
          entityId: section.id,
          afterState: { id: section.id, formId: section.formId, tabId: section.tabId, key: section.key, title: section.title, displayOrder: section.displayOrder },
          metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
        });

        return { section, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;
      if (code === "23505") {
        throw new ConflictError(`Section with key '${key}' already exists in this tab.`);
      }
      throw err;
    }
  }

  async updateSection(
    solutionId: string,
    sectionId: string,
    input: { formId?: string; expectedRevision: number; title: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Section title cannot be empty.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const currentSection = await formRepository.findSectionById(sectionId, form.id);
    if (!currentSection) throw new NotFoundError("Section not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const section = await formRepository.updateSectionInTx(tx, sectionId, form.id, input.title.trim());
      if (!section) throw new NotFoundError("Section not found");

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_SECTION_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_SECTION",
        entityId: section.id,
        beforeState: { title: currentSection.title },
        afterState: { title: section.title },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { section, solutionRevision: updatedSolution.revision };
    });
  }

  async deleteSection(
    solutionId: string,
    sectionId: string,
    input: { formId?: string; expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const section = await formRepository.findSectionById(sectionId, form.id);
    if (!section) throw new NotFoundError("Section not found");

    const fieldCount = await formRepository.countFieldsInSection(sectionId);
    if (fieldCount > 0) {
      throw new ConflictError("Cannot delete a non-empty section. Delete or move all field references out of this section first.");
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      await formRepository.deleteSectionInTx(tx, sectionId, form.id);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_SECTION_DELETED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_SECTION",
        entityId: sectionId,
        beforeState: { id: section.id, title: section.title, tabId: section.tabId, key: section.key },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { success: true, solutionRevision: updatedSolution.revision };
    });
  }

  async reorderSections(
    solutionId: string,
    input: { formId?: string; expectedRevision: number; tabId: string; sectionIds: string[] },
    context: SessionContext
  ): Promise<{ sections: FormSectionRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.tabId) throw new ValidationError("tabId is required.");
    if (!Array.isArray(input.sectionIds)) throw new ValidationError("sectionIds must be an array.");

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const tab = await formRepository.findTabById(input.tabId, form.id);
    if (!tab) throw new NotFoundError("Tab not found");

    const existingSections = await formRepository.listSectionsInTab(input.tabId);
    const existingIdsSet = new Set(existingSections.map((s) => s.id));

    if (input.sectionIds.length !== existingSections.length || new Set(input.sectionIds).size !== existingSections.length) {
      throw new ValidationError("Reorder payload must contain every existing section ID for this tab exactly once.");
    }
    for (const id of input.sectionIds) {
      if (!existingIdsSet.has(id)) {
        throw new ValidationError("Reorder payload contains invalid, missing, or foreign section IDs.");
      }
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const reordered = await formRepository.reorderSectionsInTx(tx, input.tabId, input.sectionIds);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_SECTION",
        entityId: input.tabId,
        afterState: { newSectionOrder: input.sectionIds },
        metadata: {
          entityType: "SECTION",
          parentId: input.tabId,
          affectedIds: input.sectionIds,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { sections: reordered, solutionRevision: updatedSolution.revision };
    });
  }

  async moveSection(
    solutionId: string,
    sectionId: string,
    input: { formId?: string; expectedRevision: number; targetTabId: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.targetTabId) throw new ValidationError("targetTabId is required.");

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const section = await formRepository.findSectionById(sectionId, form.id);
    if (!section) throw new NotFoundError("Section not found");

    const targetTab = await formRepository.findTabById(input.targetTabId, form.id);
    if (!targetTab) throw new NotFoundError("Target Tab not found");

    if (section.tabId === input.targetTabId) {
      return { section, solutionRevision: (await solutionRepository.findById(solutionId, orgId))!.revision };
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const moved = await formRepository.moveSectionInTx(tx, sectionId, section.tabId, input.targetTabId);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_SECTION",
        entityId: sectionId,
        beforeState: { tabId: section.tabId },
        afterState: { tabId: input.targetTabId },
        metadata: {
          entityType: "SECTION_MOVED",
          sourceTabId: section.tabId,
          targetTabId: input.targetTabId,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { section: moved, solutionRevision: updatedSolution.revision };
    });
  }

  // --- FIELD REFERENCE OPERATIONS ---

  async addFieldReference(
    solutionId: string,
    sectionId: string,
    input: {
      formId?: string;
      expectedRevision: number;
      propertyId: string;
      controlType: string;
      isVisible?: boolean;
      isEnabled?: boolean;
      isEditable?: boolean;
      isRequired?: boolean;
    },
    context: SessionContext
  ): Promise<{ fieldReference: FormFieldRefRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.propertyId) throw new ValidationError("propertyId is required.");
    if (!input.controlType) throw new ValidationError("controlType is required.");

    validateStaticFieldStates(input);

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const section = await formRepository.findSectionById(sectionId, form.id);
    if (!section) throw new NotFoundError("Section not found");

    const property = await solutionPropertyRepository.findById(input.propertyId, solutionId, orgId);
    if (!property) throw new NotFoundError("Property not found or belongs to another Solution.");

    validateControlCompatibility(property, input.controlType.trim().toUpperCase());

    const db = getDb();
    try {
      return await db.transaction(async (tx) => {
        const updatedSolution = await solutionRepository.updateSolutionInTx(
          tx, solutionId, orgId, input.expectedRevision, {}
        );
        if (!updatedSolution) {
          throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
        }

        const maxOrder = await formRepository.getMaxFieldDisplayOrderInTx(tx, sectionId);
        const fieldRef = await formRepository.createFieldRefInTx(tx, {
          solutionId,
          formId: form.id,
          sectionId,
          propertyId: input.propertyId,
          controlType: input.controlType.trim().toUpperCase(),
          isVisible: input.isVisible ?? true,
          isEnabled: input.isEnabled ?? true,
          isEditable: input.isEditable ?? true,
          isRequired: input.isRequired ?? false,
          displayOrder: maxOrder + 1,
        });

        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "FORM_FIELD_ADDED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "FORM_FIELD_REFERENCE",
          entityId: fieldRef.id,
          afterState: {
            id: fieldRef.id,
            sectionId: fieldRef.sectionId,
            propertyId: fieldRef.propertyId,
            controlType: fieldRef.controlType,
            displayOrder: fieldRef.displayOrder,
          },
          metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
        });

        return { fieldReference: fieldRef, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;
      if (code === "23505") {
        throw new ConflictError("Property is already placed on this Form. A property may appear only once per Form.");
      }
      throw err;
    }
  }

  async updateFieldReference(
    solutionId: string,
    fieldRefId: string,
    input: {
      formId?: string;
      expectedRevision: number;
      controlType?: string;
      isVisible?: boolean;
      isEnabled?: boolean;
      isEditable?: boolean;
      isRequired?: boolean;
    },
    context: SessionContext
  ): Promise<{ fieldReference: FormFieldRefRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const currentField = await formRepository.findFieldRefById(fieldRefId, form.id);
    if (!currentField) throw new NotFoundError("Field reference not found");

    const mergedStates = {
      isVisible: input.isVisible ?? currentField.isVisible,
      isEnabled: input.isEnabled ?? currentField.isEnabled,
      isEditable: input.isEditable ?? currentField.isEditable,
      isRequired: input.isRequired ?? currentField.isRequired,
    };
    validateStaticFieldStates(mergedStates);

    if (input.controlType) {
      const property = await solutionPropertyRepository.findById(currentField.propertyId, solutionId, orgId);
      if (property) {
        validateControlCompatibility(property, input.controlType.trim().toUpperCase());
      }
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const updated = await formRepository.updateFieldRefInTx(tx, fieldRefId, form.id, {
        controlType: input.controlType ? input.controlType.trim().toUpperCase() : undefined,
        isVisible: input.isVisible,
        isEnabled: input.isEnabled,
        isEditable: input.isEditable,
        isRequired: input.isRequired,
      });

      if (!updated) throw new NotFoundError("Field reference not found");

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_FIELD_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_FIELD_REFERENCE",
        entityId: fieldRefId,
        beforeState: {
          controlType: currentField.controlType,
          isVisible: currentField.isVisible,
          isEnabled: currentField.isEnabled,
          isEditable: currentField.isEditable,
          isRequired: currentField.isRequired,
        },
        afterState: {
          controlType: updated.controlType,
          isVisible: updated.isVisible,
          isEnabled: updated.isEnabled,
          isEditable: updated.isEditable,
          isRequired: updated.isRequired,
        },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { fieldReference: updated, solutionRevision: updatedSolution.revision };
    });
  }

  async removeFieldReference(
    solutionId: string,
    fieldRefId: string,
    input: { formId?: string; expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const fieldRef = await formRepository.findFieldRefById(fieldRefId, form.id);
    if (!fieldRef) throw new NotFoundError("Field reference not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      await formRepository.deleteFieldRefInTx(tx, fieldRefId, form.id);

      // Compact remaining fields in section
      const remaining = await formRepository.listFieldsInSection(fieldRef.sectionId, tx);
      await formRepository.reorderFieldsInTx(tx, fieldRef.sectionId, remaining.map((f) => f.id));

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_FIELD_REMOVED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_FIELD_REFERENCE",
        entityId: fieldRefId,
        beforeState: { id: fieldRef.id, sectionId: fieldRef.sectionId, propertyId: fieldRef.propertyId },
        metadata: { expectedRevision: input.expectedRevision, newSolutionRevision: updatedSolution.revision },
      });

      return { success: true, solutionRevision: updatedSolution.revision };
    });
  }

  async reorderFields(
    solutionId: string,
    input: { formId?: string; expectedRevision: number; sectionId: string; fieldReferenceIds: string[] },
    context: SessionContext
  ): Promise<{ fieldReferences: FormFieldRefRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.sectionId) throw new ValidationError("sectionId is required.");
    if (!Array.isArray(input.fieldReferenceIds)) throw new ValidationError("fieldReferenceIds must be an array.");

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const section = await formRepository.findSectionById(input.sectionId, form.id);
    if (!section) throw new NotFoundError("Section not found");

    const existingFields = await formRepository.listFieldsInSection(input.sectionId);
    const existingIdsSet = new Set(existingFields.map((f) => f.id));

    if (input.fieldReferenceIds.length !== existingFields.length || new Set(input.fieldReferenceIds).size !== existingFields.length) {
      throw new ValidationError("Reorder payload must contain every existing field reference ID for this section exactly once.");
    }
    for (const id of input.fieldReferenceIds) {
      if (!existingIdsSet.has(id)) {
        throw new ValidationError("Reorder payload contains invalid, missing, or foreign field reference IDs.");
      }
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const reordered = await formRepository.reorderFieldsInTx(tx, input.sectionId, input.fieldReferenceIds);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_FIELD_REFERENCE",
        entityId: input.sectionId,
        afterState: { newFieldOrder: input.fieldReferenceIds },
        metadata: {
          entityType: "FIELD",
          parentId: input.sectionId,
          affectedIds: input.fieldReferenceIds,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { fieldReferences: reordered, solutionRevision: updatedSolution.revision };
    });
  }

  async moveFieldReference(
    solutionId: string,
    fieldRefId: string,
    input: { formId?: string; expectedRevision: number; targetSectionId: string },
    context: SessionContext
  ): Promise<{ fieldReference: FormFieldRefRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.targetSectionId) throw new ValidationError("targetSectionId is required.");

    const orgId = context.activeOrganisation.id;
    const form = await this.resolveForm(solutionId, orgId, input.formId);

    const fieldRef = await formRepository.findFieldRefById(fieldRefId, form.id);
    if (!fieldRef) throw new NotFoundError("Field reference not found");

    const targetSection = await formRepository.findSectionById(input.targetSectionId, form.id);
    if (!targetSection) throw new NotFoundError("Target section not found");

    if (fieldRef.sectionId === input.targetSectionId) {
      return { fieldReference: fieldRef, solutionRevision: (await solutionRepository.findById(solutionId, orgId))!.revision };
    }

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const moved = await formRepository.moveFieldInTx(tx, fieldRefId, fieldRef.sectionId, input.targetSectionId);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_FIELD_REFERENCE",
        entityId: fieldRefId,
        beforeState: { sectionId: fieldRef.sectionId },
        afterState: { sectionId: input.targetSectionId },
        metadata: {
          entityType: "FIELD_MOVED",
          sourceSectionId: fieldRef.sectionId,
          targetSectionId: input.targetSectionId,
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { fieldReference: moved, solutionRevision: updatedSolution.revision };
    });
  }
}

export const formService = new FormService();
