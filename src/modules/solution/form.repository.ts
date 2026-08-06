import { eq, and, asc, max, count } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  solutions,
  solutionForms,
  formTabs,
  formSections,
  formFieldReferences,
} from "../../infrastructure/db/schema";
import { DbTransaction } from "./solution.repository";

export interface FormRow {
  id: string;
  solutionId: string;
  key: string;
  name: string;
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

export interface FormAggregate {
  form: FormRow;
  tabs: FormTabRow[];
  sections: FormSectionRow[];
  fields: FormFieldRefRow[];
}

export class FormRepository {
  /**
   * Reads the single initial Form by Solution ID scoped strictly to active organisation.
   */
  async findInitialFormBySolution(
    solutionId: string,
    organisationId: string,
    tx?: DbTransaction
  ): Promise<FormRow | null> {
    const client = tx || getDb();
    const [row] = await client
      .select({
        id: solutionForms.id,
        solutionId: solutionForms.solutionId,
        key: solutionForms.formKey,
        name: solutionForms.name,
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
      .limit(1);

    return row || null;
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
    tx?: DbTransaction
  ): Promise<FormAggregate | null> {
    const client = tx || getDb();
    const form = await this.findInitialFormBySolution(solutionId, organisationId, tx);
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

    return { form, tabs: rawTabs, sections: rawSections, fields };
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
}

export const formRepository = new FormRepository();
