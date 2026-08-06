import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { SessionContext } from "../auth";
import { solutionRepository } from "./solution.repository";
import {
  solutionPropertyRepository,
  SolutionPropertyRow,
} from "./solution-property.repository";
import { constructGeneratedTechnicalName } from "./solution-identity";
import { canonicalizeValidationRules } from "./property-validation.service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors";

export const APPROVED_STORED_TYPES = new Set([
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "USER_REFERENCE",
]);

function maskSensitiveValidationRules(rules: Record<string, unknown> | null | undefined, isSensitive: boolean): any {
  if (!rules || !isSensitive) return rules;
  if (rules.customRegex && typeof rules.customRegex === "object") {
    const cr = rules.customRegex as Record<string, unknown>;
    return {
      ...rules,
      customRegex: {
        pattern: "*****",
        flags: cr.flags,
      },
    };
  }
  return rules;
}

export const APPROVED_FORMAT_PRESETS = new Set(["NONE", "EMAIL", "PHONE"]);
export const APPROVED_CARDINALITIES = new Set(["SINGLE", "MULTIPLE"]);

export interface CreatePropertyInput {
  expectedRevision: number;
  label: string;
  localSymbolicName: string;
  storedDataType: string;
  formatPreset?: string;
  choiceListId?: string | null;
  cardinality?: string;
  defaultValue?: string | null;
  helpText?: string | null;
  isSensitive?: boolean;
  validationRules?: Record<string, unknown>;
}

export interface UpdatePropertyInput {
  expectedRevision: number;
  label?: string;
  localSymbolicName?: string;
  storedDataType?: string;
  formatPreset?: string;
  choiceListId?: string | null;
  cardinality?: string;
  defaultValue?: string | null;
  helpText?: string | null;
  isSensitive?: boolean;
  validationRules?: Record<string, unknown>;
}

export interface DeletePropertyInput {
  expectedRevision: number;
}

export class SolutionPropertyService {
  /**
   * Lists data dictionary properties for a Solution.
   */
  async listProperties(
    solutionId: string,
    context: SessionContext
  ): Promise<SolutionPropertyRow[]> {
    const solution = await solutionRepository.findById(
      solutionId,
      context.activeOrganisation.id
    );
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    return solutionPropertyRepository.listBySolution(
      solutionId,
      context.activeOrganisation.id
    );
  }

  /**
   * Reads a single property by ID for a Solution.
   */
  async getPropertyById(
    solutionId: string,
    propertyId: string,
    context: SessionContext
  ): Promise<SolutionPropertyRow> {
    const solution = await solutionRepository.findById(
      solutionId,
      context.activeOrganisation.id
    );
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const prop = await solutionPropertyRepository.findById(
      propertyId,
      solutionId,
      context.activeOrganisation.id
    );
    if (!prop) {
      throw new NotFoundError("Property not found");
    }

    return prop;
  }

