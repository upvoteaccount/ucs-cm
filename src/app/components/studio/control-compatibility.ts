export function getCompatibleControlTypes(property: {
  storedDataType: string;
  formatPreset?: string | null;
  choiceListId?: string | null;
  cardinality?: string | null;
}): string[] {
  const { storedDataType, formatPreset, choiceListId, cardinality } = property;

  if (formatPreset === "EMAIL" || formatPreset === "PHONE") {
    return ["TEXT_INPUT"];
  }

  if (storedDataType === "TEXT") {
    if (choiceListId) {
      if (cardinality === "MULTIPLE") {
        return ["DROPDOWN"];
      }
      return ["DROPDOWN", "RADIO"];
    }
    return ["TEXT_INPUT", "TEXTAREA"];
  }

  if (storedDataType === "NUMBER") {
    if (choiceListId) {
      if (cardinality === "MULTIPLE") {
        return ["DROPDOWN"];
      }
      return ["DROPDOWN", "RADIO"];
    }
    return ["NUMBER_INPUT"];
  }

  if (storedDataType === "BOOLEAN") {
    return ["CHECKBOX", "RADIO"];
  }

  if (storedDataType === "DATE") {
    return ["DATE_PICKER"];
  }

  if (storedDataType === "DATETIME") {
    return ["DATETIME_PICKER"];
  }

  if (storedDataType === "USER_REFERENCE") {
    return ["USER_PICKER"];
  }

  return ["TEXT_INPUT"];
}

export function validateStaticFieldState(state: {
  isRequired?: boolean;
  isVisible?: boolean;
  isEnabled?: boolean;
}): string | null {
  if (state.isRequired && state.isVisible === false) {
    return "Contradiction: Required field cannot be hidden (isVisible = false).";
  }
  if (state.isRequired && state.isEnabled === false) {
    return "Contradiction: Required field cannot be disabled (isEnabled = false).";
  }
  return null;
}
