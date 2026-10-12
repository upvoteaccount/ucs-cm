import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository, SolutionRow } from "./solution.repository";
import { validateSolutionPrefix } from "./solution-identity";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors";

export interface CreateSolutionInput {
  name: string;
  description?: string | null;
  solutionPrefix: string;
}

export interface UpdateSolutionInput {
  expectedRevision: number;
  name?: string;
  description?: string | null;
}

export class SolutionService {
  /**
   * Lists solutions for the active organisation.
   */
  async listSolutions(context: SessionContext): Promise<SolutionRow[]> {
    return solutionRepository.listByOrganisation(context.activeOrganisation.id);
  }

  /**
   * Fetches a solution by ID for the active organisation.
   * Throws 404 NotFoundError if missing or belonging to another organisation.
   */
  async getSolutionById(id: string, context: SessionContext): Promise<SolutionRow> {
    const solution = await solutionRepository.findById(id, context.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }
    return solution;
  }

  /**
   * Creates a draft Solution aggregate, provisions exactly 1 initial form & 1 default tab,
   * and records a SOLUTION_CREATED audit event in a single database transaction.
   * Race-safe: catches database unique violation (code 23505) and translates into structured 409 ConflictError.
   */
  async createSolution(
    input: CreateSolutionInput,
    context: SessionContext
  ): Promise<SolutionRow> {
    if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
      throw new ValidationError("Solution name is required.");
    }
    if (input.name.length > 255) {
      throw new ValidationError("Solution name must not exceed 255 characters.");
    }
    if (!input.solutionPrefix || typeof input.solutionPrefix !== "string") {
      throw new ValidationError("Solution prefix is required.");
    }

    const cleanPrefix = validateSolutionPrefix(input.solutionPrefix);
    const orgId = context.activeOrganisation.id;

    // Optional preliminary check for quick UX feedback
    const existing = await solutionRepository.findByPrefix(cleanPrefix, orgId);
    if (existing) {
      throw new ConflictError(
        `Solution prefix '${cleanPrefix}' is already in use within this organisation.`
      );
    }

    const db = getDb();

    try {
      // Atomic transaction: Solution + Initial Form + Default Tab + Transactional Audit Event
      return await db.transaction(async (tx) => {
        // 1. Create Solution aggregate
        const solution = await solutionRepository.createSolutionInTx(tx, {
          organisationId: orgId,
          name: input.name.trim(),
          description: input.description ?? null,
          solutionPrefix: cleanPrefix,
        });

        // 2. Provision system forms (Add Case Form & Case View Form) with default tabs
        const forms = await solutionRepository.createSystemFormsInTx(tx, solution.id);

        // 3. Record SOLUTION_CREATED audit event in the same transaction
        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "SOLUTION_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "SOLUTION",
          entityId: solution.id,
          afterState: {
            id: solution.id,
            name: solution.name,
            solutionPrefix: solution.solutionPrefix,
            status: solution.status,
            revision: solution.revision,
          },
          metadata: {
            provisionedForms: [
              { formId: forms.addCaseForm.id, formType: "ADD_CASE", formKey: "add_case" },
              { formId: forms.caseViewForm.id, formType: "CASE_VIEW", formKey: "case_view" },
            ],
          },
        });

        return solution;
      });
    } catch (err: unknown) {
      // Authoritative database-level unique constraint protection
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "23505"
      ) {
        throw new ConflictError(
          `Solution prefix '${cleanPrefix}' is already in use within this organisation.`
        );
      }
      throw err;
    }
  }

  /**
   * Updates Solution name and description using a SINGLE ATOMIC compare-and-update SQL operation
   * scoped by Solution ID, active organisation ID, and expected revision.
   * If update affects 0 rows, writes zero audit events and throws 409 ConflictError (or 404 if missing).
   */
  async updateSolution(
    id: string,
    input: UpdateSolutionInput,
    context: SessionContext
  ): Promise<SolutionRow> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (input.name !== undefined) {
      if (typeof input.name !== "string" || !input.name.trim()) {
        throw new ValidationError("Solution name cannot be empty.");
      }
      if (input.name.length > 255) {
        throw new ValidationError("Solution name must not exceed 255 characters.");
      }
    }

    const orgId = context.activeOrganisation.id;
    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation scoped by (id, orgId, expectedRevision)
      const updated = await solutionRepository.updateSolutionInTx(
        tx,
        id,
        orgId,
        input.expectedRevision,
        {
          name: input.name ? input.name.trim() : undefined,
          description: input.description,
        }
      );

      // 2. If atomic update affected 0 rows, zero audit events are written
      if (!updated) {
        const existing = await solutionRepository.findById(id, orgId);
        if (!existing) {
          throw new NotFoundError("Solution not found");
        }
        throw new ConflictError("Stale update rejected: Solution revision conflict.", {
          currentRevision: existing.revision,
          expectedRevision: input.expectedRevision,
        });
      }

      // 3. Record SOLUTION_UPDATED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "SOLUTION_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "SOLUTION",
        entityId: id,
        beforeState: {
          name: updated.name,
          description: updated.description,
          revision: input.expectedRevision,
        },
        afterState: {
          name: updated.name,
          description: updated.description,
          revision: updated.revision,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
        },
      });

      return updated;
    });
  }
}

export const solutionService = new SolutionService();
