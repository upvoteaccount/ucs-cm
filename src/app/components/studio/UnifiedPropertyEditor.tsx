"use client";

import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button, Input, FormField, Alert, Select, SelectOption, Checkbox, RadioGroup } from "@/app/components/ui";
import { ValidationTestPanel } from "./ValidationTestPanel";

export interface PropertyEditorHandle {
  submitSave: () => Promise<boolean>;
  discard: () => void;
}

export interface UnifiedPropertyEditorProps {
  solutionId: string;
  solutionPrefix: string;
  property: any | null; // null for Create Property mode
  choiceLists: any[];
  regexPresets: any[];
  expectedRevision: number;
  onSave: (payload: any) => Promise<void>;
  onSaveChoiceList?: (payload: any) => Promise<any>;
  onCancel: () => void;
  isPending?: boolean;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
}

export const UnifiedPropertyEditor = forwardRef<PropertyEditorHandle, UnifiedPropertyEditorProps>(
  function UnifiedPropertyEditor(
    {
      solutionId,
      solutionPrefix = "PLA",
      property,
      choiceLists = [],
      regexPresets: _regexPresets,
      expectedRevision,
      onSave,
      onSaveChoiceList,
      onCancel,
      isPending = false,
      isDirty: _isDirty,
      setIsDirty,
    },
    ref
  ) {
  const isCreateMode = !property;

  const normalizeSymbolicSuffix = (text: string) => {
    return text
      .trim()
      .toUpperCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")
      .replace(/_+/g, "_");
  };

  const normalizeLocalSymbolicName = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_");
  };

  // 1. Property Name
  const [label, setLabel] = useState(property?.label || "");

  // 2. Symbolic Name Read-only Computation
  const existingLocalName = property?.localSymbolicName || "";
  const [derivedSymbolicDisplay, setDerivedSymbolicDisplay] = useState<string>(() => {
    if (!isCreateMode && existingLocalName) {
      return `${solutionPrefix}_${existingLocalName.toUpperCase()}`;
    }
    const clean = normalizeSymbolicSuffix(property?.label || "");
    return clean ? `${solutionPrefix}_${clean}` : `${solutionPrefix}_...`;
  });

  // 3. Final Designer Property Types: Text, Number, Date, Boolean, Choice
  const initialDisplayType = property?.choiceListId
    ? "Choice"
    : property?.storedDataType === "DATETIME" || property?.storedDataType === "DATE"
    ? "Date"
    : property?.storedDataType === "BOOLEAN"
    ? "Boolean"
    : property?.storedDataType === "NUMBER"
    ? "Number"
    : "Text";

  const [displayType, setDisplayType] = useState<string>(initialDisplayType);

  // Common Fields
  const [helpText, setHelpText] = useState(property?.helpText || "");
  const [isSensitive, setIsSensitive] = useState(!!property?.isSensitive);
  const [defaultValue, setDefaultValue] = useState<any>(
    property?.defaultValue !== undefined ? property.defaultValue : ""
  );

  // Date Property: Include Time toggle
  const [includeTime, setIncludeTime] = useState<boolean>(
    property?.storedDataType === "DATETIME"
  );
  const rules = property?.validationRules || {};

  // Default Control States
  const [booleanDefaultControl, setBooleanDefaultControl] = useState<"CHECKBOX" | "YES_NO">(
    property?.defaultControlType === "YES_NO" ? "YES_NO" : "CHECKBOX"
  );
  const [choiceDefaultControl, setChoiceDefaultControl] = useState<string>(
    property?.defaultControlType || (property?.cardinality === "MULTIPLE" ? "MULTI_SELECT_DROPDOWN" : "DROPDOWN")
  );

  // Choice Options State
  const [cardinality, setCardinality] = useState<"SINGLE" | "MULTIPLE">(property?.cardinality || "SINGLE");
  const [choiceMode, setChoiceMode] = useState<"existing" | "new">("existing");
  const [selectedChoiceListId, setSelectedChoiceListId] = useState<string>(
    property?.choiceListId || (choiceLists[0]?.id || "")
  );
  const [newChoiceListName, setNewChoiceListName] = useState("");
  const [newChoiceOptions, setNewChoiceOptions] = useState<{ label: string; key: string }[]>([
    { label: "", key: "" },
  ]);

  // Text Validation Rules State
  const [minLength, setMinLength] = useState<string>(rules.minLength !== undefined ? String(rules.minLength) : "");
  const [maxLength, setMaxLength] = useState<string>(rules.maxLength !== undefined ? String(rules.maxLength) : "");
  const [minimumValue, setMinimumValue] = useState<string>(rules.minimumValue !== undefined ? String(rules.minimumValue) : "");
  const [maximumValue, setMaximumValue] = useState<string>(rules.maximumValue !== undefined ? String(rules.maximumValue) : "");
  const [minimumDate, setMinimumDate] = useState<string>(rules.minimumDate || "");
  const [maximumDate, setMaximumDate] = useState<string>(rules.maximumDate || "");
  const [minimumDatetime, setMinimumDatetime] = useState<string>(rules.minimumDatetime || "");
  const [maximumDatetime, setMaximumDatetime] = useState<string>(rules.maximumDatetime || "");

  // Pattern Preset Selection
  const initialPatternSelection = rules.customRegex
    ? "CUSTOM"
    : property?.formatPreset === "EMAIL" || rules.regexPreset === "EMAIL_BASIC"
    ? "EMAIL"
    : property?.formatPreset === "PHONE" || rules.regexPreset === "INDIAN_MOBILE"
    ? "PHONE"
    : rules.regexPreset || "NONE";

  const [patternPreset, setPatternPreset] = useState<string>(initialPatternSelection);
  const [customPattern, setCustomPattern] = useState<string>(rules.customRegex?.pattern || "");
  const [customFlags, setCustomFlags] = useState<string>(rules.customRegex?.flags || "");
  const [validationMessage, setValidationMessage] = useState<string>(rules.validationMessage || "");

  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Store the actual baseline object of all editable property values for Discard functionality
  const createBaselineStateObject = React.useCallback(() => ({
    label: property?.label || "",
    displayType: initialDisplayType,
    helpText: property?.helpText || "",
    isSensitive: !!property?.isSensitive,
    defaultValue: property?.defaultValue !== undefined ? property.defaultValue : "",
    includeTime: property?.storedDataType === "DATETIME",
    booleanDefaultControl: property?.defaultControlType === "YES_NO" ? "YES_NO" : "CHECKBOX",
    choiceDefaultControl: property?.defaultControlType || (property?.cardinality === "MULTIPLE" ? "MULTI_SELECT_DROPDOWN" : "DROPDOWN"),
    cardinality: property?.cardinality || "SINGLE",
    choiceMode: "existing" as "existing" | "new",
    selectedChoiceListId: property?.choiceListId || (choiceLists[0]?.id || ""),
    newChoiceListName: "",
    newChoiceOptions: [{ label: "", key: "" }],
    minLength: rules.minLength !== undefined ? String(rules.minLength) : "",
    maxLength: rules.maxLength !== undefined ? String(rules.maxLength) : "",
    minimumValue: rules.minimumValue !== undefined ? String(rules.minimumValue) : "",
    maximumValue: rules.maximumValue !== undefined ? String(rules.maximumValue) : "",
    minimumDate: rules.minimumDate || "",
    maximumDate: rules.maximumDate || "",
    minimumDatetime: rules.minimumDatetime || "",
    maximumDatetime: rules.maximumDatetime || "",
    patternPreset: initialPatternSelection,
    customPattern: rules.customRegex?.pattern || "",
    customFlags: rules.customRegex?.flags || "",
    validationMessage: rules.validationMessage || "",
  }), [property, initialDisplayType, choiceLists, rules, initialPatternSelection]);

  const [baselineState, setBaselineState] = useState(createBaselineStateObject);

  // Compute normalized snapshot of all editable property settings for dirty state comparison
  const computeSnapshotFromState = (st: typeof baselineState) => {
    return JSON.stringify({
      label: st.label.trim(),
      displayType: st.displayType,
      helpText: st.helpText.trim(),
      isSensitive: st.isSensitive,
      defaultValue: st.defaultValue !== "" && st.defaultValue !== null ? st.defaultValue : null,
      includeTime: st.includeTime,
      booleanDefaultControl: st.booleanDefaultControl,
      choiceDefaultControl: st.choiceDefaultControl,
      cardinality: st.cardinality,
      choiceMode: st.choiceMode,
      selectedChoiceListId: st.selectedChoiceListId,
      newChoiceListName: st.newChoiceListName.trim(),
      newChoiceOptions: st.newChoiceOptions.map((opt) => ({ label: opt.label.trim(), key: opt.key.trim() })),
      minLength: st.minLength,
      maxLength: st.maxLength,
      minimumValue: st.minimumValue,
      maximumValue: st.maximumValue,
      minimumDate: st.minimumDate,
      maximumDate: st.maximumDate,
      minimumDatetime: st.minimumDatetime,
      maximumDatetime: st.maximumDatetime,
      patternPreset: st.patternPreset,
      customPattern: st.customPattern.trim(),
      customFlags: st.customFlags.trim(),
      validationMessage: st.validationMessage.trim(),
    });
  };

  const initialSnapshot = computeSnapshotFromState(baselineState);

  const currentSnapshot = computeSnapshotFromState({
    label,
    displayType,
    helpText,
    isSensitive,
    defaultValue,
    includeTime,
    booleanDefaultControl: booleanDefaultControl as any,
    choiceDefaultControl,
    cardinality,
    choiceMode,
    selectedChoiceListId,
    newChoiceListName,
    newChoiceOptions,
    minLength,
    maxLength,
    minimumValue,
    maximumValue,
    minimumDate,
    maximumDate,
    minimumDatetime,
    maximumDatetime,
    patternPreset,
    customPattern,
    customFlags,
    validationMessage,
  });

  const calculatedIsDirty = currentSnapshot !== initialSnapshot;

  // Compute duplicate status for inline choice options
  const duplicateInlineOptionIndices = React.useMemo(() => {
    if (displayType !== "Choice" || choiceMode !== "new") return new Set<number>();
    const seenKeys = new Map<string, number>();
    const duplicateIndices = new Set<number>();

    newChoiceOptions.forEach((opt, idx) => {
      const cleanLabel = opt.label.trim();
      if (!cleanLabel) return;
      const cleanKey = opt.key.trim() || normalizeLocalSymbolicName(cleanLabel);
      if (seenKeys.has(cleanKey)) {
        duplicateIndices.add(idx);
      } else {
        seenKeys.set(cleanKey, idx);
      }
    });

    return duplicateIndices;
  }, [displayType, choiceMode, newChoiceOptions]);

  const hasDuplicateInlineOptions = duplicateInlineOptionIndices.size > 0;

  React.useEffect(() => {
    setIsDirty?.(calculatedIsDirty);
  }, [calculatedIsDirty, setIsDirty]);

  const restoreFromState = (st: typeof baselineState) => {
    setLabel(st.label);
    setDisplayType(st.displayType);
    setHelpText(st.helpText);
    setIsSensitive(st.isSensitive);
    setDefaultValue(st.defaultValue);
    setIncludeTime(st.includeTime);
    setBooleanDefaultControl(st.booleanDefaultControl as any);
    setChoiceDefaultControl(st.choiceDefaultControl);
    setCardinality(st.cardinality as any);
    setChoiceMode(st.choiceMode);
    setSelectedChoiceListId(st.selectedChoiceListId);
    setNewChoiceListName(st.newChoiceListName);
    setNewChoiceOptions(st.newChoiceOptions);
    setMinLength(st.minLength);
    setMaxLength(st.maxLength);
    setMinimumValue(st.minimumValue);
    setMaximumValue(st.maximumValue);
    setMinimumDate(st.minimumDate);
    setMaximumDate(st.maximumDate);
    setMinimumDatetime(st.minimumDatetime);
    setMaximumDatetime(st.maximumDatetime);
    setPatternPreset(st.patternPreset);
    setCustomPattern(st.customPattern);
    setCustomFlags(st.customFlags);
    setValidationMessage(st.validationMessage);
  };

  const handleCancelClick = () => {
    onCancel();
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLabel(val);
    setIsDirty?.(true);

    if (isCreateMode) {
      const suffix = normalizeSymbolicSuffix(val);
      setDerivedSymbolicDisplay(suffix ? `${solutionPrefix}_${suffix}` : `${solutionPrefix}_...`);
    }
  };

  const handleDisplayTypeChange = (newType: string) => {
    setDisplayType(newType);
    setIsDirty?.(true);
  };

  const handleAddChoiceOption = () => {
    setNewChoiceOptions((prev) => [...prev, { label: "", key: "" }]);
    setIsDirty?.(true);
  };

  const handleChoiceOptionChange = (idx: number, field: "label" | "key", val: string) => {
    setNewChoiceOptions((prev) => {
      const next = [...prev];
      const current = { ...next[idx] };
      if (field === "label") {
        current.label = val;
        current.key = normalizeLocalSymbolicName(val);
      } else {
        current.key = val;
      }
      next[idx] = current;
      return next;
    });
    setIsDirty?.(true);
  };

  const dataTypeOptions: SelectOption[] = [
    { value: "Text", label: "Text" },
    { value: "Number", label: "Number" },
    { value: "Date", label: "Date" },
    { value: "Boolean", label: "Boolean" },
    { value: "Choice", label: "Choice" },
  ];

  const patternOptions: SelectOption[] = [
    { value: "NONE", label: "None" },
    { value: "LETTERS_ONLY", label: "Letters only" },
    { value: "ALPHANUMERIC", label: "Alphanumeric" },
    { value: "ALPHANUMERIC_SPACES", label: "Alphanumeric with spaces" },
    { value: "NO_SPECIAL_CHARACTERS", label: "No special characters" },
    { value: "EMAIL", label: "Email" },
    { value: "PHONE", label: "Indian mobile" },
    { value: "CUSTOM", label: "Custom pattern" },
  ];

  const choiceListOptions: SelectOption[] = choiceLists.map((cl) => ({
    value: cl.id,
    label: cl.name,
  }));

  const performSave = async (): Promise<boolean> => {
    if (!label.trim()) return false;

    setError(null);
    setActionPending(true);

    try {
      let finalChoiceListId = displayType === "Choice" ? selectedChoiceListId : null;
      let currentRevision = expectedRevision;

      // Inline Choice Set creation revision chaining (Requirement 10)
      if (displayType === "Choice" && choiceMode === "new") {
        if (!newChoiceListName.trim()) {
          setError("Please provide a name for the new choice set.");
          setActionPending(false);
          return false;
        }

        const validOptions = newChoiceOptions
          .filter((opt) => opt.label.trim())
          .map((opt) => ({
            label: opt.label.trim(),
            key: opt.key.trim() || normalizeLocalSymbolicName(opt.label),
          }));

        if (validOptions.length === 0) {
          setError("Please add at least one choice option.");
          setActionPending(false);
          return false;
        }

        if (hasDuplicateInlineOptions) {
          setActionPending(false);
          return false;
        }

        if (onSaveChoiceList) {
          const choiceListRes = await onSaveChoiceList({
            expectedRevision: currentRevision,
            name: newChoiceListName.trim(),
            key: normalizeLocalSymbolicName(newChoiceListName),
            options: validOptions,
          });

          if (choiceListRes?.choiceList?.id) {
            finalChoiceListId = choiceListRes.choiceList.id;
          }
          if (choiceListRes?.solutionRevision) {
            currentRevision = choiceListRes.solutionRevision;
          }
        }
      }

      // Map Validation Preset & Format Preset
      let finalFormatPreset = "NONE";
      let finalRegexPreset = null;
      let finalCustomRegex = null;

      if (patternPreset === "EMAIL") {
        finalFormatPreset = "EMAIL";
        finalRegexPreset = "EMAIL_BASIC";
      } else if (patternPreset === "PHONE") {
        finalFormatPreset = "PHONE";
        finalRegexPreset = "INDIAN_MOBILE";
      } else if (patternPreset === "CUSTOM") {
        if (customPattern.trim()) {
          finalCustomRegex = {
            pattern: customPattern.trim(),
            flags: customFlags.trim() || null,
          };
        }
      } else if (patternPreset !== "NONE") {
        finalRegexPreset = patternPreset;
      }

      // Calculate storedDataType
      let storedDataType = "TEXT";
      if (displayType === "Number") storedDataType = "NUMBER";
      else if (displayType === "Boolean") storedDataType = "BOOLEAN";
      else if (displayType === "Date") storedDataType = includeTime ? "DATETIME" : "DATE";
      else if (displayType === "Choice") storedDataType = "TEXT";

      const validationRulesPayload: any = {};

      if (displayType === "Text") {
        if (minLength !== "") validationRulesPayload.minLength = parseInt(minLength, 10);
        if (maxLength !== "") validationRulesPayload.maxLength = parseInt(maxLength, 10);
        if (finalRegexPreset) validationRulesPayload.regexPreset = finalRegexPreset;
        if (finalCustomRegex) validationRulesPayload.customRegex = finalCustomRegex;
      } else if (displayType === "Number") {
        if (minimumValue !== "") validationRulesPayload.minimumValue = parseFloat(minimumValue);
        if (maximumValue !== "") validationRulesPayload.maximumValue = parseFloat(maximumValue);
      } else if (displayType === "Date") {
        if (!includeTime) {
          if (minimumDate) validationRulesPayload.minimumDate = minimumDate;
          if (maximumDate) validationRulesPayload.maximumDate = maximumDate;
        } else {
          if (minimumDatetime) validationRulesPayload.minimumDatetime = minimumDatetime;
          if (maximumDatetime) validationRulesPayload.maximumDatetime = maximumDatetime;
        }
      }

      if (validationMessage.trim()) {
        validationRulesPayload.validationMessage = validationMessage.trim();
      }

      const targetLocalSymbolicName = isCreateMode
        ? normalizeLocalSymbolicName(label)
        : property.localSymbolicName;

      let finalDefaultControl: string | null = null;
      if (displayType === "Text") {
        finalDefaultControl = "TEXT_INPUT";
      } else if (displayType === "Number") {
        finalDefaultControl = "NUMBER_INPUT";
      } else if (displayType === "Date") {
        finalDefaultControl = includeTime ? "DATETIME_PICKER" : "DATE_PICKER";
      } else if (displayType === "Boolean") {
        finalDefaultControl = booleanDefaultControl;
      } else if (displayType === "Choice") {
        finalDefaultControl = choiceDefaultControl;
      }

      const payload: any = {
        id: property?.id,
        label: label.trim(),
        localSymbolicName: targetLocalSymbolicName,
        storedDataType,
        formatPreset: finalFormatPreset,
        choiceListId: finalChoiceListId,
        cardinality: displayType === "Choice" ? cardinality : "SINGLE",
        defaultValue: defaultValue !== "" && defaultValue !== null ? defaultValue : null,
        helpText: helpText.trim() || null,
        isSensitive,
        defaultControlType: finalDefaultControl,
        validationRules: Object.keys(validationRulesPayload).length > 0 ? validationRulesPayload : null,
        expectedRevision: currentRevision,
      };

      await onSave(payload);
      // Reset the baseline state to current saved state so initialSnapshot updates and dirty evaluates to clean
      const newSavedState = {
        label: label.trim(),
        displayType,
        helpText: helpText.trim(),
        isSensitive,
        defaultValue: defaultValue !== "" && defaultValue !== null ? defaultValue : "",
        includeTime,
        booleanDefaultControl,
        choiceDefaultControl,
        cardinality,
        choiceMode: "existing" as const,
        selectedChoiceListId: finalChoiceListId || selectedChoiceListId,
        newChoiceListName: "",
        newChoiceOptions: [{ label: "", key: "" }],
        minLength,
        maxLength,
        minimumValue,
        maximumValue,
        minimumDate,
        maximumDate,
        minimumDatetime,
        maximumDatetime,
        patternPreset,
        customPattern: customPattern.trim(),
        customFlags: customFlags.trim(),
        validationMessage: validationMessage.trim(),
      };
      setBaselineState(newSavedState);
      restoreFromState(newSavedState);
      return true;
    } catch (err: any) {
      if (err?.code === "DUPLICATE_SYMBOLIC_NAME") {
        setError(`A Property with symbolic name ${derivedSymbolicDisplay} already exists.`);
      } else {
        setError(err?.message || "Failed to save Property.");
      }
      return false;
    } finally {
      setActionPending(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submitSave: performSave,
    discard: () => {
      restoreFromState(baselineState);
      setIsDirty?.(false);
    },
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave();
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        padding: "var(--space-6)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
          {isCreateMode ? "Add Property" : `Edit Property: ${property.label}`}
        </h2>
        <Button variant="secondary" onClick={handleCancelClick} disabled={isPending || actionPending}>
          Cancel
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Row 1: Property Name (Left) & Read-only Symbolic Name (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "flex-start" }}>
          <FormField id="prop-name" label="Property Name" isRequired>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={label}
                onChange={handleLabelChange}
                placeholder="e.g., Date of Birth"
                disabled={isPending || actionPending}
                required
              />
            )}
          </FormField>

          <div>
            <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", display: "block" }}>
              Symbolic Name
            </label>
            <div style={{ fontSize: "var(--font-size-sm)", fontFamily: "monospace", color: "var(--text-primary)", fontWeight: "var(--font-weight-bold)", marginTop: "var(--space-2)" }}>
              {derivedSymbolicDisplay}
            </div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              Generated automatically
            </span>
          </div>
        </div>

        {/* Row 2: Data Type (Left) & Sensitive Checkbox (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "center" }}>
          <FormField id="prop-type" label="Data Type" isRequired>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                aria-label="Data Type"
                options={dataTypeOptions}
                value={displayType}
                onChange={handleDisplayTypeChange}
                disabled={isPending || actionPending}
              />
            )}
          </FormField>

          <div style={{ marginTop: "var(--space-4)" }}>
            <Checkbox
              id="prop-sensitive"
              label="Sensitive"
              checked={isSensitive}
              onChange={(e) => {
                setIsSensitive(e.target.checked);
                setIsDirty?.(true);
              }}
            />
          </div>
        </div>

        {/* Row 3: Help Text */}
        <FormField id="prop-help-text" label="Help Text">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={helpText}
              onChange={(e) => {
                setHelpText(e.target.value);
                setIsDirty?.(true);
              }}
              placeholder="Help text for end users"
            />
          )}
        </FormField>

        {/* --- TYPE-SPECIFIC CONFIGURATION SECTIONS --- */}

        {/* 1. TEXT PROPERTY CONFIGURATION */}
        {displayType === "Text" && (
          <div style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
              <FormField id="prop-default-text" label="Default Value">
                {(props) => (
                  <Input
                    {...props}
                    type="text"
                    value={defaultValue || ""}
                    onChange={(e) => {
                      setDefaultValue(e.target.value || null);
                      setIsDirty?.(true);
                    }}
                    placeholder="Optional default text"
                  />
                )}
              </FormField>
              <FormField id="prop-min-len" label="Minimum Length">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={minLength}
                    onChange={(e) => setMinLength(e.target.value)}
                    placeholder="Min"
                  />
                )}
              </FormField>
              <FormField id="prop-max-len" label="Maximum Length">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={maxLength}
                    onChange={(e) => setMaxLength(e.target.value)}
                    placeholder="Max"
                  />
                )}
              </FormField>
            </div>

            <FormField id="prop-pattern-preset" label="Validation">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  aria-label="Validation"
                  options={patternOptions}
                  value={patternPreset}
                  onChange={(val) => setPatternPreset(val)}
                />
              )}
            </FormField>

            {patternPreset === "CUSTOM" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)", backgroundColor: "var(--bg-page)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
                  <FormField id="prop-custom-pattern" label="Pattern">
                    {(props) => (
                      <Input
                        {...props}
                        value={customPattern}
                        onChange={(e) => setCustomPattern(e.target.value)}
                        placeholder="e.g. ^[A-Z]{3}-\d{4}$"
                      />
                    )}
                  </FormField>
                  <FormField id="prop-custom-flags" label="Flags">
                    {(props) => (
                      <Input
                        {...props}
                        value={customFlags}
                        onChange={(e) => setCustomFlags(e.target.value)}
                        placeholder="e.g. i"
                      />
                    )}
                  </FormField>
                </div>
                <FormField id="prop-val-msg" label="Error Message">
                  {(props) => (
                    <Input
                      {...props}
                      value={validationMessage}
                      onChange={(e) => setValidationMessage(e.target.value)}
                      placeholder="e.g. Enter a valid alphanumeric code"
                    />
                  )}
                </FormField>
              </div>
            )}

            {patternPreset !== "NONE" && (
              <ValidationTestPanel
                solutionId={solutionId}
                storedDataType="TEXT"
                formatPreset={patternPreset === "EMAIL" ? "EMAIL" : patternPreset === "PHONE" ? "PHONE" : "NONE"}
                validationRules={{
                  regexPreset: patternPreset !== "CUSTOM" && patternPreset !== "EMAIL" && patternPreset !== "PHONE" ? patternPreset : null,
                  customRegex: patternPreset === "CUSTOM" && customPattern ? { pattern: customPattern, flags: customFlags || null } : null,
                }}
              />
            )}
          </div>
        )}

        {/* 2. NUMBER PROPERTY CONFIGURATION */}
        {displayType === "Number" && (
          <div style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-default)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
              <FormField id="prop-default-num" label="Default Value">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={defaultValue ?? ""}
                    onChange={(e) => {
                      setDefaultValue(e.target.value === "" ? null : parseFloat(e.target.value));
                      setIsDirty?.(true);
                    }}
                    placeholder="Default"
                  />
                )}
              </FormField>
              <FormField id="prop-min-val" label="Minimum Value">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={minimumValue}
                    onChange={(e) => setMinimumValue(e.target.value)}
                    placeholder="Min"
                  />
                )}
              </FormField>
              <FormField id="prop-max-val" label="Maximum Value">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={maximumValue}
                    onChange={(e) => setMaximumValue(e.target.value)}
                    placeholder="Max"
                  />
                )}
              </FormField>
            </div>
          </div>
        )}

        {/* 3. DATE PROPERTY CONFIGURATION */}
        {displayType === "Date" && (
          <div style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ marginBottom: "var(--space-2)" }}>
              <Checkbox
                id="prop-include-time"
                label="Include time"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
              />
            </div>

            {!includeTime ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <FormField id="prop-default-date" label="Default Date">
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={defaultValue || ""}
                      onChange={(e) => setDefaultValue(e.target.value || null)}
                    />
                  )}
                </FormField>
                <FormField id="prop-min-date" label="Minimum Date">
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={minimumDate}
                      onChange={(e) => setMinimumDate(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField id="prop-max-date" label="Maximum Date">
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={maximumDate}
                      onChange={(e) => setMaximumDate(e.target.value)}
                    />
                  )}
                </FormField>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <FormField id="prop-default-datetime" label="Default Date & Time">
                  {(props) => (
                    <Input
                      {...props}
                      type="datetime-local"
                      value={defaultValue || ""}
                      onChange={(e) => setDefaultValue(e.target.value || null)}
                    />
                  )}
                </FormField>
                <FormField id="prop-min-datetime" label="Minimum Date & Time">
                  {(props) => (
                    <Input
                      {...props}
                      type="datetime-local"
                      value={minimumDatetime}
                      onChange={(e) => setMinimumDatetime(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField id="prop-max-datetime" label="Maximum Date & Time">
                  {(props) => (
                    <Input
                      {...props}
                      type="datetime-local"
                      value={maximumDatetime}
                      onChange={(e) => setMaximumDatetime(e.target.value)}
                    />
                  )}
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* 4. BOOLEAN PROPERTY CONFIGURATION */}
        {displayType === "Boolean" && (
          <div style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <FormField id="prop-default-bool" label="Default Value">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  aria-label="Default Value"
                  options={[
                    { value: "", label: "No default" },
                    { value: "true", label: "Yes" },
                    { value: "false", label: "No" },
                  ]}
                  value={String(defaultValue ?? "")}
                  onChange={(val) => setDefaultValue(val === "" ? null : val === "true")}
                />
              )}
            </FormField>

            <div>
              <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "block" }}>
                Default Control
              </label>
              <RadioGroup
                name="boolControl"
                value={booleanDefaultControl}
                onChange={(val) => setBooleanDefaultControl(val as "CHECKBOX" | "YES_NO")}
                options={[
                  { value: "CHECKBOX", label: "Checkbox" },
                  { value: "YES_NO", label: "Yes / No" },
                ]}
              />
            </div>
          </div>
        )}

        {/* 5. CHOICE PROPERTY CONFIGURATION */}
        {displayType === "Choice" && (
          <div
            style={{
              backgroundColor: "var(--bg-page)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {/* Selection */}
            <div>
              <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "block" }}>
                Selection
              </label>
              <RadioGroup
                name="cardinality"
                value={cardinality}
                onChange={(val) => {
                  setCardinality(val as "SINGLE" | "MULTIPLE");
                  setChoiceDefaultControl(val === "SINGLE" ? "DROPDOWN" : "MULTI_SELECT_DROPDOWN");
                }}
                options={[
                  { value: "SINGLE", label: "Single" },
                  { value: "MULTIPLE", label: "Multiple" },
                ]}
              />
            </div>

            {/* Default Control */}
            <div>
              <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "block" }}>
                Default Control
              </label>
              {cardinality === "SINGLE" ? (
                <RadioGroup
                  name="choiceCtrlSingle"
                  value={choiceDefaultControl}
                  onChange={(val) => {
                    setChoiceDefaultControl(val);
                    setIsDirty?.(true);
                  }}
                  options={[
                    { value: "DROPDOWN", label: "Dropdown" },
                    { value: "RADIO", label: "Radio Buttons" },
                  ]}
                />
              ) : (
                <RadioGroup
                  name="choiceCtrlMultiple"
                  value={choiceDefaultControl}
                  onChange={(val) => {
                    setChoiceDefaultControl(val);
                    setIsDirty?.(true);
                  }}
                  options={[
                    { value: "MULTI_SELECT_DROPDOWN", label: "Multi-select Dropdown" },
                    { value: "CHECKBOXES", label: "Checkboxes" },
                  ]}
                />
              )}
            </div>

            {/* Choices Mode */}
            <div>
              <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "block" }}>
                Choices
              </label>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <RadioGroup
                  name="choiceMode"
                  value={choiceMode}
                  onChange={(val) => setChoiceMode(val as "existing" | "new")}
                  options={[
                    { value: "existing", label: "Use existing reusable choices" },
                    { value: "new", label: "Create new reusable choices" },
                  ]}
                />
              </div>

              {choiceMode === "existing" ? (
                <FormField id="existing-choice-set" label="Reusable Choices">
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      aria-label="Reusable Choices"
                      options={choiceListOptions}
                      value={selectedChoiceListId}
                      onChange={(val) => setSelectedChoiceListId(val)}
                      placeholder="Select reusable choices..."
                    />
                  )}
                </FormField>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <FormField id="new-choice-set-name" label="Choice Set Name">
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        value={newChoiceListName}
                        onChange={(e) => setNewChoiceListName(e.target.value)}
                        placeholder="e.g., Employment Types"
                      />
                    )}
                  </FormField>

                  <div>
                    <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "block" }}>
                      Options
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {newChoiceOptions.map((opt, idx) => {
                        const isDuplicate = duplicateInlineOptionIndices.has(idx);
                        return (
                          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                              <Input
                                placeholder="Option Label (e.g. Salaried)"
                                value={opt.label}
                                onChange={(e) => handleChoiceOptionChange(idx, "label", e.target.value)}
                                style={isDuplicate ? { borderColor: "var(--error-border)" } : undefined}
                              />
                            </div>
                            {isDuplicate && (
                              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--error-main)" }}>
                                Option labels must be unique.
                              </span>
                            )}
                          </div>
                        );
                      })}
                      <Button type="button" variant="secondary" onClick={handleAddChoiceOption} style={{ height: "var(--control-height-sm)", width: "fit-content", marginTop: "var(--space-1)" }}>
                        + Add Option
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <Button type="button" variant="secondary" onClick={handleCancelClick} disabled={isPending || actionPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || actionPending || !label.trim() || hasDuplicateInlineOptions || (!isCreateMode && !calculatedIsDirty)}
            aria-busy={actionPending}
          >
            {actionPending ? "Saving Property..." : "Save Property"}
          </Button>
        </div>
      </form>
    </div>
  );
});
