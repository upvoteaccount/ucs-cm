import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository } from "./solution.repository";
import { solutionPropertyRepository } from "./solution-property.repository";
import {
  formRepository,
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
   * Reads full Form aggregate for a Solution.
   */
  async getFormAggregate(
    solutionId: string,
    context: SessionContext
  ): Promise<{ formAggregate: FormAggregate; solutionRevision: number }> {
    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) {
      throw new NotFoundError("Form not found for this Solution");
    }

    return { formAggregate: agg, solutionRevision: solution.revision };
  }

  // --- TAB OPERATIONS ---

  async createTab(
    solutionId: string,
    input: { expectedRevision: number; key?: string; title: string },
    context: SessionContext
  ): Promise<{ tab: FormTabRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Tab title is required.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

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

        const maxOrder = await formRepository.getMaxTabDisplayOrderInTx(tx, agg.form.id);
        const tab = await formRepository.createTabInTx(tx, {
          formId: agg.form.id,
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
    input: { expectedRevision: number; title: string },
    context: SessionContext
  ): Promise<{ tab: FormTabRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Tab title cannot be empty.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const currentTab = await formRepository.findTabById(tabId, agg.form.id);
    if (!currentTab) throw new NotFoundError("Tab not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const tab = await formRepository.updateTabInTx(tx, tabId, agg.form.id, input.title.trim());
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
    input: { expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const tab = await formRepository.findTabById(tabId, agg.form.id);
    if (!tab) throw new NotFoundError("Tab not found");

    const totalTabs = await formRepository.countTabsInForm(agg.form.id);
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

      await formRepository.deleteTabInTx(tx, tabId, agg.form.id);

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
    input: { expectedRevision: number; tabIds: string[] },
    context: SessionContext
  ): Promise<{ tabs: FormTabRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!Array.isArray(input.tabIds)) {
      throw new ValidationError("tabIds must be an array of tab IDs.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
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

      const reordered = await formRepository.reorderTabsInTx(tx, agg.form.id, input.tabIds);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "FORM_LAYOUT_REORDERED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "FORM_TAB",
        entityId: agg.form.id,
        afterState: { newTabOrder: input.tabIds },
        metadata: {
          entityType: "TAB",
          parentId: agg.form.id,
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
    input: { expectedRevision: number; key?: string; title: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Section title is required.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const tab = await formRepository.findTabById(tabId, agg.form.id);
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
          formId: agg.form.id,
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
    input: { expectedRevision: number; title: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
      throw new ValidationError("Section title cannot be empty.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const currentSection = await formRepository.findSectionById(sectionId, agg.form.id);
    if (!currentSection) throw new NotFoundError("Section not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      const section = await formRepository.updateSectionInTx(tx, sectionId, agg.form.id, input.title.trim());
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
    input: { expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const section = await formRepository.findSectionById(sectionId, agg.form.id);
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

      await formRepository.deleteSectionInTx(tx, sectionId, agg.form.id);

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
    input: { expectedRevision: number; tabId: string; sectionIds: string[] },
    context: SessionContext
  ): Promise<{ sections: FormSectionRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.tabId) throw new ValidationError("tabId is required.");
    if (!Array.isArray(input.sectionIds)) throw new ValidationError("sectionIds must be an array.");

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const tab = await formRepository.findTabById(input.tabId, agg.form.id);
    if (!tab) throw new NotFoundError("Tab not found");

    const existingSections = agg.sections.filter((s) => s.tabId === input.tabId);
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
    input: { expectedRevision: number; targetTabId: string },
    context: SessionContext
  ): Promise<{ section: FormSectionRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.targetTabId) throw new ValidationError("targetTabId is required.");

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const section = await formRepository.findSectionById(sectionId, agg.form.id);
    if (!section) throw new NotFoundError("Section not found");

    const targetTab = await formRepository.findTabById(input.targetTabId, agg.form.id);
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
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const section = await formRepository.findSectionById(sectionId, agg.form.id);
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
          formId: agg.form.id,
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
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const currentField = await formRepository.findFieldRefById(fieldRefId, agg.form.id);
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

      const updated = await formRepository.updateFieldRefInTx(tx, fieldRefId, agg.form.id, {
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
    input: { expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const fieldRef = await formRepository.findFieldRefById(fieldRefId, agg.form.id);
    if (!fieldRef) throw new NotFoundError("Field reference not found");

    const db = getDb();
    return db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx, solutionId, orgId, input.expectedRevision, {}
      );
      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", { expectedRevision: input.expectedRevision });
      }

      await formRepository.deleteFieldRefInTx(tx, fieldRefId, agg.form.id);

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
    input: { expectedRevision: number; sectionId: string; fieldReferenceIds: string[] },
    context: SessionContext
  ): Promise<{ fieldReferences: FormFieldRefRow[]; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.sectionId) throw new ValidationError("sectionId is required.");
    if (!Array.isArray(input.fieldReferenceIds)) throw new ValidationError("fieldReferenceIds must be an array.");

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const section = await formRepository.findSectionById(input.sectionId, agg.form.id);
    if (!section) throw new NotFoundError("Section not found");

    const existingFields = agg.fields.filter((f) => f.sectionId === input.sectionId);
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
    input: { expectedRevision: number; targetSectionId: string },
    context: SessionContext
  ): Promise<{ fieldReference: FormFieldRefRow; solutionRevision: number }> {
    if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision)) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }
    if (!input.targetSectionId) throw new ValidationError("targetSectionId is required.");

    const orgId = context.activeOrganisation.id;
    const agg = await formRepository.getFormAggregate(solutionId, orgId);
    if (!agg) throw new NotFoundError("Solution or Form not found");

    const fieldRef = await formRepository.findFieldRefById(fieldRefId, agg.form.id);
    if (!fieldRef) throw new NotFoundError("Field reference not found");

    const targetSection = await formRepository.findSectionById(input.targetSectionId, agg.form.id);
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
