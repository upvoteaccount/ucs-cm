import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository } from "./solution.repository";
import {
  choiceListRepository,
  ChoiceListRow,
  ChoiceOptionRow,
} from "./choice-list.repository";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors";
import { constructChoiceListKey } from "./solution-identity";

export function validateSymbolicKey(rawKey: string, fieldName: string = "Key"): string {
  if (!rawKey || typeof rawKey !== "string") {
    throw new ValidationError(`${fieldName} is required.`);
  }
  const cleanKey = rawKey.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
  if (!cleanKey || !/^[a-z][a-z0-9_]{0,63}$/.test(cleanKey)) {
    throw new ValidationError(
      `${fieldName} must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (1 to 64 characters).`
    );
  }
  return cleanKey;
}

export interface CreateChoiceListInput {
  expectedRevision: number;
  key: string;
  name: string;
  description?: string | null;
}

export interface UpdateChoiceListInput {
  expectedRevision: number;
  name?: string;
  description?: string | null;
}

export interface CreateOptionInput {
  expectedRevision: number;
  key: string;
  label: string;
}

export interface UpdateOptionInput {
  expectedRevision: number;
  label?: string;
}

export interface DeactivateOptionInput {
  expectedRevision: number;
}

export interface ReactivateOptionInput {
  expectedRevision: number;
}

export interface ReorderOptionsInput {
  expectedRevision: number;
  optionIds: string[];
}

export class ChoiceListService {
  /**
   * Lists choice lists for a Solution.
   */
  async listChoiceLists(
    solutionId: string,
    context: SessionContext
  ): Promise<(ChoiceListRow & { options: ChoiceOptionRow[] })[]> {
    const solution = await solutionRepository.findById(
      solutionId,
      context.activeOrganisation.id
    );
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const lists = await choiceListRepository.listChoiceListsBySolution(
      solutionId,
      context.activeOrganisation.id
    );

    const listsWithOptions = await Promise.all(
      lists.map(async (cl) => {
        const options = await choiceListRepository.listOptionsByChoiceList(cl.id);
        return { ...cl, options };
      })
    );

    return listsWithOptions;
  }

  /**
   * Reads a choice list by ID for a Solution.
   */
  async getChoiceListById(
    solutionId: string,
    choiceListId: string,
    context: SessionContext
  ): Promise<ChoiceListRow & { options: ChoiceOptionRow[] }> {
    const solution = await solutionRepository.findById(
      solutionId,
      context.activeOrganisation.id
    );
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const cl = await choiceListRepository.findChoiceListById(
      choiceListId,
      solutionId,
      context.activeOrganisation.id
    );
    if (!cl) {
      throw new NotFoundError("Choice list not found");
    }

    const options = await choiceListRepository.listOptionsByChoiceList(cl.id);
    return { ...cl, options };
  }

  /**
   * Creates a Choice List record.
   * Atomic transaction: Solution revision increment + Choice List insertion + CHOICE_LIST_CREATED audit event.
   */
  async createChoiceList(
    solutionId: string,
    input: CreateChoiceListInput,
    context: SessionContext
  ): Promise<{ choiceList: ChoiceListRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
      throw new ValidationError("Choice list name is required.");
    }
    if (input.name.length > 255) {
      throw new ValidationError("Choice list name must not exceed 255 characters.");
    }

    const orgId = context.activeOrganisation.id;

    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const key = constructChoiceListKey(solution.solutionPrefix, input.key || input.name);

    const db = getDb();

    try {
      return await db.transaction(async (tx) => {
        // 1. Single atomic compare-and-update operation to increment Solution revision
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

        // 2. Create choice list
        const choiceList = await choiceListRepository.createChoiceListInTx(tx, {
          solutionId,
          key,
          name: input.name.trim(),
          description: input.description ?? null,
        });

        // 3. Record CHOICE_LIST_CREATED audit event in the same transaction
        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "CHOICE_LIST_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "CHOICE_LIST",
          entityId: choiceList.id,
          afterState: {
            id: choiceList.id,
            solutionId: choiceList.solutionId,
            key: choiceList.key,
            name: choiceList.name,
            description: choiceList.description,
          },
          metadata: {
            expectedRevision: input.expectedRevision,
            newSolutionRevision: updatedSolution.revision,
          },
        });

        return { choiceList, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;

      if (code === "23505") {
        throw new ConflictError(
          `Choice list with key '${key}' already exists in this Solution.`
        );
      }
      throw err;
    }
  }

