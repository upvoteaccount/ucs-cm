import { eq, and, asc, max } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  solutions,
  choiceLists,
  choiceOptions,
  solutionProperties,
} from "../../infrastructure/db/schema";
import { DbTransaction } from "./solution.repository";

export interface ChoiceListRow {
  id: string;
  solutionId: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChoiceOptionRow {
  id: string;
  choiceListId: string;
  key: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ChoiceListRepository {
  /**
   * Lists choice lists for a solution scoped strictly to active organisation.
   * Ordered deterministically by createdAt ASC with id ASC as stable tie-breaker.
   */
  async listChoiceListsBySolution(
    solutionId: string,
    organisationId: string
  ): Promise<ChoiceListRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: choiceLists.id,
        solutionId: choiceLists.solutionId,
        key: choiceLists.key,
        name: choiceLists.name,
        description: choiceLists.description,
        createdAt: choiceLists.createdAt,
        updatedAt: choiceLists.updatedAt,
      })
      .from(choiceLists)
      .innerJoin(solutions, eq(choiceLists.solutionId, solutions.id))
      .where(
        and(
          eq(choiceLists.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .orderBy(asc(choiceLists.createdAt), asc(choiceLists.id));

    return rows;
  }

  /**
   * Reads a single choice list by ID scoped strictly to Solution ID and active organisation ID.
   */
  async findChoiceListById(
    choiceListId: string,
    solutionId: string,
    organisationId: string
  ): Promise<ChoiceListRow | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: choiceLists.id,
        solutionId: choiceLists.solutionId,
        key: choiceLists.key,
        name: choiceLists.name,
        description: choiceLists.description,
        createdAt: choiceLists.createdAt,
        updatedAt: choiceLists.updatedAt,
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
   * Creates a choice list record within a transaction.
   */
  async createChoiceListInTx(
    tx: DbTransaction,
    data: {
      solutionId: string;
      key: string;
      name: string;
      description?: string | null;
    }
  ): Promise<ChoiceListRow> {
    const [row] = await tx
      .insert(choiceLists)
      .values({
        solutionId: data.solutionId,
        key: data.key,
        name: data.name,
        description: data.description || null,
      })
      .returning();

    return row;
  }

  /**
   * Updates choice list name and description within a transaction.
   */
  async updateChoiceListInTx(
    tx: DbTransaction,
    choiceListId: string,
    solutionId: string,
    data: {
      name?: string;
      description?: string | null;
    }
  ): Promise<ChoiceListRow | null> {
    const now = new Date();
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined) updateValues.description = data.description;

    const [updatedRow] = await tx
      .update(choiceLists)
      .set(updateValues)
      .where(
        and(
          eq(choiceLists.id, choiceListId),
          eq(choiceLists.solutionId, solutionId)
        )
      )
      .returning();

    return updatedRow || null;
  }

  /**
   * Lists options for a choice list in deterministic displayOrder ASC order.
   */
  async listOptionsByChoiceList(choiceListId: string, tx?: DbTransaction): Promise<ChoiceOptionRow[]> {
    const client = tx || getDb();
    const rows = await client
      .select({
        id: choiceOptions.id,
        choiceListId: choiceOptions.choiceListId,
        key: choiceOptions.key,
        label: choiceOptions.label,
        displayOrder: choiceOptions.displayOrder,
        isActive: choiceOptions.isActive,
        createdAt: choiceOptions.createdAt,
        updatedAt: choiceOptions.updatedAt,
      })
      .from(choiceOptions)
      .where(eq(choiceOptions.choiceListId, choiceListId))
      .orderBy(asc(choiceOptions.displayOrder), asc(choiceOptions.id));

    return rows;
  }

  /**
   * Finds a single option by ID for a choice list.
   */
  async findOptionById(
    optionId: string,
    choiceListId: string
  ): Promise<ChoiceOptionRow | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: choiceOptions.id,
        choiceListId: choiceOptions.choiceListId,
        key: choiceOptions.key,
        label: choiceOptions.label,
        displayOrder: choiceOptions.displayOrder,
        isActive: choiceOptions.isActive,
        createdAt: choiceOptions.createdAt,
        updatedAt: choiceOptions.updatedAt,
      })
      .from(choiceOptions)
      .where(
        and(
          eq(choiceOptions.id, optionId),
          eq(choiceOptions.choiceListId, choiceListId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Returns current maximum displayOrder for options in a choice list (0 if empty).
   */
  async getMaxDisplayOrderInTx(
    tx: DbTransaction,
    choiceListId: string
  ): Promise<number> {
    const [res] = await tx
      .select({ maxOrder: max(choiceOptions.displayOrder) })
      .from(choiceOptions)
      .where(eq(choiceOptions.choiceListId, choiceListId));

    return res?.maxOrder ? Number(res.maxOrder) : 0;
  }

  /**
   * Creates a choice option record within a transaction.
   */
  async createOptionInTx(
    tx: DbTransaction,
    data: {
      choiceListId: string;
      key: string;
      label: string;
      displayOrder: number;
    }
  ): Promise<ChoiceOptionRow> {
    const [row] = await tx
      .insert(choiceOptions)
      .values({
        choiceListId: data.choiceListId,
        key: data.key,
        label: data.label,
        displayOrder: data.displayOrder,
        isActive: true,
      })
      .returning();

    return row;
  }

  /**
   * Updates choice option label within a transaction.
   */
  async updateOptionInTx(
    tx: DbTransaction,
    optionId: string,
    choiceListId: string,
    data: {
      label?: string;
    }
  ): Promise<ChoiceOptionRow | null> {
    const now = new Date();
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.label !== undefined) updateValues.label = data.label;

    const [updatedRow] = await tx
      .update(choiceOptions)
      .set(updateValues)
      .where(
        and(
          eq(choiceOptions.id, optionId),
          eq(choiceOptions.choiceListId, choiceListId)
        )
      )
      .returning();

    return updatedRow || null;
  }

  /**
   * Finds a single option by key for a choice list.
   */
  async findOptionByKey(
    key: string,
    choiceListId: string
  ): Promise<ChoiceOptionRow | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: choiceOptions.id,
        choiceListId: choiceOptions.choiceListId,
        key: choiceOptions.key,
        label: choiceOptions.label,
        displayOrder: choiceOptions.displayOrder,
        isActive: choiceOptions.isActive,
        createdAt: choiceOptions.createdAt,
        updatedAt: choiceOptions.updatedAt,
      })
      .from(choiceOptions)
      .where(
        and(
          eq(choiceOptions.key, key),
          eq(choiceOptions.choiceListId, choiceListId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Deactivates a choice option record (isActive = false) within a transaction.
   */
  async deactivateOptionInTx(
    tx: DbTransaction,
    optionId: string,
    choiceListId: string
  ): Promise<ChoiceOptionRow | null> {
    const now = new Date();
    const [updatedRow] = await tx
      .update(choiceOptions)
      .set({
        isActive: false,
        updatedAt: now,
      })
      .where(
        and(
          eq(choiceOptions.id, optionId),
          eq(choiceOptions.choiceListId, choiceListId)
        )
      )
      .returning();

    return updatedRow || null;
  }

  /**
   * Reactivates a choice option record (isActive = true) within a transaction.
   */
  async reactivateOptionInTx(
    tx: DbTransaction,
    optionId: string,
    choiceListId: string
  ): Promise<ChoiceOptionRow | null> {
    const now = new Date();
    const [updatedRow] = await tx
      .update(choiceOptions)
      .set({
        isActive: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(choiceOptions.id, optionId),
          eq(choiceOptions.choiceListId, choiceListId)
        )
      )
      .returning();

    return updatedRow || null;
  }

  /**
   * Atomically reorders options in a choice list within a transaction.
   * Uses temporary negative display orders to prevent unique constraint collisions during update.
   */
  async reorderOptionsInTx(
    tx: DbTransaction,
    choiceListId: string,
    orderedOptionIds: string[]
  ): Promise<ChoiceOptionRow[]> {
    const now = new Date();
    const currentMax = await this.getMaxDisplayOrderInTx(tx, choiceListId);
    const temporaryBase = currentMax + orderedOptionIds.length + 1;

    // Step 1: Assign temporary positive offset orders to avoid constraint collisions
    for (let i = 0; i < orderedOptionIds.length; i++) {
      const id = orderedOptionIds[i];
      await tx
        .update(choiceOptions)
        .set({
          displayOrder: temporaryBase + i + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(choiceOptions.id, id),
            eq(choiceOptions.choiceListId, choiceListId)
          )
        );
    }

    // Step 2: Assign target positive orders (1-based index)
    for (let i = 0; i < orderedOptionIds.length; i++) {
      const id = orderedOptionIds[i];
      await tx
        .update(choiceOptions)
        .set({
          displayOrder: i + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(choiceOptions.id, id),
            eq(choiceOptions.choiceListId, choiceListId)
          )
        );
    }

    return this.listOptionsByChoiceList(choiceListId, tx);
  }

  async findDependentProperties(
    choiceListId: string
  ): Promise<{ id: string; label: string }[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: solutionProperties.id,
        label: solutionProperties.label,
      })
      .from(solutionProperties)
      .where(eq(solutionProperties.choiceListId, choiceListId));

    return rows;
  }

  async deleteChoiceListInTx(
    tx: DbTransaction,
    choiceListId: string,
    solutionId: string
  ): Promise<boolean> {
    const res = await tx
      .delete(choiceLists)
      .where(
        and(
          eq(choiceLists.id, choiceListId),
          eq(choiceLists.solutionId, solutionId)
        )
      )
      .returning({ id: choiceLists.id });

    return res.length > 0;
  }
}

export const choiceListRepository = new ChoiceListRepository();
