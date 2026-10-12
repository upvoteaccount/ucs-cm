import { eq, and, asc, inArray } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  solutions,
  solutionQueues,
  queueUserAssignments,
  organisationMemberships,
  users,
} from "../../infrastructure/db/schema";
import { DbTransaction } from "./solution.repository";

export interface SolutionQueueRow {
  id: string;
  solutionId: string;
  queueKey: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueAssignedUserRow {
  id: string; // user id
  fullName: string;
  email: string;
  assignedAt: Date;
}

export interface EligibleUserRow {
  id: string; // user id
  fullName: string;
  email: string;
}

export class SolutionQueueRepository {
  /**
   * Lists work queues for a solution scoped strictly to the active organisation.
   * Ordered deterministically by name ASC with id ASC tie-breaker.
   */
  async listBySolution(
    solutionId: string,
    organisationId: string
  ): Promise<SolutionQueueRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: solutionQueues.id,
        solutionId: solutionQueues.solutionId,
        queueKey: solutionQueues.queueKey,
        name: solutionQueues.name,
        description: solutionQueues.description,
        createdAt: solutionQueues.createdAt,
        updatedAt: solutionQueues.updatedAt,
      })
      .from(solutionQueues)
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .where(
        and(
          eq(solutionQueues.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .orderBy(asc(solutionQueues.name), asc(solutionQueues.id));

    return rows;
  }

  /**
   * Finds a single queue by ID within a Solution aggregate scoped strictly to active organisation.
   */
  async findById(
    solutionId: string,
    queueId: string,
    organisationId: string
  ): Promise<SolutionQueueRow | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: solutionQueues.id,
        solutionId: solutionQueues.solutionId,
        queueKey: solutionQueues.queueKey,
        name: solutionQueues.name,
        description: solutionQueues.description,
        createdAt: solutionQueues.createdAt,
        updatedAt: solutionQueues.updatedAt,
      })
      .from(solutionQueues)
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .where(
        and(
          eq(solutionQueues.id, queueId),
          eq(solutionQueues.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Finds a queue by queueKey within a Solution aggregate.
   */
  async findByKey(
    solutionId: string,
    queueKey: string,
    organisationId: string
  ): Promise<SolutionQueueRow | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: solutionQueues.id,
        solutionId: solutionQueues.solutionId,
        queueKey: solutionQueues.queueKey,
        name: solutionQueues.name,
        description: solutionQueues.description,
        createdAt: solutionQueues.createdAt,
        updatedAt: solutionQueues.updatedAt,
      })
      .from(solutionQueues)
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .where(
        and(
          eq(solutionQueues.queueKey, queueKey),
          eq(solutionQueues.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Creates a queue in transaction.
   */
  async createQueueInTx(
    tx: DbTransaction,
    solutionId: string,
    input: {
      queueKey: string;
      name: string;
      description?: string | null;
    }
  ): Promise<SolutionQueueRow> {
    const [row] = await tx
      .insert(solutionQueues)
      .values({
        solutionId,
        queueKey: input.queueKey,
        name: input.name,
        description: input.description || null,
      })
      .returning();

    return row;
  }

  /**
   * Updates a queue in transaction.
   */
  async updateQueueInTx(
    tx: DbTransaction,
    queueId: string,
    input: {
      name?: string;
      description?: string | null;
    }
  ): Promise<SolutionQueueRow> {
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.description !== undefined) updatePayload.description = input.description;

    const [row] = await tx
      .update(solutionQueues)
      .set(updatePayload)
      .where(eq(solutionQueues.id, queueId))
      .returning();

    return row;
  }

  /**
   * Deletes a queue in transaction.
   */
  async deleteQueueInTx(tx: DbTransaction, queueId: string): Promise<void> {
    await tx.delete(solutionQueues).where(eq(solutionQueues.id, queueId));
  }

  /**
   * Lists assigned users for a queue in transaction.
   */
  async listAssignedUsersInTx(
    tx: DbTransaction,
    solutionId: string,
    queueId: string,
    organisationId: string
  ): Promise<QueueAssignedUserRow[]> {
    const rows = await tx
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        assignedAt: queueUserAssignments.assignedAt,
      })
      .from(queueUserAssignments)
      .innerJoin(users, eq(queueUserAssignments.userId, users.id))
      .innerJoin(solutionQueues, eq(queueUserAssignments.queueId, solutionQueues.id))
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .innerJoin(
        organisationMemberships,
        and(
          eq(organisationMemberships.userId, users.id),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      )
      .where(
        and(
          eq(queueUserAssignments.queueId, queueId),
          eq(queueUserAssignments.solutionId, solutionId),
          eq(solutions.organisationId, organisationId),
          eq(users.isActive, true)
        )
      )
      .orderBy(asc(users.fullName), asc(users.id));

    return rows;
  }

  /**
   * Lists assigned users for a queue.
   */
  async listAssignedUsers(
    solutionId: string,
    queueId: string,
    organisationId: string
  ): Promise<QueueAssignedUserRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        assignedAt: queueUserAssignments.assignedAt,
      })
      .from(queueUserAssignments)
      .innerJoin(users, eq(queueUserAssignments.userId, users.id))
      .innerJoin(solutionQueues, eq(queueUserAssignments.queueId, solutionQueues.id))
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .innerJoin(
        organisationMemberships,
        and(
          eq(organisationMemberships.userId, users.id),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      )
      .where(
        and(
          eq(queueUserAssignments.queueId, queueId),
          eq(queueUserAssignments.solutionId, solutionId),
          eq(solutions.organisationId, organisationId),
          eq(users.isActive, true)
        )
      )
      .orderBy(asc(users.fullName), asc(users.id));

    return rows;
  }

  /**
   * Lists eligible active users in the organisation for Studio assignment.
   */
  async listEligibleUsers(organisationId: string): Promise<EligibleUserRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .innerJoin(
        organisationMemberships,
        and(
          eq(organisationMemberships.userId, users.id),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      )
      .where(eq(users.isActive, true))
      .orderBy(asc(users.fullName), asc(users.id));

    return rows;
  }

  /**
   * Sets/replaces assigned users for a queue in transaction.
   * Enforces that assigned users belong to active memberships in active organisation.
   */
  async setQueueUsersInTx(
    tx: DbTransaction,
    solutionId: string,
    queueId: string,
    organisationId: string,
    userIds: string[]
  ): Promise<void> {
    // 1. Delete existing assignments for queue
    await tx.delete(queueUserAssignments).where(eq(queueUserAssignments.queueId, queueId));

    if (userIds.length === 0) return;

    // 2. Validate tenant-safe active memberships
    const validUsers = await tx
      .select({ userId: users.id })
      .from(users)
      .innerJoin(
        organisationMemberships,
        and(
          eq(organisationMemberships.userId, users.id),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      )
      .where(and(inArray(users.id, userIds), eq(users.isActive, true)));

    const validUserIds = new Set(validUsers.map((u) => u.userId));
    const invalidUsers = userIds.filter((id) => !validUserIds.has(id));

    if (invalidUsers.length > 0) {
      throw new Error(`Cannot assign user(s) not active in the current organisation: ${invalidUsers.join(", ")}`);
    }

    // 3. Insert user assignments
    await tx.insert(queueUserAssignments).values(
      userIds.map((userId) => ({
        solutionId,
        queueId,
        userId,
      }))
    );
  }

  /**
   * Removes a single user from a queue in transaction.
   */
  async removeUserFromQueueInTx(
    tx: DbTransaction,
    queueId: string,
    userId: string
  ): Promise<void> {
    await tx
      .delete(queueUserAssignments)
      .where(
        and(
          eq(queueUserAssignments.queueId, queueId),
          eq(queueUserAssignments.userId, userId)
        )
      );
  }

  /**
   * Counts assigned users per queue in a solution.
   */
  async countAssignedUsersPerQueue(
    solutionId: string,
    organisationId: string
  ): Promise<Record<string, number>> {
    const db = getDb();
    const rows = await db
      .select({
        queueId: queueUserAssignments.queueId,
      })
      .from(queueUserAssignments)
      .innerJoin(solutionQueues, eq(queueUserAssignments.queueId, solutionQueues.id))
      .innerJoin(solutions, eq(solutionQueues.solutionId, solutions.id))
      .innerJoin(
        organisationMemberships,
        and(
          eq(organisationMemberships.userId, queueUserAssignments.userId),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      )
      .where(
        and(
          eq(queueUserAssignments.solutionId, solutionId),
          eq(solutions.organisationId, organisationId)
        )
      );

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.queueId] = (counts[r.queueId] || 0) + 1;
    }
    return counts;
  }
}

export const solutionQueueRepository = new SolutionQueueRepository();
