import { eq, and, asc, count, sql } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  solutions,
  solutionProperties,
  formFieldReferences,
  choiceLists,
} from "../../infrastructure/db/schema";
import { DbTransaction } from "./solution.repository";

export interface SolutionPropertyRow {
  id: string;
  solutionId: string;
  localSymbolicName: string;
  generatedTechnicalName: string;
  label: string;
  storedDataType: string;
  formatPreset: string;
  choiceListId: string | null;
  cardinality: string;
  defaultValue: string | null;
  helpText: string | null;
  isSensitive: boolean;
  validationRules: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SolutionPropertyRepository {
  /**
   * Lists data dictionary properties for a solution scoped strictly to the active organisation.
   * Ordered deterministically by createdAt ASC with id ASC as stable tie-breaker.
   */
  async listBySolution(
    solutionId: string,
    organisationId: string
  ): Promise<SolutionPropertyRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: solutionProperties.id,
        solutionId: solutionProperties.solutionId,
        localSymbolicName: solutionProperties.localSymbolicName,
        generatedTechnicalName: solutionProperties.generatedTechnicalName,
        label: solutionProperties.label,
        storedDataType: solutionProperties.storedDataType,
        formatPreset: solutionProperties.formatPreset,
        choiceListId: solutionProperties.choiceListId,
        cardinality: solutionProperties.cardinality,
        defaultValue: solutionProperties.defaultValue,
        helpText: solutionProperties.helpText,
        isSensitive: solutionProperties.isSensitive,
        validationRules: solutionProperties.validationRules,
        createdAt: solutionProperties.createdAt,
        updatedAt: solutionProperties.updatedAt,
      })
      .from(solutionProperties)
      .innerJoin(solutions, eq(solutionProperties.solutionId, solutions.id))
      .where(
        and(
          eq(solutionProperties.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .orderBy(asc(solutionProperties.createdAt), asc(solutionProperties.id));

    return rows as unknown as SolutionPropertyRow[];
  }

  /**
   * Reads a single property by ID scoped strictly to Solution ID and active organisation ID.
   */
  async findById(
    propertyId: string,
    solutionId: string,
    organisationId: string
  ): Promise<SolutionPropertyRow | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: solutionProperties.id,
        solutionId: solutionProperties.solutionId,
        localSymbolicName: solutionProperties.localSymbolicName,
        generatedTechnicalName: solutionProperties.generatedTechnicalName,
        label: solutionProperties.label,
        storedDataType: solutionProperties.storedDataType,
        formatPreset: solutionProperties.formatPreset,
        choiceListId: solutionProperties.choiceListId,
        cardinality: solutionProperties.cardinality,
        defaultValue: solutionProperties.defaultValue,
        helpText: solutionProperties.helpText,
        isSensitive: solutionProperties.isSensitive,
        validationRules: solutionProperties.validationRules,
        createdAt: solutionProperties.createdAt,
        updatedAt: solutionProperties.updatedAt,
      })
      .from(solutionProperties)
      .innerJoin(solutions, eq(solutionProperties.solutionId, solutions.id))
      .where(
        and(
          eq(solutionProperties.id, propertyId),
          eq(solutionProperties.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return (row as unknown as SolutionPropertyRow) || null;
  }

  /**
   * Finds property by local symbolic name within a Solution.
   */
  async findByLocalName(
    localSymbolicName: string,
    solutionId: string
  ): Promise<SolutionPropertyRow | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: solutionProperties.id,
        solutionId: solutionProperties.solutionId,
        localSymbolicName: solutionProperties.localSymbolicName,
        generatedTechnicalName: solutionProperties.generatedTechnicalName,
        label: solutionProperties.label,
        storedDataType: solutionProperties.storedDataType,
        formatPreset: solutionProperties.formatPreset,
        choiceListId: solutionProperties.choiceListId,
        cardinality: solutionProperties.cardinality,
        defaultValue: solutionProperties.defaultValue,
        helpText: solutionProperties.helpText,
        isSensitive: solutionProperties.isSensitive,
        validationRules: solutionProperties.validationRules,
        createdAt: solutionProperties.createdAt,
        updatedAt: solutionProperties.updatedAt,
      })
      .from(solutionProperties)
      .where(
        and(
          eq(solutionProperties.solutionId, solutionId),
          eq(solutionProperties.localSymbolicName, localSymbolicName)
        )
      )
      .limit(1);

    return (row as unknown as SolutionPropertyRow) || null;
  }

  /**
   * Checks if a choice list exists and belongs to the same Solution and organisation.
   */
  async findChoiceList(
    choiceListId: string,
    solutionId: string,
    organisationId: string
  ): Promise<{ id: string; solutionId: string } | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: choiceLists.id,
        solutionId: choiceLists.solutionId,
      })
      .from(choiceLists)
      .innerJoin(solutions, eq(choiceLists.solutionId, solutions.id))
      .where(
        and(
          eq(choiceLists.id, choiceListId),
          eq(choiceLists.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Checks if a property is used in any form layout (form_field_references).
   */
  async isPropertyUsedInFormLayout(
    propertyId: string,
    tx?: DbTransaction
  ): Promise<boolean> {
    const db = tx || getDb();
    const [res] = await db
      .select({ count: count() })
      .from(formFieldReferences)
      .where(eq(formFieldReferences.propertyId, propertyId));

    return Number(res?.count || 0) > 0;
  }

  /**
   * Inserts a new Property within a database transaction.
   */
  async createPropertyInTx(
    tx: DbTransaction,
    data: {
      solutionId: string;
      localSymbolicName: string;
      generatedTechnicalName: string;
      label: string;
      storedDataType: string;
      formatPreset?: string;
      choiceListId?: string | null;
      cardinality?: string;
      defaultValue?: string | null;
      helpText?: string | null;
      isSensitive?: boolean;
      validationRules?: Record<string, unknown> | null;
    }
  ): Promise<SolutionPropertyRow> {
    const [row] = await tx
      .insert(solutionProperties)
      .values({
        solutionId: data.solutionId,
        localSymbolicName: data.localSymbolicName,
        generatedTechnicalName: data.generatedTechnicalName,
        label: data.label,
        storedDataType: data.storedDataType,
        formatPreset: data.formatPreset || "NONE",
        choiceListId: data.choiceListId || null,
        cardinality: data.cardinality || "SINGLE",
        defaultValue: data.defaultValue || null,
        helpText: data.helpText || null,
        isSensitive: data.isSensitive ?? false,
        validationRules: (data.validationRules !== null && data.validationRules !== undefined) ? data.validationRules : sql`'null'::jsonb`,
      })
      .returning();

    return row as SolutionPropertyRow;
  }

  /**
   * Updates property canonical settings within a transaction.
   */
  async updatePropertyInTx(
    tx: DbTransaction,
    propertyId: string,
    solutionId: string,
    data: {
      localSymbolicName?: string;
      generatedTechnicalName?: string;
      label?: string;
      storedDataType?: string;
      formatPreset?: string;
      choiceListId?: string | null;
      cardinality?: string;
      defaultValue?: string | null;
      helpText?: string | null;
      isSensitive?: boolean;
      validationRules?: Record<string, unknown> | null;
    }
  ): Promise<SolutionPropertyRow | null> {
    const now = new Date();
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.localSymbolicName !== undefined) updateValues.localSymbolicName = data.localSymbolicName;
    if (data.generatedTechnicalName !== undefined) updateValues.generatedTechnicalName = data.generatedTechnicalName;
    if (data.label !== undefined) updateValues.label = data.label;
    if (data.storedDataType !== undefined) updateValues.storedDataType = data.storedDataType;
    if (data.formatPreset !== undefined) updateValues.formatPreset = data.formatPreset;
    if (data.choiceListId !== undefined) updateValues.choiceListId = data.choiceListId;
    if (data.cardinality !== undefined) updateValues.cardinality = data.cardinality;
    if (data.defaultValue !== undefined) updateValues.defaultValue = data.defaultValue;
    if (data.helpText !== undefined) updateValues.helpText = data.helpText;
    if (data.isSensitive !== undefined) updateValues.isSensitive = data.isSensitive;
    if (data.validationRules !== undefined) {
      updateValues.validationRules = data.validationRules !== null ? data.validationRules : sql`'null'::jsonb`;
    }

    const [updatedRow] = await tx
      .update(solutionProperties)
      .set(updateValues)
      .where(
        and(
          eq(solutionProperties.id, propertyId),
          eq(solutionProperties.solutionId, solutionId)
        )
      )
      .returning();

    return (updatedRow as SolutionPropertyRow) || null;
  }

  /**
   * Deletes a property within a transaction.
   */
  async deletePropertyInTx(
    tx: DbTransaction,
    propertyId: string,
    solutionId: string
  ): Promise<boolean> {
    const deleted = await tx
      .delete(solutionProperties)
      .where(
        and(
          eq(solutionProperties.id, propertyId),
          eq(solutionProperties.solutionId, solutionId)
        )
      )
      .returning({ id: solutionProperties.id });

    return deleted.length > 0;
  }
}

export const solutionPropertyRepository = new SolutionPropertyRepository();
