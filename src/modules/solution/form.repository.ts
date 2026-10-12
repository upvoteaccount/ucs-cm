import { eq, and, asc, max, count } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  solutions,
  solutionForms,
  formTabs,
  formSections,
  formFieldReferences,
  formFieldQueueRules,
} from "../../infrastructure/db/schema";
import { DbTransaction } from "./solution.repository";

export interface FormRow {
  id: string;
  solutionId: string;
  formType: string;
  formKey: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormTabRow {
  id: string;
  formId: string;
  key: string;
  title: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSectionRow {
  id: string;
  formId: string;
  tabId: string;
  key: string;
  title: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormFieldRefRow {
  id: string;
  solutionId: string;
  formId: string;
  sectionId: string;
  propertyId: string;
  controlType: string;
  isVisible: boolean;
  isEnabled: boolean;
  isEditable: boolean;
  isRequired: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormFieldQueueRuleRow {
  id: string;
  solutionId: string;
  formId: string;
  fieldReferenceId: string;
  queueId: string;
  isVisible: boolean;
  isEditable: boolean;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormAggregate {
  form: FormRow;
  tabs: FormTabRow[];
  sections: FormSectionRow[];
  fields: FormFieldRefRow[];
  queueRules: FormFieldQueueRuleRow[];
}

export class FormRepository {
  /**
   * Lists all forms for a Solution scoped to active organisation.
   */
  async listFormsBySolution(
    solutionId: string,
    organisationId: string,
    tx?: DbTransaction
  ): Promise<FormRow[]> {
    const client = tx || getDb();
    const rows = await client
      .select({
        id: solutionForms.id,
        solutionId: solutionForms.solutionId,
        formType: solutionForms.formType,
        formKey: solutionForms.formKey,
        key: solutionForms.formKey,
        name: solutionForms.name,
        description: solutionForms.description,
        createdAt: solutionForms.createdAt,
        updatedAt: solutionForms.updatedAt,
      })
      .from(solutionForms)
      .innerJoin(solutions, eq(solutionForms.solutionId, solutions.id))
      .where(
        and(
          eq(solutionForms.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .orderBy(asc(solutionForms.createdAt));

    // Deterministic ordering: ADD_CASE first, CASE_VIEW second, others by createdAt
    return rows.sort((a, b) => {
      const rank = (type: string) => (type === "ADD_CASE" ? 1 : type === "CASE_VIEW" ? 2 : 3);
      return rank(a.formType) - rank(b.formType);
    });
  }

  /**
   * Finds a specific Form by ID and Solution ID scoped strictly to active organisation.
   */
  async findFormById(
    formId: string,
    solutionId: string,
    organisationId: string,
    tx?: DbTransaction
  ): Promise<FormRow | null> {
    const client = tx || getDb();
    const [row] = await client
      .select({
        id: solutionForms.id,
        solutionId: solutionForms.solutionId,
        formType: solutionForms.formType,
        formKey: solutionForms.formKey,
        key: solutionForms.formKey,
        name: solutionForms.name,
        description: solutionForms.description,
        createdAt: solutionForms.createdAt,
        updatedAt: solutionForms.updatedAt,
      })
      .from(solutionForms)
      .innerJoin(solutions, eq(solutionForms.solutionId, solutions.id))
      .where(
        and(
          eq(solutionForms.id, formId),
          eq(solutionForms.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Finds a Form by formType (e.g. 'ADD_CASE' or 'CASE_VIEW') for a Solution.
   */
  async findFormByType(
    formType: string,
    solutionId: string,
    organisationId: string,
    tx?: DbTransaction
  ): Promise<FormRow | null> {
    const client = tx || getDb();
    const [row] = await client
      .select({
        id: solutionForms.id,
        solutionId: solutionForms.solutionId,
        formType: solutionForms.formType,
        formKey: solutionForms.formKey,
        key: solutionForms.formKey,
        name: solutionForms.name,
        description: solutionForms.description,
        createdAt: solutionForms.createdAt,
        updatedAt: solutionForms.updatedAt,
      })
      .from(solutionForms)
      .innerJoin(solutions, eq(solutionForms.solutionId, solutions.id))
      .where(
        and(
          eq(solutionForms.formType, formType),
          eq(solutionForms.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Reads the single initial Form by Solution ID scoped strictly to active organisation.
   * Backward-compatible fallback: returns CASE_VIEW form or first available form.
   */
  async findInitialFormBySolution(
    solutionId: string,
    organisationId: string,
    tx?: DbTransaction
  ): Promise<FormRow | null> {
    const caseView = await this.findFormByType("CASE_VIEW", solutionId, organisationId, tx);
    if (caseView) return caseView;

    const all = await this.listFormsBySolution(solutionId, organisationId, tx);
    return all[0] || null;
  }

  /**
   * Reads the complete Form aggregate with deterministic ordering:
   * Tabs by displayOrder ASC, id ASC;
   * Sections by displayOrder ASC, id ASC;
   * Fields by displayOrder ASC, id ASC.
   */
  async getFormAggregate(
    solutionId: string,
    organisationId: string,
    formId?: string,
    tx?: DbTransaction
  ): Promise<FormAggregate | null> {
    const client = tx || getDb();
    let form: FormRow | null = null;
    if (formId) {
      form = await this.findFormById(formId, solutionId, organisationId, tx);
    } else {
      form = await this.findInitialFormBySolution(solutionId, organisationId, tx);
    }
    if (!form) return null;

    const rawTabs = await client
      .select({
        id: formTabs.id,
        formId: formTabs.formId,
        key: formTabs.tabKey,
        title: formTabs.title,
        displayOrder: formTabs.displayOrder,
        createdAt: formTabs.createdAt,
        updatedAt: formTabs.updatedAt,
      })
      .from(formTabs)
      .where(eq(formTabs.formId, form.id))
      .orderBy(asc(formTabs.displayOrder), asc(formTabs.id));

    const rawSections = await client
      .select({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      })
      .from(formSections)
      .where(eq(formSections.formId, form.id))
      .orderBy(asc(formSections.displayOrder), asc(formSections.id));

    const rawFields = await client
      .select({
        id: formFieldReferences.id,
        solutionId: formFieldReferences.solutionId,
        formId: formFieldReferences.formId,
        sectionId: formFieldReferences.sectionId,
        propertyId: formFieldReferences.propertyId,
        controlType: formFieldReferences.controlType,
        visibleOverride: formFieldReferences.visibleOverride,
        enabledOverride: formFieldReferences.enabledOverride,
        editableOverride: formFieldReferences.editableOverride,
        requiredOverride: formFieldReferences.requiredOverride,
        displayOrder: formFieldReferences.displayOrder,
        createdAt: formFieldReferences.createdAt,
        updatedAt: formFieldReferences.updatedAt,
      })
      .from(formFieldReferences)
      .where(eq(formFieldReferences.formId, form.id))
      .orderBy(asc(formFieldReferences.displayOrder), asc(formFieldReferences.id));

    const fields: FormFieldRefRow[] = rawFields.map((f) => ({
      id: f.id,
      solutionId: f.solutionId,
      formId: f.formId,
      sectionId: f.sectionId,
      propertyId: f.propertyId,
      controlType: f.controlType,
      isVisible: f.visibleOverride ?? true,
      isEnabled: f.enabledOverride ?? true,
      isEditable: f.editableOverride ?? true,
      isRequired: f.requiredOverride ?? false,
      displayOrder: f.displayOrder,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    const rawQueueRules = await client
      .select({
        id: formFieldQueueRules.id,
        solutionId: formFieldQueueRules.solutionId,
        formId: formFieldQueueRules.formId,
        fieldReferenceId: formFieldQueueRules.fieldReferenceId,
        queueId: formFieldQueueRules.queueId,
        isVisible: formFieldQueueRules.isVisible,
        isEditable: formFieldQueueRules.isEditable,
        isRequired: formFieldQueueRules.isRequired,
        createdAt: formFieldQueueRules.createdAt,
        updatedAt: formFieldQueueRules.updatedAt,
      })
      .from(formFieldQueueRules)
      .where(eq(formFieldQueueRules.formId, form.id))
      .orderBy(asc(formFieldQueueRules.createdAt), asc(formFieldQueueRules.id));

    return { form, tabs: rawTabs, sections: rawSections, fields, queueRules: rawQueueRules };
  }

  // --- TAB METHODS ---

  async findTabById(tabId: string, formId: string, tx?: DbTransaction): Promise<FormTabRow | null> {
    const client = tx || getDb();
    const [row] = await client
      .select({
        id: formTabs.id,
        formId: formTabs.formId,
        key: formTabs.tabKey,
        title: formTabs.title,
        displayOrder: formTabs.displayOrder,
        createdAt: formTabs.createdAt,
        updatedAt: formTabs.updatedAt,
      })
      .from(formTabs)
      .where(and(eq(formTabs.id, tabId), eq(formTabs.formId, formId)))
      .limit(1);
    return row || null;
  }

  async countTabsInForm(formId: string, tx?: DbTransaction): Promise<number> {
    const client = tx || getDb();
    const [res] = await client
      .select({ count: count(formTabs.id) })
      .from(formTabs)
      .where(eq(formTabs.formId, formId));
    return Number(res?.count || 0);
  }

  async getMaxTabDisplayOrderInTx(tx: DbTransaction, formId: string): Promise<number> {
    const [res] = await tx
      .select({ maxOrder: max(formTabs.displayOrder) })
      .from(formTabs)
      .where(eq(formTabs.formId, formId));
    return res?.maxOrder ? Number(res.maxOrder) : 0;
  }

  async createTabInTx(
    tx: DbTransaction,
    data: { formId: string; key: string; title: string; displayOrder: number }
  ): Promise<FormTabRow> {
    const [row] = await tx
      .insert(formTabs)
      .values({
        formId: data.formId,
        tabKey: data.key,
        title: data.title,
        displayOrder: data.displayOrder,
      })
      .returning({
        id: formTabs.id,
        formId: formTabs.formId,
        key: formTabs.tabKey,
        title: formTabs.title,
        displayOrder: formTabs.displayOrder,
        createdAt: formTabs.createdAt,
        updatedAt: formTabs.updatedAt,
      });
    return row;
  }

  async updateTabInTx(
    tx: DbTransaction,
    tabId: string,
    formId: string,
    title: string
  ): Promise<FormTabRow | null> {
    const [row] = await tx
      .update(formTabs)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(formTabs.id, tabId), eq(formTabs.formId, formId)))
      .returning({
        id: formTabs.id,
        formId: formTabs.formId,
        key: formTabs.tabKey,
        title: formTabs.title,
        displayOrder: formTabs.displayOrder,
        createdAt: formTabs.createdAt,
        updatedAt: formTabs.updatedAt,
      });
    return row || null;
  }

  async deleteTabInTx(tx: DbTransaction, tabId: string, formId: string): Promise<boolean> {
    const res = await tx
      .delete(formTabs)
      .where(and(eq(formTabs.id, tabId), eq(formTabs.formId, formId)))
      .returning();
    return res.length > 0;
  }

  async reorderTabsInTx(
    tx: DbTransaction,
    formId: string,
    orderedTabIds: string[]
  ): Promise<FormTabRow[]> {
    const now = new Date();
    const currentMax = await this.getMaxTabDisplayOrderInTx(tx, formId);
    const temporaryBase = currentMax + orderedTabIds.length + 1;

    for (let i = 0; i < orderedTabIds.length; i++) {
      await tx
        .update(formTabs)
        .set({ displayOrder: temporaryBase + i + 1, updatedAt: now })
        .where(and(eq(formTabs.id, orderedTabIds[i]), eq(formTabs.formId, formId)));
    }

    for (let i = 0; i < orderedTabIds.length; i++) {
      await tx
        .update(formTabs)
        .set({ displayOrder: i + 1, updatedAt: now })
        .where(and(eq(formTabs.id, orderedTabIds[i]), eq(formTabs.formId, formId)));
    }

    return tx
      .select({
        id: formTabs.id,
        formId: formTabs.formId,
        key: formTabs.tabKey,
        title: formTabs.title,
        displayOrder: formTabs.displayOrder,
        createdAt: formTabs.createdAt,
        updatedAt: formTabs.updatedAt,
      })
      .from(formTabs)
      .where(eq(formTabs.formId, formId))
      .orderBy(asc(formTabs.displayOrder), asc(formTabs.id));
  }

  // --- SECTION METHODS ---

  async findSectionById(sectionId: string, formId: string, tx?: DbTransaction): Promise<FormSectionRow | null> {
    const client = tx || getDb();
    const [row] = await client
      .select({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      })
      .from(formSections)
      .where(and(eq(formSections.id, sectionId), eq(formSections.formId, formId)))
      .limit(1);
    return row || null;
  }

  async countSectionsInTab(tabId: string, tx?: DbTransaction): Promise<number> {
    const client = tx || getDb();
    const [res] = await client
      .select({ count: count(formSections.id) })
      .from(formSections)
      .where(eq(formSections.tabId, tabId));
    return Number(res?.count || 0);
  }

  async getMaxSectionDisplayOrderInTx(tx: DbTransaction, tabId: string): Promise<number> {
    const [res] = await tx
      .select({ maxOrder: max(formSections.displayOrder) })
      .from(formSections)
      .where(eq(formSections.tabId, tabId));
    return res?.maxOrder ? Number(res.maxOrder) : 0;
  }

  async listSectionsInTab(tabId: string, tx?: DbTransaction): Promise<FormSectionRow[]> {
    const client = tx || getDb();
    return client
      .select({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      })
      .from(formSections)
      .where(eq(formSections.tabId, tabId))
      .orderBy(asc(formSections.displayOrder), asc(formSections.id));
  }

  async createSectionInTx(
    tx: DbTransaction,
    data: { formId: string; tabId: string; key: string; title: string; displayOrder: number }
  ): Promise<FormSectionRow> {
    const [row] = await tx
      .insert(formSections)
      .values({
        formId: data.formId,
        tabId: data.tabId,
        sectionKey: data.key,
        title: data.title,
        displayOrder: data.displayOrder,
      })
      .returning({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      });
    return row;
  }

  async updateSectionInTx(
    tx: DbTransaction,
    sectionId: string,
    formId: string,
    title: string
  ): Promise<FormSectionRow | null> {
    const [row] = await tx
      .update(formSections)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(formSections.id, sectionId), eq(formSections.formId, formId)))
      .returning({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      });
    return row || null;
  }

  async deleteSectionInTx(tx: DbTransaction, sectionId: string, formId: string): Promise<boolean> {
    const res = await tx
      .delete(formSections)
      .where(and(eq(formSections.id, sectionId), eq(formSections.formId, formId)))
      .returning();
    return res.length > 0;
  }

  async reorderSectionsInTx(
    tx: DbTransaction,
    tabId: string,
    orderedSectionIds: string[]
  ): Promise<FormSectionRow[]> {
    const now = new Date();
    const currentMax = await this.getMaxSectionDisplayOrderInTx(tx, tabId);
    const temporaryBase = currentMax + orderedSectionIds.length + 1;

    for (let i = 0; i < orderedSectionIds.length; i++) {
      await tx
        .update(formSections)
        .set({ displayOrder: temporaryBase + i + 1, updatedAt: now })
        .where(and(eq(formSections.id, orderedSectionIds[i]), eq(formSections.tabId, tabId)));
    }

    for (let i = 0; i < orderedSectionIds.length; i++) {
      await tx
        .update(formSections)
        .set({ displayOrder: i + 1, updatedAt: now })
        .where(and(eq(formSections.id, orderedSectionIds[i]), eq(formSections.tabId, tabId)));
    }

    return this.listSectionsInTab(tabId, tx);
  }

  async moveSectionInTx(
    tx: DbTransaction,
    sectionId: string,
    sourceTabId: string,
    targetTabId: string
  ): Promise<FormSectionRow> {
    const now = new Date();
    const targetMax = await this.getMaxSectionDisplayOrderInTx(tx, targetTabId);

    const [moved] = await tx
      .update(formSections)
      .set({
        tabId: targetTabId,
        displayOrder: targetMax + 1,
        updatedAt: now,
      })
      .where(and(eq(formSections.id, sectionId), eq(formSections.tabId, sourceTabId)))
      .returning({
        id: formSections.id,
        formId: formSections.formId,
        tabId: formSections.tabId,
        key: formSections.sectionKey,
        title: formSections.title,
        displayOrder: formSections.displayOrder,
        createdAt: formSections.createdAt,
        updatedAt: formSections.updatedAt,
      });

    const sourceRemaining = await this.listSectionsInTab(sourceTabId, tx);
    await this.reorderSectionsInTx(tx, sourceTabId, sourceRemaining.map((s) => s.id));

    return moved;
  }

  // --- FIELD REFERENCE METHODS ---

  async findFieldRefById(fieldRefId: string, formId: string, tx?: DbTransaction): Promise<FormFieldRefRow | null> {
    const client = tx || getDb();
    const [raw] = await client
      .select()
      .from(formFieldReferences)
      .where(and(eq(formFieldReferences.id, fieldRefId), eq(formFieldReferences.formId, formId)))
      .limit(1);

    if (!raw) return null;

    return {
      id: raw.id,
      solutionId: raw.solutionId,
      formId: raw.formId,
      sectionId: raw.sectionId,
      propertyId: raw.propertyId,
      controlType: raw.controlType,
      isVisible: raw.visibleOverride ?? true,
      isEnabled: raw.enabledOverride ?? true,
      isEditable: raw.editableOverride ?? true,
      isRequired: raw.requiredOverride ?? false,
      displayOrder: raw.displayOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async countFieldsInSection(sectionId: string, tx?: DbTransaction): Promise<number> {
    const client = tx || getDb();
    const [res] = await client
      .select({ count: count(formFieldReferences.id) })
      .from(formFieldReferences)
      .where(eq(formFieldReferences.sectionId, sectionId));
    return Number(res?.count || 0);
  }

  async getMaxFieldDisplayOrderInTx(tx: DbTransaction, sectionId: string): Promise<number> {
    const [res] = await tx
      .select({ maxOrder: max(formFieldReferences.displayOrder) })
      .from(formFieldReferences)
      .where(eq(formFieldReferences.sectionId, sectionId));
    return res?.maxOrder ? Number(res.maxOrder) : 0;
  }

  async listFieldsInSection(sectionId: string, tx?: DbTransaction): Promise<FormFieldRefRow[]> {
    const client = tx || getDb();
    const rawList = await client
      .select()
      .from(formFieldReferences)
      .where(eq(formFieldReferences.sectionId, sectionId))
      .orderBy(asc(formFieldReferences.displayOrder), asc(formFieldReferences.id));

    return rawList.map((f) => ({
      id: f.id,
      solutionId: f.solutionId,
      formId: f.formId,
      sectionId: f.sectionId,
      propertyId: f.propertyId,
      controlType: f.controlType,
      isVisible: f.visibleOverride ?? true,
      isEnabled: f.enabledOverride ?? true,
      isEditable: f.editableOverride ?? true,
      isRequired: f.requiredOverride ?? false,
      displayOrder: f.displayOrder,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  async createFieldRefInTx(
    tx: DbTransaction,
    data: {
      solutionId: string;
      formId: string;
      sectionId: string;
      propertyId: string;
      controlType: string;
      isVisible: boolean;
      isEnabled: boolean;
      isEditable: boolean;
      isRequired: boolean;
      displayOrder: number;
    }
  ): Promise<FormFieldRefRow> {
    const [raw] = await tx
      .insert(formFieldReferences)
      .values({
        solutionId: data.solutionId,
        formId: data.formId,
        sectionId: data.sectionId,
        propertyId: data.propertyId,
        controlType: data.controlType,
        visibleOverride: data.isVisible,
        enabledOverride: data.isEnabled,
        editableOverride: data.isEditable,
        requiredOverride: data.isRequired,
        displayOrder: data.displayOrder,
      })
      .returning();

    return {
      id: raw.id,
      solutionId: raw.solutionId,
      formId: raw.formId,
      sectionId: raw.sectionId,
      propertyId: raw.propertyId,
      controlType: raw.controlType,
      isVisible: raw.visibleOverride ?? true,
      isEnabled: raw.enabledOverride ?? true,
      isEditable: raw.editableOverride ?? true,
      isRequired: raw.requiredOverride ?? false,
      displayOrder: raw.displayOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async updateFieldRefInTx(
    tx: DbTransaction,
    fieldRefId: string,
    formId: string,
    data: {
      controlType?: string;
      isVisible?: boolean;
      isEnabled?: boolean;
      isEditable?: boolean;
      isRequired?: boolean;
    }
  ): Promise<FormFieldRefRow | null> {
    const now = new Date();
    const updateObj: Record<string, unknown> = { updatedAt: now };

    if (data.controlType !== undefined) updateObj.controlType = data.controlType;
    if (data.isVisible !== undefined) updateObj.visibleOverride = data.isVisible;
    if (data.isEnabled !== undefined) updateObj.enabledOverride = data.isEnabled;
    if (data.isEditable !== undefined) updateObj.editableOverride = data.isEditable;
    if (data.isRequired !== undefined) updateObj.requiredOverride = data.isRequired;

    const [raw] = await tx
      .update(formFieldReferences)
      .set(updateObj)
      .where(and(eq(formFieldReferences.id, fieldRefId), eq(formFieldReferences.formId, formId)))
      .returning();

    if (!raw) return null;

    return {
      id: raw.id,
      solutionId: raw.solutionId,
      formId: raw.formId,
      sectionId: raw.sectionId,
      propertyId: raw.propertyId,
      controlType: raw.controlType,
      isVisible: raw.visibleOverride ?? true,
      isEnabled: raw.enabledOverride ?? true,
      isEditable: raw.editableOverride ?? true,
      isRequired: raw.requiredOverride ?? false,
      displayOrder: raw.displayOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async deleteFieldRefInTx(tx: DbTransaction, fieldRefId: string, formId: string): Promise<boolean> {
    const res = await tx
      .delete(formFieldReferences)
      .where(and(eq(formFieldReferences.id, fieldRefId), eq(formFieldReferences.formId, formId)))
      .returning();
    return res.length > 0;
  }

  async reorderFieldsInTx(
    tx: DbTransaction,
    sectionId: string,
    orderedFieldIds: string[]
  ): Promise<FormFieldRefRow[]> {
    const now = new Date();
    const currentMax = await this.getMaxFieldDisplayOrderInTx(tx, sectionId);
    const temporaryBase = currentMax + orderedFieldIds.length + 1;

    for (let i = 0; i < orderedFieldIds.length; i++) {
      await tx
        .update(formFieldReferences)
        .set({ displayOrder: temporaryBase + i + 1, updatedAt: now })
        .where(and(eq(formFieldReferences.id, orderedFieldIds[i]), eq(formFieldReferences.sectionId, sectionId)));
    }

    for (let i = 0; i < orderedFieldIds.length; i++) {
      await tx
        .update(formFieldReferences)
        .set({ displayOrder: i + 1, updatedAt: now })
        .where(and(eq(formFieldReferences.id, orderedFieldIds[i]), eq(formFieldReferences.sectionId, sectionId)));
    }

    return this.listFieldsInSection(sectionId, tx);
  }

  async moveFieldInTx(
    tx: DbTransaction,
    fieldRefId: string,
    sourceSectionId: string,
    targetSectionId: string
  ): Promise<FormFieldRefRow> {
    const now = new Date();
    const targetMax = await this.getMaxFieldDisplayOrderInTx(tx, targetSectionId);

    const [raw] = await tx
      .update(formFieldReferences)
      .set({
        sectionId: targetSectionId,
        displayOrder: targetMax + 1,
        updatedAt: now,
      })
      .where(and(eq(formFieldReferences.id, fieldRefId), eq(formFieldReferences.sectionId, sourceSectionId)))
      .returning();

    const sourceRemaining = await this.listFieldsInSection(sourceSectionId, tx);
    await this.reorderFieldsInTx(tx, sourceSectionId, sourceRemaining.map((f) => f.id));

    return {
      id: raw.id,
      solutionId: raw.solutionId,
      formId: raw.formId,
      sectionId: raw.sectionId,
      propertyId: raw.propertyId,
      controlType: raw.controlType,
      isVisible: raw.visibleOverride ?? true,
      isEnabled: raw.enabledOverride ?? true,
      isEditable: raw.editableOverride ?? true,
      isRequired: raw.requiredOverride ?? false,
      displayOrder: raw.displayOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  /**
   * Atomically synchronizes a full Form draft aggregate in a dependency-safe manner:
   * 1. Deletions (Child-first): Fields -> Sections -> Tabs
   * 2. Upserts/Inserts (Parent-first): Tabs -> Sections -> Fields
   */
  async saveFormAggregateInTx(
    tx: DbTransaction,
    solutionId: string,
    organisationId: string,
    formId: string,
    draft: {
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
    }
  ): Promise<FormAggregate> {
    const now = new Date();

    // 0. Fetch form type to determine static vs per-queue behavior semantics
    const [formRecord] = await tx
      .select({ id: solutionForms.id, formType: solutionForms.formType })
      .from(solutionForms)
      .where(eq(solutionForms.id, formId))
      .limit(1);
    const isAddCase = formRecord?.formType === "ADD_CASE";

    // 1. Fetch current baseline state for scoping and diffing
    const existingTabs = await tx
      .select()
      .from(formTabs)
      .where(eq(formTabs.formId, formId));
    const existingSections = await tx
      .select()
      .from(formSections)
      .where(eq(formSections.formId, formId));
    const existingFields = await tx
      .select()
      .from(formFieldReferences)
      .where(eq(formFieldReferences.formId, formId));

    const existingTabMap = new Map(existingTabs.map((t) => [t.id, t]));
    const existingSectionMap = new Map(existingSections.map((s) => [s.id, s]));
    const existingFieldMap = new Map(existingFields.map((f) => [f.id, f]));

    // ID mapping for client-generated / temp IDs -> authoritative DB UUIDs
    const idMap = new Map<string, string>();

    const submittedTabIds = new Set(
      draft.tabs.map((t) => t.id).filter((id): id is string => !!id && existingTabMap.has(id))
    );
    const submittedSectionIds = new Set(
      draft.sections.map((s) => s.id).filter((id): id is string => !!id && existingSectionMap.has(id))
    );
    const submittedFieldIds = new Set(
      draft.fields.map((f) => f.id).filter((id): id is string => !!id && existingFieldMap.has(id))
    );

    // 2. Shift existing rows to high temporary displayOrder to avoid unique constraint collisions
    for (let i = 0; i < existingTabs.length; i++) {
      await tx
        .update(formTabs)
        .set({ displayOrder: 10000 + i + 1, updatedAt: now })
        .where(eq(formTabs.id, existingTabs[i].id));
    }
    for (let i = 0; i < existingSections.length; i++) {
      await tx
        .update(formSections)
        .set({ displayOrder: 10000 + i + 1, updatedAt: now })
        .where(eq(formSections.id, existingSections[i].id));
    }
    for (let i = 0; i < existingFields.length; i++) {
      await tx
        .update(formFieldReferences)
        .set({ displayOrder: 10000 + i + 1, updatedAt: now })
        .where(eq(formFieldReferences.id, existingFields[i].id));
    }

    // 3. Parent-first Upsert: Tabs
    for (let i = 0; i < draft.tabs.length; i++) {
      const t = draft.tabs[i];
      const targetOrder = i + 1;
      const cleanTitle = t.title.trim();

      if (t.id && existingTabMap.has(t.id)) {
        await tx
          .update(formTabs)
          .set({ title: cleanTitle, displayOrder: targetOrder, updatedAt: now })
          .where(eq(formTabs.id, t.id));
        idMap.set(t.id, t.id);
      } else {
        const generatedKey = t.key && t.key.trim() ? t.key.trim() : `tab_${Math.random().toString(36).substring(7)}`;
        const [inserted] = await tx
          .insert(formTabs)
          .values({
            formId,
            tabKey: generatedKey,
            title: cleanTitle,
            displayOrder: targetOrder,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (t.id) {
          idMap.set(t.id, inserted.id);
        }
      }
    }

    // 4. Parent-first Upsert: Sections
    const tabSectionOrderCounters = new Map<string, number>();

    for (let i = 0; i < draft.sections.length; i++) {
      const s = draft.sections[i];
      const resolvedTabId = idMap.get(s.tabId) || s.tabId;
      const currentOrderInTab = (tabSectionOrderCounters.get(resolvedTabId) || 0) + 1;
      tabSectionOrderCounters.set(resolvedTabId, currentOrderInTab);
      const cleanTitle = s.title.trim();

      if (s.id && existingSectionMap.has(s.id)) {
        await tx
          .update(formSections)
          .set({
            tabId: resolvedTabId,
            title: cleanTitle,
            displayOrder: currentOrderInTab,
            updatedAt: now,
          })
          .where(eq(formSections.id, s.id));
        idMap.set(s.id, s.id);
      } else {
        const generatedKey = s.key && s.key.trim() ? s.key.trim() : `sec_${Math.random().toString(36).substring(7)}`;
        const [inserted] = await tx
          .insert(formSections)
          .values({
            formId,
            tabId: resolvedTabId,
            sectionKey: generatedKey,
            title: cleanTitle,
            displayOrder: currentOrderInTab,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (s.id) {
          idMap.set(s.id, inserted.id);
        }
      }
    }

    // 5. Parent-first Upsert: Fields
    const sectionFieldOrderCounters = new Map<string, number>();

    for (let i = 0; i < draft.fields.length; i++) {
      const f = draft.fields[i];
      const resolvedSectionId = idMap.get(f.sectionId) || f.sectionId;
      const currentOrderInSec = (sectionFieldOrderCounters.get(resolvedSectionId) || 0) + 1;
      sectionFieldOrderCounters.set(resolvedSectionId, currentOrderInSec);

      // ADD_CASE supports static visible/editable/required overrides
      // CASE_VIEW relies on queue rules; static overrides remain default
      const visibleOverride = isAddCase ? (f.isVisible ?? true) : true;
      const editableOverride = isAddCase ? (f.isEditable ?? true) : true;
      const requiredOverride = isAddCase ? (f.isRequired ?? false) : false;

      if (f.id && existingFieldMap.has(f.id)) {
        await tx
          .update(formFieldReferences)
          .set({
            sectionId: resolvedSectionId,
            controlType: f.controlType,
            visibleOverride,
            editableOverride,
            requiredOverride,
            displayOrder: currentOrderInSec,
            updatedAt: now,
          })
          .where(eq(formFieldReferences.id, f.id));
        idMap.set(f.id, f.id);
      } else {
        const [inserted] = await tx
          .insert(formFieldReferences)
          .values({
            solutionId,
            formId,
            sectionId: resolvedSectionId,
            propertyId: f.propertyId,
            controlType: f.controlType,
            visibleOverride,
            editableOverride,
            requiredOverride,
            displayOrder: currentOrderInSec,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (f.id) {
          idMap.set(f.id, inserted.id);
        }
      }
    }

    // 6. Synchronize Queue Rules
    if (!isAddCase) {
      // CASE_VIEW: synchronize sparse queue rules
      const existingQueueRules = await tx
        .select()
        .from(formFieldQueueRules)
        .where(eq(formFieldQueueRules.formId, formId));

      const existingRuleMap = new Map(
        existingQueueRules.map((r) => [`${r.fieldReferenceId}:${r.queueId}`, r])
      );
      const activeNonDefaultRuleKeys = new Set<string>();

      if (Array.isArray(draft.queueRules)) {
        for (const qr of draft.queueRules) {
          const resolvedFieldRefId = idMap.get(qr.fieldReferenceId) || qr.fieldReferenceId;
          const isVisible = qr.isVisible ?? true;
          const isEditable = qr.isEditable ?? true;
          const isRequired = qr.isRequired ?? false;
          const isDefault = isVisible === true && isEditable === true && isRequired === false;

          if (isDefault) {
            // Sparse storage: do not persist all-default rules
            continue;
          }

          const ruleKey = `${resolvedFieldRefId}:${qr.queueId}`;
          activeNonDefaultRuleKeys.add(ruleKey);

          const existing = existingRuleMap.get(ruleKey);
          if (existing) {
            await tx
              .update(formFieldQueueRules)
              .set({
                isVisible,
                isEditable,
                isRequired,
                updatedAt: now,
              })
              .where(eq(formFieldQueueRules.id, existing.id));
          } else {
            await tx.insert(formFieldQueueRules).values({
              solutionId,
              formId,
              fieldReferenceId: resolvedFieldRefId,
              queueId: qr.queueId,
              isVisible,
              isEditable,
              isRequired,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      // Prune existing rules that are no longer present in draft or became all-default
      for (const eqr of existingQueueRules) {
        const key = `${eqr.fieldReferenceId}:${eqr.queueId}`;
        if (!activeNonDefaultRuleKeys.has(key)) {
          await tx.delete(formFieldQueueRules).where(eq(formFieldQueueRules.id, eqr.id));
        }
      }
    } else {
      // ADD_CASE: ensure no queue rules exist
      await tx.delete(formFieldQueueRules).where(eq(formFieldQueueRules.formId, formId));
    }

    // 7. Child-first Deletions: Fields -> Sections -> Tabs
    // Delete fields no longer present in draft
    for (const ef of existingFields) {
      if (!submittedFieldIds.has(ef.id)) {
        await tx.delete(formFieldReferences).where(eq(formFieldReferences.id, ef.id));
      }
    }

    // Delete sections no longer present in draft
    for (const es of existingSections) {
      if (!submittedSectionIds.has(es.id)) {
        await tx.delete(formSections).where(eq(formSections.id, es.id));
      }
    }

    // Delete tabs no longer present in draft
    for (const et of existingTabs) {
      if (!submittedTabIds.has(et.id)) {
        await tx.delete(formTabs).where(eq(formTabs.id, et.id));
      }
    }

    // 8. Return fresh canonical FormAggregate
    const agg = await this.getFormAggregate(solutionId, organisationId, formId, tx);
    if (!agg) {
      throw new Error("Failed to re-read form aggregate after save.");
    }
    return agg;
  }
}

export const formRepository = new FormRepository();