  /**
   * Creates a Data Dictionary Property.
   * Atomic transaction: Solution revision increment + Property creation + PROPERTY_CREATED audit event.
   */
  async createProperty(
    solutionId: string,
    input: CreatePropertyInput,
    context: SessionContext
  ): Promise<{ property: SolutionPropertyRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    if (!input.label || typeof input.label !== "string" || !input.label.trim()) {
      throw new ValidationError("Property label is required.");
    }
    if (input.label.length > 255) {
      throw new ValidationError("Property label must not exceed 255 characters.");
    }
    if (!input.localSymbolicName || typeof input.localSymbolicName !== "string") {
      throw new ValidationError("Local symbolic name is required.");
    }

    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    // Validate identity & construct generated technical name
    const { localSymbolicName, generatedTechnicalName } = constructGeneratedTechnicalName(
      solution.solutionPrefix,
      input.localSymbolicName
    );

    // Validate type, format, cardinality
    const dataType = (input.storedDataType || "").trim().toUpperCase();
    if (!APPROVED_STORED_TYPES.has(dataType)) {
      throw new ValidationError(
        `Invalid storedDataType '${input.storedDataType}'. Approved types: ${Array.from(APPROVED_STORED_TYPES).join(", ")}.`
      );
    }

    const preset = (input.formatPreset || "NONE").trim().toUpperCase();
    if (!APPROVED_FORMAT_PRESETS.has(preset)) {
      throw new ValidationError(
        `Invalid formatPreset '${input.formatPreset}'. Approved presets: NONE, EMAIL, PHONE.`
      );
    }

    if (dataType !== "TEXT" && preset !== "NONE") {
      throw new ValidationError("Format presets other than NONE are only supported for TEXT properties.");
    }

    const card = (input.cardinality || "SINGLE").trim().toUpperCase();
    if (!APPROVED_CARDINALITIES.has(card)) {
      throw new ValidationError("Invalid cardinality. Must be SINGLE or MULTIPLE.");
    }

    // Choice-list binding & cardinality consistency checks
    const choiceListId = input.choiceListId ? input.choiceListId.trim() : null;

    if (!choiceListId && card === "MULTIPLE") {
      throw new ValidationError("MULTIPLE cardinality is only supported when a Choice List is bound to the property.");
    }

    if (
      (dataType === "BOOLEAN" || dataType === "DATE" || dataType === "DATETIME" || dataType === "USER_REFERENCE") &&
      card !== "SINGLE"
    ) {
      throw new ValidationError(`Cardinality for ${dataType} properties must be SINGLE.`);
    }

    if (choiceListId) {
      if (dataType === "BOOLEAN" || dataType === "DATE" || dataType === "DATETIME" || dataType === "USER_REFERENCE") {
        throw new ValidationError("Choice lists can only be bound to TEXT or NUMBER properties.");
      }

      const choiceList = await solutionPropertyRepository.findChoiceList(
        choiceListId,
        solutionId,
        orgId
      );
      if (!choiceList) {
        throw new ValidationError("Choice list not found or belongs to another Solution.");
      }
    }

    // Canonicalize and validate rules BEFORE starting transaction so invalid rules produce zero mutation
    const canonicalRules = canonicalizeValidationRules(dataType, preset, input.validationRules);

    try {
      const db = getDb();
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

        // 2. Insert property
        const property = await solutionPropertyRepository.createPropertyInTx(tx, {
          solutionId,
          localSymbolicName,
          generatedTechnicalName,
          label: input.label.trim(),
          storedDataType: dataType,
          formatPreset: preset,
          choiceListId,
          cardinality: card,
          defaultValue: input.defaultValue ?? null,
          helpText: input.helpText ?? null,
          isSensitive: input.isSensitive ?? false,
          validationRules: canonicalRules as Record<string, unknown> | null,
        });

        // Mask sensitive defaults or validation rules in audit payload
        const auditDefault = property.isSensitive ? "[REDACTED]" : property.defaultValue;
        const auditRules = maskSensitiveValidationRules(property.validationRules, property.isSensitive);

        // 3. Record PROPERTY_CREATED audit event in the same transaction
        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "PROPERTY_CREATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "SOLUTION_PROPERTY",
          entityId: property.id,
          afterState: {
            id: property.id,
            solutionId: property.solutionId,
            localSymbolicName: property.localSymbolicName,
            generatedTechnicalName: property.generatedTechnicalName,
            label: property.label,
            storedDataType: property.storedDataType,
            formatPreset: property.formatPreset,
            choiceListId: property.choiceListId,
            cardinality: property.cardinality,
            defaultValue: auditDefault,
            isSensitive: property.isSensitive,
            validationRules: auditRules,
          },
          metadata: {
            expectedRevision: input.expectedRevision,
            newSolutionRevision: updatedSolution.revision,
          },
        });

