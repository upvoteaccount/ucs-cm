import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository } from "./solution.repository";
import { solutionQueueRepository, SolutionQueueRow, QueueAssignedUserRow, EligibleUserRow } from "./queue.repository";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";

export function generateQueueKeyFromName(solutionPrefix: string, queueName: string): string {
  const cleanPrefix = (solutionPrefix || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const normalized = (queueName || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw new ValidationError("Queue name must contain at least one alphanumeric character.");
  }

  const prefixPart = cleanPrefix || "QUEUE";
  const rawKey = `${prefixPart}_${normalized}`;
  return rawKey.slice(0, 64);
}

export interface CreateQueueInput {
  name: string;
  description?: string | null;
  expectedRevision: number;
}

export interface UpdateQueueInput {
  name?: string;
  description?: string | null;
  expectedRevision: number;
}

export interface SetQueueUsersInput {
  userIds: string[];
  expectedRevision: number;
}

export class SolutionQueueService {
  async listQueues(
    sessionCtx: SessionContext,
    solutionId: string
  ): Promise<{ queues: (SolutionQueueRow & { assignedUserCount: number })[] }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const queues = await solutionQueueRepository.listBySolution(solutionId, sessionCtx.activeOrganisation.id);
    const counts = await solutionQueueRepository.countAssignedUsersPerQueue(solutionId, sessionCtx.activeOrganisation.id);

    const result = queues.map((q) => ({
      ...q,
      assignedUserCount: counts[q.id] || 0,
    }));

    return { queues: result };
  }

  async getQueueDetails(
    sessionCtx: SessionContext,
    solutionId: string,
    queueId: string
  ): Promise<{ queue: SolutionQueueRow; assignedUsers: QueueAssignedUserRow[] }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const queue = await solutionQueueRepository.findById(solutionId, queueId, sessionCtx.activeOrganisation.id);
    if (!queue) {
      throw new NotFoundError(`Queue '${queueId}' not found in Solution.`);
    }

    const assignedUsers = await solutionQueueRepository.listAssignedUsers(solutionId, queueId, sessionCtx.activeOrganisation.id);

    return { queue, assignedUsers };
  }

  async listEligibleUsers(
    sessionCtx: SessionContext,
    solutionId: string
  ): Promise<{ users: EligibleUserRow[] }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const users = await solutionQueueRepository.listEligibleUsers(sessionCtx.activeOrganisation.id);
    return { users };
  }

  async createQueue(
    sessionCtx: SessionContext,
    solutionId: string,
    input: CreateQueueInput
  ): Promise<{ queue: SolutionQueueRow; solutionRevision: number }> {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError("Queue name is required.");
    }

    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const db = getDb();
    const queueKey = generateQueueKeyFromName(solution.solutionPrefix, input.name);

    return await db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx,
        solutionId,
        sessionCtx.activeOrganisation.id,
        input.expectedRevision,
        {}
      );

      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          expectedRevision: input.expectedRevision,
        });
      }

      const existing = await solutionQueueRepository.findByKey(solutionId, queueKey, sessionCtx.activeOrganisation.id);
      if (existing) {
        throw new ConflictError(`Queue key '${queueKey}' already exists in Solution.`);
      }

      const queue = await solutionQueueRepository.createQueueInTx(tx, solutionId, {
        queueKey,
        name: input.name.trim(),
        description: input.description,
      });

      await tx.insert(auditEvents).values({
        organisationId: sessionCtx.activeOrganisation.id,
        category: "METADATA",
        eventType: "QUEUE_CREATED",
        actorUserId: sessionCtx.user.id,
        entityType: "SOLUTION_QUEUE",
        entityId: queue.id,
        afterState: queue,
        metadata: {
          solutionId,
          queueKey: queue.queueKey,
          name: queue.name,
          newRevision: updatedSolution.revision,
        },
      });

      return { queue, solutionRevision: updatedSolution.revision };
    });
  }

  async updateQueue(
    sessionCtx: SessionContext,
    solutionId: string,
    queueId: string,
    input: UpdateQueueInput
  ): Promise<{ queue: SolutionQueueRow; solutionRevision: number }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const db = getDb();

    return await db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx,
        solutionId,
        sessionCtx.activeOrganisation.id,
        input.expectedRevision,
        {}
      );

      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          expectedRevision: input.expectedRevision,
        });
      }

      const existingQueue = await solutionQueueRepository.findById(solutionId, queueId, sessionCtx.activeOrganisation.id);
      if (!existingQueue) {
        throw new NotFoundError(`Queue '${queueId}' not found.`);
      }

      const queue = await solutionQueueRepository.updateQueueInTx(tx, queueId, {
        name: input.name ? input.name.trim() : undefined,
        description: input.description,
      });

      await tx.insert(auditEvents).values({
        organisationId: sessionCtx.activeOrganisation.id,
        category: "METADATA",
        eventType: "QUEUE_UPDATED",
        actorUserId: sessionCtx.user.id,
        entityType: "SOLUTION_QUEUE",
        entityId: queue.id,
        beforeState: existingQueue,
        afterState: queue,
        metadata: {
          solutionId,
          queueKey: queue.queueKey,
          newRevision: updatedSolution.revision,
        },
      });

      return { queue, solutionRevision: updatedSolution.revision };
    });
  }

  async deleteQueue(
    sessionCtx: SessionContext,
    solutionId: string,
    queueId: string,
    expectedRevision: number
  ): Promise<{ solutionRevision: number }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const db = getDb();

    return await db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx,
        solutionId,
        sessionCtx.activeOrganisation.id,
        expectedRevision,
        {}
      );

      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          expectedRevision,
        });
      }

      const existingQueue = await solutionQueueRepository.findById(solutionId, queueId, sessionCtx.activeOrganisation.id);
      if (!existingQueue) {
        throw new NotFoundError(`Queue '${queueId}' not found.`);
      }

      await solutionQueueRepository.deleteQueueInTx(tx, queueId);

      await tx.insert(auditEvents).values({
        organisationId: sessionCtx.activeOrganisation.id,
        category: "METADATA",
        eventType: "QUEUE_DELETED",
        actorUserId: sessionCtx.user.id,
        entityType: "SOLUTION_QUEUE",
        entityId: queueId,
        beforeState: existingQueue,
        metadata: {
          solutionId,
          queueKey: existingQueue.queueKey,
          newRevision: updatedSolution.revision,
        },
      });

      return { solutionRevision: updatedSolution.revision };
    });
  }

  async setQueueUsers(
    sessionCtx: SessionContext,
    solutionId: string,
    queueId: string,
    input: SetQueueUsersInput
  ): Promise<{ assignedUsers: QueueAssignedUserRow[]; solutionRevision: number }> {
    const solution = await solutionRepository.findById(solutionId, sessionCtx.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError(`Solution '${solutionId}' not found.`);
    }

    const db = getDb();

    return await db.transaction(async (tx) => {
      const updatedSolution = await solutionRepository.updateSolutionInTx(
        tx,
        solutionId,
        sessionCtx.activeOrganisation.id,
        input.expectedRevision,
        {}
      );

      if (!updatedSolution) {
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          expectedRevision: input.expectedRevision,
        });
      }

      const existingQueue = await solutionQueueRepository.findById(solutionId, queueId, sessionCtx.activeOrganisation.id);
      if (!existingQueue) {
        throw new NotFoundError(`Queue '${queueId}' not found.`);
      }

      try {
        await solutionQueueRepository.setQueueUsersInTx(
          tx,
          solutionId,
          queueId,
          sessionCtx.activeOrganisation.id,
          input.userIds
        );
      } catch (err: any) {
        throw new ConflictError(err.message || "Failed to set queue user assignments.");
      }

      const assignedUsers = await solutionQueueRepository.listAssignedUsersInTx(tx, solutionId, queueId, sessionCtx.activeOrganisation.id);

      await tx.insert(auditEvents).values({
        organisationId: sessionCtx.activeOrganisation.id,
        category: "METADATA",
        eventType: "QUEUE_USER_ASSIGNED",
        actorUserId: sessionCtx.user.id,
        entityType: "SOLUTION_QUEUE",
        entityId: queueId,
        metadata: {
          solutionId,
          queueKey: existingQueue.queueKey,
          assignedUserCount: assignedUsers.length,
          userIds: input.userIds,
          newRevision: updatedSolution.revision,
        },
      });

      return { assignedUsers, solutionRevision: updatedSolution.revision };
    });
  }
}

export const solutionQueueService = new SolutionQueueService();
