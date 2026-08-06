import { eq, and, desc, asc } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import { solutions, solutionForms, formTabs } from "../../infrastructure/db/schema";
import { PgTransaction } from "drizzle-orm/pg-core";
import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { ExtractTablesWithRelations } from "drizzle-orm";

export type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export interface SolutionRow {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  solutionPrefix: string;
  revision: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SolutionRepository {
  /**
   * Lists solutions scoped to active organisation.
   * Ordered deterministically by updatedAt DESC with id ASC as stable tie-breaker.
   */
  async listByOrganisation(organisationId: string): Promise<SolutionRow[]> {
    const db = getDb();
    return db
      .select()
      .from(solutions)
      .where(eq(solutions.organisationId, organisationId))
      .orderBy(desc(solutions.updatedAt), asc(solutions.id));
  }

  /**
   * Finds a solution by ID scoped strictly to active organisation.
   * Prevents tenant cross-disclosure.
   */
  async findById(id: string, organisationId: string): Promise<SolutionRow | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(solutions)
      .where(and(eq(solutions.id, id), eq(solutions.organisationId, organisationId)))
      .limit(1);

    return row || null;
  }

  /**
   * Finds a solution by prefix scoped to active organisation.
   */
  async findByPrefix(solutionPrefix: string, organisationId: string): Promise<SolutionRow | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(solutions)
      .where(
        and(
          eq(solutions.solutionPrefix, solutionPrefix),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Creates draft Solution aggregate record within a transaction.
   */
  async createSolutionInTx(
    tx: DbTransaction,
    data: {
      organisationId: string;
      name: string;
      description?: string | null;
      solutionPrefix: string;
    }
  ): Promise<SolutionRow> {
    const [row] = await tx
      .insert(solutions)
      .values({
        organisationId: data.organisationId,
        name: data.name,
        description: data.description || null,
        solutionPrefix: data.solutionPrefix,
        revision: 1,
        status: "DRAFT",
      })
      .returning();

    return row;
  }

  /**
   * Provisions initial form record within a transaction.
   */
  async createInitialFormInTx(
    tx: DbTransaction,
    solutionId: string
  ): Promise<{ id: string; formKey: string; name: string }> {
    const [form] = await tx
      .insert(solutionForms)
      .values({
        solutionId,
        formKey: "initial_form",
        name: "Initial Form",
        description: null,
      })
      .returning();

    return form;
  }

  /**
   * Provisions default tab record within a transaction.
   */
  async createDefaultTabInTx(
    tx: DbTransaction,
    formId: string
  ): Promise<{ id: string; tabKey: string; title: string }> {
    const [tab] = await tx
      .insert(formTabs)
      .values({
        formId,
        tabKey: "tab_1",
        title: "Main",
        displayOrder: 1,
      })
      .returning();

    return tab;
  }

  /**
   * Updates solution name and description within a transaction, incrementing aggregate revision.
   * Returns updated row if optimistic concurrency revision match succeeded, or null if stale/missing.
   */
  async updateSolutionInTx(
    tx: DbTransaction,
    id: string,
    organisationId: string,
    expectedRevision: number,
    data: {
      name?: string;
      description?: string | null;
    }
  ): Promise<SolutionRow | null> {
    const now = new Date();
    const updateValues: Record<string, unknown> = {
      revision: expectedRevision + 1,
      updatedAt: now,
    };

    if (data.name !== undefined) {
      updateValues.name = data.name;
    }
    if (data.description !== undefined) {
      updateValues.description = data.description;
    }

    const [updatedRow] = await tx
      .update(solutions)
      .set(updateValues)
      .where(
        and(
          eq(solutions.id, id),
          eq(solutions.organisationId, organisationId),
          eq(solutions.revision, expectedRevision)
        )
      )
      .returning();

    return updatedRow || null;
  }
}

export const solutionRepository = new SolutionRepository();