        return { property, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;

      if (code === "23505") {
        throw new ConflictError(
          `Property with symbolic name '${localSymbolicName}' already exists in this Solution.`
        );
      }
      throw err;
    }
  }

  /**
   * Updates canonical property settings.
   * Atomic transaction: Solution revision increment + Property update + PROPERTY_UPDATED audit event.
   */
  async updateProperty(
    solutionId: string,
    propertyId: string,
    input: UpdatePropertyInput,
    context: SessionContext
  ): Promise<{ property: SolutionPropertyRow; solutionRevision: number }> {
    if (
      input.expectedRevision === undefined ||
      input.expectedRevision === null ||
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision)
    ) {
      throw new ValidationError("expectedRevision is required and must be an integer.");
    }

    const orgId = context.activeOrganisation.id;
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const currentProperty = await solutionPropertyRepository.findById(
      propertyId,
      solutionId,
      orgId
    );
    if (!currentProperty) {
      throw new NotFoundError("Property not found");
    }

    let nextLocalName = currentProperty.localSymbolicName;
    let nextTechName = currentProperty.generatedTechnicalName;

    // Check if localSymbolicName or storedDataType is being changed
    const isChangingLocalName =
      input.localSymbolicName !== undefined &&
      input.localSymbolicName.trim().toLowerCase() !== currentProperty.localSymbolicName;

    const isChangingDataType =
      input.storedDataType !== undefined &&
      input.storedDataType.trim().toUpperCase() !== currentProperty.storedDataType;

    if (isChangingLocalName || isChangingDataType) {
      // Guard: localSymbolicName and storedDataType may change ONLY while Solution is DRAFT and property is unused in form layout
      const isUsed = await solutionPropertyRepository.isPropertyUsedInFormLayout(propertyId);
      if (solution.status !== "DRAFT" || isUsed) {
        throw new ConflictError(
          "Local symbolic name and stored data type can only be modified while the Solution is in DRAFT status and the property is not used in any form layout."
        );
      }
    }

    if (isChangingLocalName && input.localSymbolicName) {
      const identity = constructGeneratedTechnicalName(
        solution.solutionPrefix,
        input.localSymbolicName
      );
      nextLocalName = identity.localSymbolicName;
      nextTechName = identity.generatedTechnicalName;
    }

    const dataType = (input.storedDataType || currentProperty.storedDataType).trim().toUpperCase();
    if (!APPROVED_STORED_TYPES.has(dataType)) {
      throw new ValidationError(`Invalid storedDataType '${input.storedDataType}'.`);
    }

    const preset = (input.formatPreset !== undefined ? input.formatPreset : currentProperty.formatPreset)
      .trim()
      .toUpperCase();
    if (!APPROVED_FORMAT_PRESETS.has(preset)) {
      throw new ValidationError(`Invalid formatPreset '${input.formatPreset}'.`);
    }

    if (dataType !== "TEXT" && preset !== "NONE") {
      throw new ValidationError("Format presets other than NONE are only supported for TEXT properties.");
    }

    const card = (input.cardinality !== undefined ? input.cardinality : currentProperty.cardinality)
      .trim()
      .toUpperCase();
    if (!APPROVED_CARDINALITIES.has(card)) {
      throw new ValidationError("Invalid cardinality. Must be SINGLE or MULTIPLE.");
    }

    let choiceListId = currentProperty.choiceListId;
    if (input.choiceListId !== undefined) {
      choiceListId = input.choiceListId ? input.choiceListId.trim() : null;
    }

    if (!choiceListId && card === "MULTIPLE") {
      throw new ValidationError("MULTIPLE cardinality is only supported when a Choice List is bound to the property.");
    }

    if (
      (dataType === "BOOLEAN" || dataType === "DATE" || dataType === "DATETIME" || dataType === "USER_REFERENCE") &&
      card !== "SINGLE"
    ) {
      throw new ValidationError(`Cardinality for ${dataType} properties must be SINGLE.`);
    }

    if (choiceListId) {
      if (dataType === "BOOLEAN" || dataType === "DATE" || dataType === "DATETIME" || dataType === "USER_REFERENCE") {
        throw new ValidationError("Choice lists can only be bound to TEXT or NUMBER properties.");
      }

      const choiceList = await solutionPropertyRepository.findChoiceList(
        choiceListId,
        solutionId,
        orgId
      );
      if (!choiceList) {
        throw new ValidationError("Choice list not found or belongs to another Solution.");
      }
    }

    const db = getDb();

    const canonicalRulesToUpdate = input.validationRules !== undefined
      ? canonicalizeValidationRules(dataType, preset, input.validationRules)
      : undefined;

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

        // 2. Update property record
        const updatedProp = await solutionPropertyRepository.updatePropertyInTx(
          tx,
          propertyId,
          solutionId,
          {
            localSymbolicName: isChangingLocalName ? nextLocalName : undefined,
            generatedTechnicalName: isChangingLocalName ? nextTechName : undefined,
            label: input.label !== undefined ? input.label.trim() : undefined,
            storedDataType: isChangingDataType ? dataType : undefined,
            formatPreset: preset,
            choiceListId,
            cardinality: card,
            defaultValue: input.defaultValue,
            helpText: input.helpText,
            isSensitive: input.isSensitive,
            validationRules: canonicalRulesToUpdate as Record<string, unknown> | null | undefined,
          }
        );

        if (!updatedProp) {
          throw new NotFoundError("Property not found");
        }

        // Mask sensitive values in audit payload
        const beforeDefault = currentProperty.isSensitive ? "[REDACTED]" : currentProperty.defaultValue;
        const afterDefault = updatedProp.isSensitive ? "[REDACTED]" : updatedProp.defaultValue;
        const beforeRules = maskSensitiveValidationRules(currentProperty.validationRules, currentProperty.isSensitive);
        const afterRules = maskSensitiveValidationRules(updatedProp.validationRules, updatedProp.isSensitive);

        // 3. Record PROPERTY_UPDATED audit event in the same transaction
        await tx.insert(auditEvents).values({
          organisationId: orgId,
          category: "ORG",
          eventType: "PROPERTY_UPDATED",
          actorType: "AUTHENTICATED_USER",
          actorUserId: context.user.id,
          actorIdentifier: context.user.email,
          entityType: "SOLUTION_PROPERTY",
          entityId: propertyId,
          beforeState: {
            label: currentProperty.label,
            localSymbolicName: currentProperty.localSymbolicName,
            storedDataType: currentProperty.storedDataType,
            formatPreset: currentProperty.formatPreset,
            choiceListId: currentProperty.choiceListId,
            cardinality: currentProperty.cardinality,
            defaultValue: beforeDefault,
            isSensitive: currentProperty.isSensitive,
            validationRules: beforeRules,
          },
          afterState: {
            label: updatedProp.label,
            localSymbolicName: updatedProp.localSymbolicName,
            storedDataType: updatedProp.storedDataType,
            formatPreset: updatedProp.formatPreset,
            choiceListId: updatedProp.choiceListId,
            cardinality: updatedProp.cardinality,
            defaultValue: afterDefault,
            isSensitive: updatedProp.isSensitive,
            validationRules: afterRules,
          },
          metadata: {
            expectedRevision: input.expectedRevision,
            newSolutionRevision: updatedSolution.revision,
          },
        });

        return { property: updatedProp, solutionRevision: updatedSolution.revision };
      });
    } catch (err: unknown) {
      const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : undefined;
      const code = (err && typeof err === "object" && "code" in err) ? (err as { code?: string }).code : cause?.code;

      if (code === "23505") {
        throw new ConflictError(
          `Solution property already exists in this Solution.`
        );
      }
      throw err;
    }
  }

  /**
   * Deletes a Data Dictionary Property.
   * Blocked if the property is used in any form field reference.
   * Atomic transaction: Solution revision increment + Property deletion + PROPERTY_DELETED audit event.
   */
  async deleteProperty(
    solutionId: string,
    propertyId: string,
    input: DeletePropertyInput,
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
    const solution = await solutionRepository.findById(solutionId, orgId);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const currentProperty = await solutionPropertyRepository.findById(
      propertyId,
      solutionId,
      orgId
    );
    if (!currentProperty) {
      throw new NotFoundError("Property not found");
    }

    // Deletion guard: cannot delete if referenced in any form field reference
    const isUsed = await solutionPropertyRepository.isPropertyUsedInFormLayout(propertyId);
    if (isUsed) {
      throw new ConflictError("Property cannot be deleted because it is referenced in a form layout.");
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

      // 2. Delete property record
      const deleted = await solutionPropertyRepository.deletePropertyInTx(
        tx,
        propertyId,
        solutionId
      );

      if (!deleted) {
        throw new NotFoundError("Property not found");
      }

      const auditDefault = currentProperty.isSensitive ? "[REDACTED]" : currentProperty.defaultValue;

      // 3. Record PROPERTY_DELETED audit event in the same transaction
      await tx.insert(auditEvents).values({
        organisationId: orgId,
        category: "ORG",
        eventType: "PROPERTY_DELETED",
        actorType: "AUTHENTICATED_USER",
        actorUserId: context.user.id,
        actorIdentifier: context.user.email,
        entityType: "SOLUTION_PROPERTY",
        entityId: propertyId,
        beforeState: {
          id: currentProperty.id,
          solutionId: currentProperty.solutionId,
          localSymbolicName: currentProperty.localSymbolicName,
          generatedTechnicalName: currentProperty.generatedTechnicalName,
          label: currentProperty.label,
          storedDataType: currentProperty.storedDataType,
          defaultValue: auditDefault,
        },
        afterState: null,
        metadata: {
          expectedRevision: input.expectedRevision,
          newSolutionRevision: updatedSolution.revision,
        },
      });

      return { success: true, solutionRevision: updatedSolution.revision };
    });
  }
}

export const solutionPropertyService = new SolutionPropertyService();