  /**
   * Updates Choice List name and description.
   * Atomic transaction: Solution revision increment + Choice List update + CHOICE_LIST_UPDATED audit event.
   */
  async updateChoiceList(
    solutionId: string,
    choiceListId: string,
    input: UpdateChoiceListInput,
    context: SessionContext
  ): Promise<{ choiceList: ChoiceListRow; solutionRevision: number }> {
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
        throw new ValidationError("Choice list name cannot be empty.");
      }
      if (input.name.length > 255) {
        throw new ValidationError("Choice list name must not exceed 255 characters.");
      }
    }

    const orgId = context.activeOrganisation.id;
    const current = await this.getChoiceListById(solutionId, choiceListId, context);

    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
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

      // 2. Update Choice List
      const updated = await choiceListRepository.updateChoiceListInTx(
        tx,
        choiceListId,
        solutionId,
        {
          name: input.name ? input.name.trim() : undefined,
          description: input.description,
        }
      );

      if (!updated) {
        throw new NotFoundError("Choice list not found");
      }

      // 3. Record CHOICE_LIST_UPDATED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_LIST_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_LIST",
        entityId: choiceListId,
        beforeState: {
          name: current.name,
          description: current.description,
        },
        afterState: {
          name: updated.name,
          description: updated.description,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { choiceList: updated, solutionRevision: updatedSolution.revision };
    });
  }

  /**
   * Lists options for a choice list.
   */
  async listOptions(
    solutionId: string,
    choiceListId: string,
    context: SessionContext
  ): Promise<ChoiceOptionRow[]> {
    await this.getChoiceListById(solutionId, choiceListId, context);
    return choiceListRepository.listOptionsByChoiceList(choiceListId);
  }

  /**
   * Creates a Choice Option record.
   * Atomic transaction: Solution revision increment + Choice Option insertion + CHOICE_OPTION_CREATED audit event.
   */
  async createOption(
    solutionId: string,
    choiceListId: string,
    input: CreateOptionInput,
    context: SessionContext
  ): Promise<{ option: ChoiceOptionRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (!input.label || typeof input.label !== "string" || !input.label.trim()) {
      throw new ValidationError("Choice option label is required.");
    }
    if (input.label.length > 255) {
      throw new ValidationError("Choice option label must not exceed 255 characters.");
    }

    const key = validateSymbolicKey(input.key, "Option key");
    const orgId = context.activeOrganisation.id;

    await this.getChoiceListById(solutionId, choiceListId, context);

    const existingOpt = await choiceListRepository.findOptionByKey(key, choiceListId);
    if (existingOpt) {
      if (!existingOpt.isActive) {
        throw new ConflictError("An inactive option with this value already exists. Reactivate it instead.");
      } else {
        throw new ConflictError(`Choice option with key '${key}' already exists in this choice list.`);
      }
    }

    const db = getDb();

    try {
      return await db.transaction(async (tx) => {
        // 1. Single atomic compare-and-update operation to increment Solution revision
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

        // 2. Compute display order
        const maxOrder = await choiceListRepository.getMaxDisplayOrderInTx(tx, choiceListId);
        const displayOrder = maxOrder + 1;

        // 3. Create option
        const option = await choiceListRepository.createOptionInTx(tx, {
          choiceListId,
          key,
          label: input.label.trim(),
          displayOrder,
        });

        // 4. Record CHOICE_OPTION_CREATED audit event in the same transaction
        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "CHOICE_OPTION_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "CHOICE_OPTION",
          entityId: option.id,
          afterState: {
            id: option.id,
            choiceListId: option.choiceListId,
            key: option.key,
            label: option.label,
            displayOrder: option.displayOrder,
            isActive: option.isActive,
          },
          metadata: {
            expectedRevision: input.expectedRevision,
            newSolutionRevision: updatedSolution.revision,
          },
        });

        return { option, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;

      if (code === "23505") {
        throw new ConflictError(
          `Choice option with key '${key}' already exists in this choice list.`
        );
      }
      throw err;
    }
  }

  /**
   * Updates Choice Option label.
   * Atomic transaction: Solution revision increment + Option label update + CHOICE_OPTION_UPDATED audit event.
   */
  async updateOption(
    solutionId: string,
    choiceListId: string,
    optionId: string,
    input: UpdateOptionInput,
    context: SessionContext
  ): Promise<{ option: ChoiceOptionRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (input.label !== undefined) {
      if (typeof input.label !== "string" || !input.label.trim()) {
        throw new ValidationError("Choice option label cannot be empty.");
      }
      if (input.label.length > 255) {
        throw new ValidationError("Choice option label must not exceed 255 characters.");
      }
    }

    const orgId = context.activeOrganisation.id;
    await this.getChoiceListById(solutionId, choiceListId, context);

    const currentOption = await choiceListRepository.findOptionById(optionId, choiceListId);
    if (!currentOption) {
      throw new NotFoundError("Choice option not found");
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
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

      // 2. Update Option
      const updated = await choiceListRepository.updateOptionInTx(
        tx,
        optionId,
        choiceListId,
        {
          label: input.label ? input.label.trim() : undefined,
        }
      );

      if (!updated) {
        throw new NotFoundError("Choice option not found");
      }

      // 3. Record CHOICE_OPTION_UPDATED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_OPTION_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_OPTION",
        entityId: optionId,
        beforeState: {
          label: currentOption.label,
        },
        afterState: {
          label: updated.label,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { option: updated, solutionRevision: updatedSolution.revision };
    });
  }

  /**
   * Deactivates Choice Option (isActive = false).
   * Preserves stable key, label and display order.
   * Atomic transaction: Solution revision increment + Option deactivation + CHOICE_OPTION_DEACTIVATED audit event.
   */
  async deactivateOption(
    solutionId: string,
    choiceListId: string,
    optionId: string,
    input: DeactivateOptionInput,
    context: SessionContext
  ): Promise<{ option: ChoiceOptionRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    await this.getChoiceListById(solutionId, choiceListId, context);

    const currentOption = await choiceListRepository.findOptionById(optionId, choiceListId);
    if (!currentOption) {
      throw new NotFoundError("Choice option not found");
    }

    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    // Idempotent no-op for repeated deactivation
    if (!currentOption.isActive) {
      return { option: currentOption, solutionRevision: solution.revision };
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
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

      // 2. Deactivate Option
      const updated = await choiceListRepository.deactivateOptionInTx(
        tx,
        optionId,
        choiceListId
      );

      if (!updated) {
        throw new NotFoundError("Choice option not found");
      }

      // 3. Record CHOICE_OPTION_DEACTIVATED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_OPTION_DEACTIVATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_OPTION",
        entityId: optionId,
        beforeState: {
          isActive: currentOption.isActive,
        },
        afterState: {
          isActive: false,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { option: updated, solutionRevision: updatedSolution.revision };
    });
  }

  /**
   * Reactivates Choice Option (isActive = true).
   * Preserves stable key, label and display order.
   * Atomic transaction: Solution revision increment + Option reactivation + CHOICE_OPTION_REACTIVATED audit event.
   */
  async reactivateOption(
    solutionId: string,
    choiceListId: string,
    optionId: string,
    input: ReactivateOptionInput,
    context: SessionContext
  ): Promise<{ option: ChoiceOptionRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    await this.getChoiceListById(solutionId, choiceListId, context);

    const currentOption = await choiceListRepository.findOptionById(optionId, choiceListId);
    if (!currentOption) {
      throw new NotFoundError("Choice option not found");
    }

    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    // Idempotent no-op for repeated reactivation
    if (currentOption.isActive) {
      return { option: currentOption, solutionRevision: solution.revision };
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
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

      // 2. Reactivate Option
      const updated = await choiceListRepository.reactivateOptionInTx(
        tx,
        optionId,
        choiceListId
      );

      if (!updated) {
        throw new NotFoundError("Choice option not found");
      }

      // 3. Record CHOICE_OPTION_REACTIVATED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_OPTION_REACTIVATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_OPTION",
        entityId: optionId,
        beforeState: {
          isActive: currentOption.isActive,
        },
        afterState: {
          isActive: true,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { option: updated, solutionRevision: updatedSolution.revision };
    });
  }

  /**
   * Reorders Choice Options atomically.
   * Payload must contain every existing option ID for the choice list exactly once.
   * Atomic transaction: Solution revision increment + Options reordering + CHOICE_LIST_UPDATED audit event.
   */
  async reorderOptions(
    solutionId: string,
    choiceListId: string,
    input: ReorderOptionsInput,
    context: SessionContext
  ): Promise<{ options: ChoiceOptionRow[]; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (!Array.isArray(input.optionIds)) {
      throw new ValidationError("optionIds must be an array of option IDs.");
    }

    const orgId = context.activeOrganisation.id;
    await this.getChoiceListById(solutionId, choiceListId, context);

    const existingOptions = await choiceListRepository.listOptionsByChoiceList(choiceListId);
    const existingIdsSet = new Set(existingOptions.map((o) => o.id));

    // Validate that optionIds contains every existing option ID exactly once
    if (
      input.optionIds.length !== existingOptions.length ||
      new Set(input.optionIds).size !== existingOptions.length
    ) {
      throw new ValidationError("Reorder payload must contain every existing option ID for this choice list exactly once.");
    }

    for (const id of input.optionIds) {
      if (!existingIdsSet.has(id)) {
        throw new ValidationError("Reorder payload contains invalid, missing, or foreign option IDs.");
      }
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      // 1. Single atomic compare-and-update operation to increment Solution revision
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

      // 2. Reorder options atomically
      const reorderedOptions = await choiceListRepository.reorderOptionsInTx(
        tx,
        choiceListId,
        input.optionIds
      );

      // 3. Record CHOICE_LIST_UPDATED audit event with OPTIONS_REORDERED changeType
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_LIST_UPDATED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_LIST",
        entityId: choiceListId,
        beforeState: {
          optionOrder: existingOptions.map((o) => o.id),
        },
        afterState: {
          optionOrder: input.optionIds,
        },
        metadata: {
          changeType: "OPTIONS_REORDERED",
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { options: reorderedOptions, solutionRevision: updatedSolution.revision };
    });
  }

  /**
   * Deletes a reusable Choice List.
   * Blocked if referenced by any Property.
   */
  async deleteChoiceList(
    solutionId: string,
    choiceListId: string,
    input: { expectedRevision: number },
    context: SessionContext
  ): Promise<{ success: boolean; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const current = await this.getChoiceListById(solutionId, choiceListId, context);

    // Dependency check: cannot delete if referenced by any property
    const dependentProps = await choiceListRepository.findDependentProperties(choiceListId);
    if (dependentProps.length > 0) {
      const propLabels = dependentProps.map((p) => `"${p.label}"`).join(" and ");
      throw new ConflictError(
        `Cannot delete "${current.name}". It is used by ${propLabels}.`
      );
    }

    const db = getDb();

    return db.transaction(async (tx) => {
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

      await choiceListRepository.deleteChoiceListInTx(tx, choiceListId, solutionId);

      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "CHOICE_LIST_DELETED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "CHOICE_LIST",
        entityId: choiceListId,
        beforeState: {
          name: current.name,
          key: current.key,
        },
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { success: true, solutionRevision: updatedSolution.revision };
    });
  }
}

export const choiceListService = new ChoiceListService();
