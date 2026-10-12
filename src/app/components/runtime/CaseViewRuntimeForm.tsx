"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  FormAggregate,
  FormFieldRefRow,
  SolutionPropertyRow,
} from "@/modules/solution/index";
import { Input, Label } from "@/app/components/ui";
import { validateRuntimeField } from "./validation";

export interface ChoiceOptionDto {
  key: string;
  label: string;
}

export interface ChoiceListDto {
  id: string;
  key: string;
  name: string;
  options: ChoiceOptionDto[];
}

export interface QueueDto {
  id: string;
  queueKey: string;
  name: string;
}

interface CaseViewRuntimeFormProps {
  formAggregate: FormAggregate;
  properties: SolutionPropertyRow[];
  choiceLists?: ChoiceListDto[];
  activeQueueId: string;
  activeQueueName?: string;
  availableQueues?: QueueDto[];
  initialValues: Record<string, any>;
  isReadOnly?: boolean;
  onValuesChange?: (values: Record<string, any>) => void;
  onValidationChange?: (hasErrors: boolean) => void;
}

export function CaseViewRuntimeForm({
  formAggregate,
  properties,
  choiceLists = [],
  activeQueueId,
  activeQueueName = "SOL Maker",
  initialValues,
  isReadOnly = false,
  onValuesChange,
  onValidationChange,
}: CaseViewRuntimeFormProps) {
  // Current values state (pure form state)
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues);

  // Touched fields tracking for validation
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Collapsible section state (transient UI only, does not affect form dirty state)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Active Tab state
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return formAggregate.tabs?.[0]?.id || "";
  });

  useEffect(() => {
    if (formAggregate.tabs?.length && !formAggregate.tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(formAggregate.tabs[0].id);
    }
  }, [formAggregate.tabs, activeTabId]);

  // Map properties by ID and by symbolic/technical names for flexible demo mapping
  const propertyMap = useMemo(() => {
    const byId = new Map<string, SolutionPropertyRow>();
    properties.forEach((p) => {
      byId.set(p.id, p);
    });
    return byId;
  }, [properties]);

  const choiceListMap = useMemo(() => {
    const byId = new Map<string, ChoiceListDto>();
    choiceLists.forEach((cl) => {
      byId.set(cl.id, cl);
    });
    return byId;
  }, [choiceLists]);

  // Handle field value change
  const handleFieldChange = (key: string, value: any) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      if (onValuesChange) {
        onValuesChange(next);
      }
      return next;
    });
  };

  // Resolve current value for a property
  const getFieldValue = (property?: SolutionPropertyRow): string => {
    if (!property) return "";
    if (formValues[property.id] !== undefined) return String(formValues[property.id]);
    if (formValues[property.localSymbolicName] !== undefined) return String(formValues[property.localSymbolicName]);
    if (formValues[property.generatedTechnicalName] !== undefined) return String(formValues[property.generatedTechnicalName]);

    // Check lowercase/clean match
    const cleanSym = property.localSymbolicName.toLowerCase();
    for (const [k, v] of Object.entries(formValues)) {
      if (k.toLowerCase() === cleanSym) return String(v);
    }

    return property.defaultValue || "";
  };

  // Compute effective behavior for a field under active queue
  const getEffectiveFieldBehavior = (field: FormFieldRefRow) => {
    // 1. Look up explicit rule for activeQueueId
    const explicitRule = formAggregate.queueRules?.find(
      (r) => r.fieldReferenceId === field.id && r.queueId === activeQueueId
    );

    if (explicitRule) {
      return {
        isVisible: explicitRule.isVisible,
        isEditable: explicitRule.isEditable,
        isRequired: explicitRule.isRequired,
        isQueueCustomized: true,
      };
    }

    // 2. Fall back to static field rules
    return {
      isVisible: field.isVisible ?? true,
      isEditable: field.isEditable ?? true,
      isRequired: field.isRequired ?? false,
      isQueueCustomized: false,
    };
  };

  // Group sections by tab
  const activeSections = useMemo(() => {
    return (formAggregate.sections || [])
      .filter((s) => s.tabId === activeTabId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [formAggregate.sections, activeTabId]);

  // Group fields by section
  const fieldsBySection = useMemo(() => {
    const map = new Map<string, FormFieldRefRow[]>();
    (formAggregate.fields || []).forEach((f) => {
      const list = map.get(f.sectionId) || [];
      list.push(f);
      map.set(f.sectionId, list);
    });
    // Sort fields in each section
    map.forEach((list) => {
      list.sort((a, b) => a.displayOrder - b.displayOrder);
    });
    return map;
  }, [formAggregate.fields]);

  // Section collapse helpers: First section (index 0) expanded by default; subsequent collapsed by default
  const isSectionCollapsed = (sectionId: string, index: number): boolean => {
    if (collapsedSections[sectionId] !== undefined) {
      return collapsedSections[sectionId];
    }
    return index > 0;
  };

  const toggleSection = (sectionId: string, index: number) => {
    const current = isSectionCollapsed(sectionId, index);
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !current,
    }));
  };

  // Validate form errors across all visible editable fields
  const hasValidationErrors = useMemo(() => {
    let hasErr = false;
    (formAggregate.fields || []).forEach((field) => {
      const prop = propertyMap.get(field.propertyId);
      const behavior = getEffectiveFieldBehavior(field);
      if (!behavior.isVisible) return;
      const isFieldReadOnly = isReadOnly || !behavior.isEditable;
      if (isFieldReadOnly) return;

      const val = getFieldValue(prop);
      const err = validateRuntimeField(
        prop,
        {
          isVisible: behavior.isVisible,
          isEditable: true,
          isRequired: behavior.isRequired,
        },
        val
      );
      if (err) {
        hasErr = true;
      }
    });
    return hasErr;
  }, [formAggregate.fields, propertyMap, activeQueueId, isReadOnly, formValues]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(hasValidationErrors);
    }
  }, [hasValidationErrors, onValidationChange]);

  return (
    <div
      data-testid="case-view-runtime-form"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Tabs Bar (when multiple tabs exist) */}
      {formAggregate.tabs && formAggregate.tabs.length > 1 && (
        <div
          role="tablist"
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
            padding: "0 var(--space-4)",
            overflowX: "auto",
            flexShrink: 0,
          }}
        >
          {formAggregate.tabs
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveTabId(tab.id)}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: isActive ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                    color: isActive ? "var(--action-primary)" : "var(--text-secondary)",
                    border: "none",
                    borderBottom: isActive ? "2.5px solid var(--action-primary)" : "2.5px solid transparent",
                    background: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color var(--transition-speed) ease",
                  }}
                >
                  {tab.title}
                </button>
              );
            })}
        </div>
      )}

      {/* Form Content: Sections and Fields (Scrollable) */}
      <div
        data-testid="case-view-form-scrollable"
        style={{
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          overflowY: "auto",
          flex: "1 1 0%",
          minHeight: 0,
        }}
      >
        {activeSections.length === 0 ? (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-secondary)" }}>
            No sections defined for this tab.
          </div>
        ) : (
          activeSections.map((section, sectionIndex) => {
            const sectionFields = fieldsBySection.get(section.id) || [];

            // Filter out fields that are hidden under current queue rule
            const visibleFields = sectionFields.filter((f) => {
              const behavior = getEffectiveFieldBehavior(f);
              return behavior.isVisible;
            });

            const isCollapsed = isSectionCollapsed(section.id, sectionIndex);

            return (
              <div
                key={section.id}
                data-testid={`form-section-${section.id}`}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  padding: "var(--space-4)",
                  transition: "all var(--transition-speed) ease",
                }}
              >
                {/* Collapsible Section Header */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  data-testid={`section-header-${section.id}`}
                  onClick={() => toggleSection(section.id, sectionIndex)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSection(section.id, sectionIndex);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    userSelect: "none",
                    margin: isCollapsed ? 0 : "0 0 var(--space-4) 0",
                    paddingBottom: isCollapsed ? 0 : "var(--space-2)",
                    borderBottom: isCollapsed ? "none" : "1px solid var(--border-default)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span
                      data-testid={`section-chevron-${section.id}`}
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-muted)",
                        lineHeight: 1,
                      }}
                    >
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                    <h4
                      style={{
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {section.title}
                    </h4>
                  </div>
                  <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "normal", color: "var(--text-muted)" }}>
                    {visibleFields.length} {visibleFields.length === 1 ? "field" : "fields"}
                  </span>
                </div>

                {/* Section Body (Visible only when expanded) */}
                {!isCollapsed && (
                  <>
                    {visibleFields.length === 0 ? (
                      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                        All fields in this section are hidden for queue &quot;{activeQueueName}&quot;.
                      </p>
                    ) : (
                      <div
                        data-testid={`section-fields-${section.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: "var(--space-4)",
                        }}
                      >
                        {visibleFields.map((field) => {
                          const prop = propertyMap.get(field.propertyId);
                          const behavior = getEffectiveFieldBehavior(field);
                          const value = getFieldValue(prop);
                          const fieldKey = prop?.localSymbolicName || field.propertyId;

                          // Search read-only mode makes all fields read-only regardless of Queue rule
                          const isFieldReadOnly = isReadOnly || !behavior.isEditable;
                          const isRequired = behavior.isRequired;

                          // Property validation evaluation
                          const validationError = validateRuntimeField(
                            prop,
                            {
                              isVisible: behavior.isVisible,
                              isEditable: !isFieldReadOnly,
                              isRequired: behavior.isRequired,
                            },
                            value
                          );

                          const hasTouched = touchedFields[fieldKey];
                          const showError = Boolean(
                            validationError && (hasTouched || (formValues[fieldKey] !== undefined && !isFieldReadOnly))
                          );

                          return (
                            <div
                              key={field.id}
                              data-testid={`runtime-field-${fieldKey}`}
                              style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Label
                                  htmlFor={`field-${field.id}`}
                                  style={{
                                    fontSize: "var(--font-size-xs)",
                                    fontWeight: "var(--font-weight-semibold)",
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {prop?.label || fieldKey}
                                  {isRequired && <span style={{ color: "var(--error-main)", marginLeft: "4px" }}>*</span>}
                                </Label>
                                {isFieldReadOnly && (
                                  <span
                                    data-testid={`readonly-badge-${fieldKey}`}
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--text-muted)",
                                      backgroundColor: "var(--action-secondary-bg)",
                                      padding: "1px 4px",
                                      borderRadius: "3px",
                                    }}
                                  >
                                    Read-only
                                  </span>
                                )}
                              </div>

                              {/* Control Rendering based on field.controlType */}
                              {field.controlType === "TEXT_INPUT" && (
                                <Input
                                  id={`field-${field.id}`}
                                  type="text"
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  placeholder={`Enter ${prop?.label || fieldKey}`}
                                  style={{
                                    height: "var(--control-height-sm)",
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "text",
                                    borderColor: showError ? "var(--error-main)" : undefined,
                                  }}
                                />
                              )}

                              {field.controlType === "TEXTAREA" && (
                                <textarea
                                  id={`field-${field.id}`}
                                  rows={3}
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  placeholder={`Enter ${prop?.label || fieldKey}`}
                                  style={{
                                    width: "100%",
                                    padding: "var(--space-2)",
                                    fontSize: "var(--font-size-sm)",
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${showError ? "var(--error-main)" : "var(--border-default)"}`,
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    color: isFieldReadOnly ? "var(--text-secondary)" : "var(--text-primary)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "text",
                                    fontFamily: "inherit",
                                    resize: "vertical",
                                  }}
                                />
                              )}

                              {field.controlType === "NUMBER_INPUT" && (
                                <Input
                                  id={`field-${field.id}`}
                                  type="number"
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  placeholder="0"
                                  style={{
                                    height: "var(--control-height-sm)",
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "text",
                                    borderColor: showError ? "var(--error-main)" : undefined,
                                  }}
                                />
                              )}

                              {field.controlType === "DATE_PICKER" && (
                                <Input
                                  id={`field-${field.id}`}
                                  type="date"
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  style={{
                                    height: "var(--control-height-sm)",
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "pointer",
                                    borderColor: showError ? "var(--error-main)" : undefined,
                                  }}
                                />
                              )}

                              {field.controlType === "DATETIME_PICKER" && (
                                <Input
                                  id={`field-${field.id}`}
                                  type="datetime-local"
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  style={{
                                    height: "var(--control-height-sm)",
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "pointer",
                                    borderColor: showError ? "var(--error-main)" : undefined,
                                  }}
                                />
                              )}

                              {field.controlType === "CHECKBOX" && (
                                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", height: "var(--control-height-sm)" }}>
                                  <input
                                    id={`field-${field.id}`}
                                    type="checkbox"
                                    checked={value === "true" || value === "Yes" || Boolean(value)}
                                    disabled={isFieldReadOnly}
                                    onChange={(e) => handleFieldChange(fieldKey, e.target.checked ? "Yes" : "No")}
                                    style={{ width: "16px", height: "16px", cursor: isFieldReadOnly ? "not-allowed" : "pointer" }}
                                  />
                                  <label htmlFor={`field-${field.id}`} style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                                    {prop?.label}
                                  </label>
                                </div>
                              )}

                              {field.controlType === "DROPDOWN" && (
                                <select
                                  id={`field-${field.id}`}
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  required={isRequired}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  style={{
                                    width: "100%",
                                    height: "var(--control-height-sm)",
                                    padding: "0 var(--space-2)",
                                    fontSize: "var(--font-size-sm)",
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${showError ? "var(--error-main)" : "var(--border-default)"}`,
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    color: isFieldReadOnly ? "var(--text-secondary)" : "var(--text-primary)",
                                    cursor: isFieldReadOnly ? "not-allowed" : "pointer",
                                  }}
                                >
                                  <option value="">Select an option</option>
                                  {prop?.choiceListId && choiceListMap.get(prop.choiceListId)?.options.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                      {opt.label}
                                    </option>
                                  ))}
                                  {!prop?.choiceListId && (
                                    <>
                                      <option value={value || "Option 1"}>{value || "Option 1"}</option>
                                      <option value="Salaried">Salaried</option>
                                      <option value="Self Employed">Self Employed</option>
                                      <option value="Business">Business</option>
                                    </>
                                  )}
                                </select>
                              )}

                              {field.controlType === "RADIO" && (
                                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", paddingTop: "4px" }}>
                                  {prop?.choiceListId && choiceListMap.get(prop.choiceListId)?.options.map((opt) => (
                                    <label key={opt.key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--font-size-xs)" }}>
                                      <input
                                        type="radio"
                                        name={`field-${field.id}`}
                                        value={opt.key}
                                        checked={value === opt.key}
                                        disabled={isFieldReadOnly}
                                        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  ))}
                                  {!prop?.choiceListId && (
                                    <>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--font-size-xs)" }}>
                                        <input
                                          type="radio"
                                          name={`field-${field.id}`}
                                          value="Yes"
                                          checked={value === "Yes"}
                                          disabled={isFieldReadOnly}
                                          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                        />
                                        <span>Yes</span>
                                      </label>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--font-size-xs)" }}>
                                        <input
                                          type="radio"
                                          name={`field-${field.id}`}
                                          value="No"
                                          checked={value === "No"}
                                          disabled={isFieldReadOnly}
                                          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                        />
                                        <span>No</span>
                                      </label>
                                    </>
                                  )}
                                </div>
                              )}

                              {field.controlType === "USER_PICKER" && (
                                <Input
                                  id={`field-${field.id}`}
                                  type="text"
                                  value={value}
                                  disabled={isFieldReadOnly}
                                  readOnly={isFieldReadOnly}
                                  placeholder="Assignee User"
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  style={{
                                    height: "var(--control-height-sm)",
                                    backgroundColor: isFieldReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                    borderColor: showError ? "var(--error-main)" : undefined,
                                  }}
                                />
                              )}

                              {/* Validation Error Message */}
                              {showError && (
                                <span
                                  data-testid={`field-error-${fieldKey}`}
                                  style={{
                                    fontSize: "var(--font-size-xs)",
                                    color: "var(--error-main)",
                                    marginTop: "2px",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {validationError}
                                </span>
                              )}

                              {prop?.helpText && !showError && (
                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                  {prop.helpText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
