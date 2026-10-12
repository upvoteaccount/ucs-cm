import { evaluateValidation } from "@/shared/validation";

export interface PropertyValidationMetadata {
  storedDataType: string;
  validationRules?: Record<string, unknown> | null;
}

export interface FieldEffectiveBehavior {
  isVisible: boolean;
  isEditable: boolean;
  isRequired: boolean;
}

/**
 * Validates a runtime field value by combining:
 * 1. Queue / Form field configuration (mandatory / isRequired check)
 * 2. Property metadata (storedDataType, validationRules, presets, min/max, regex)
 *
 * Reuses pure shared evaluateValidation engine directly without pulling server dependencies.
 */
export function validateRuntimeField(
  property: PropertyValidationMetadata | undefined,
  behavior: FieldEffectiveBehavior,
  value: any
): string | null {
  // If field is not visible, no validation error
  if (!behavior.isVisible) {
    return null;
  }

  const isValueProvided =
    value !== undefined &&
    value !== null &&
    (typeof value === "string" ? value.trim() !== "" : true);

  // 1. Mandatory requirement (comes from Form field configuration / Queue field behavior)
  if (behavior.isRequired && !isValueProvided) {
    return "This field is mandatory.";
  }

  // If value is not provided and not required, no further property rule checks
  if (!isValueProvided) {
    return null;
  }

  if (!property) {
    return null;
  }

  // 2. Property metadata validation rules (reusing pure evaluateValidation from shared engine)
  if (property.validationRules && Object.keys(property.validationRules).length > 0) {
    let testValue: unknown = value;
    if (property.storedDataType === "NUMBER") {
      const parsed = Number(value);
      testValue = isNaN(parsed) ? value : parsed;
    } else if (typeof value !== "string") {
      testValue = String(value);
    }

    try {
      const result = evaluateValidation(
        property.storedDataType,
        property.validationRules as any,
        testValue
      );

      if (!result.isValid && result.errors.length > 0) {
        return result.errors[0].message;
      }
    } catch {
      // In case of evaluation error, do not break runtime UI
      return null;
    }
  }

  return null;
}
