"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormAggregate, FormFieldRefRow, SolutionPropertyRow } from "@/modules/solution/index";
import { ChoiceListDto } from "./CaseViewRuntimeForm";
import { saveDemoCaseValues } from "@/demo-runtime/adapter";
import { Input, Button, Label } from "@/app/components/ui";
import { validateRuntimeField } from "./validation";

interface CreateCaseContainerProps {
  solution: {
    id: string;
    name: string;
    solutionPrefix: string;
  };
  formAggregate: FormAggregate | null;
  properties: SolutionPropertyRow[];
  choiceLists?: ChoiceListDto[];
}

export function CreateCaseContainer({
  solution,
  formAggregate,
  properties,
  choiceLists = [],
}: CreateCaseContainerProps) {
  const router = useRouter();

  // Map properties by ID and Symbolic Name for lookup
  const propertyMap = useMemo(() => {
    const map = new Map<string, SolutionPropertyRow>();
    properties.forEach((p) => {
      map.set(p.id, p);
      map.set(p.localSymbolicName, p);
      map.set(p.localSymbolicName.toLowerCase(), p);
    });
    return map;
  }, [properties]);

  // Choice lists map
  const choiceListsMap = useMemo(() => {
    const byId = new Map<string, ChoiceListDto>();
    choiceLists.forEach((cl) => {
      byId.set(cl.id, cl);
    });
    return byId;
  }, [choiceLists]);

  // Initialize active tab from formAggregate tabs if available
  const tabs = useMemo(() => {
    return (formAggregate?.tabs || []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
  }, [formAggregate]);

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabs[0]?.id || "";
  });

  // Keep form values state
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    properties.forEach((p) => {
      if (p.defaultValue !== null && p.defaultValue !== undefined) {
        initial[p.localSymbolicName] = p.defaultValue;
      }
    });
    return initial;
  });

  // Touched fields tracking and submit state
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (key: string, value: any) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Sections for active tab
  const activeSections = useMemo(() => {
    if (!formAggregate?.sections || formAggregate.sections.length === 0) return [];
    if (!activeTabId && tabs.length > 0) return [];
    return formAggregate.sections
      .filter((s) => !activeTabId || s.tabId === activeTabId)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [formAggregate, activeTabId, tabs]);

  // Fields grouped by section
  const fieldsBySection = useMemo(() => {
    const map = new Map<string, FormFieldRefRow[]>();
    (formAggregate?.fields || []).forEach((f) => {
      const list = map.get(f.sectionId) || [];
      list.push(f);
      map.set(f.sectionId, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => a.displayOrder - b.displayOrder);
    });
    return map;
  }, [formAggregate]);

  const hasFormLayout = Boolean(formAggregate && formAggregate.sections && formAggregate.sections.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    // Validate all fields across the form
    let hasError = false;

    if (hasFormLayout) {
      (formAggregate?.fields || []).forEach((f) => {
        if (!f.isVisible) return;
        const prop = propertyMap.get(f.propertyId);
        const fieldKey = prop?.localSymbolicName || f.propertyId;
        const val = formValues[fieldKey] ?? formValues[prop?.id || ""] ?? prop?.defaultValue ?? "";
        const err = validateRuntimeField(
          prop,
          {
            isVisible: true,
            isEditable: f.isEditable ?? true,
            isRequired: f.isRequired ?? false,
          },
          val
        );
        if (err) {
          hasError = true;
        }
      });
    } else {
      properties.forEach((p) => {
        const fieldKey = p.localSymbolicName;
        const val = formValues[fieldKey] ?? p.defaultValue ?? "";
        const err = validateRuntimeField(
          p,
          { isVisible: true, isEditable: true, isRequired: false },
          val
        );
        if (err) {
          hasError = true;
        }
      });
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newWid = `WID-2026-${randomSuffix}`;
    const newCaseId = `${solution.solutionPrefix}-2026-0${randomSuffix}`;

    // Derive applicant/customer name from dynamic form values if available
    let customerName = "New Applicant";
    for (const [k, v] of Object.entries(formValues)) {
      const lk = k.toLowerCase();
      if ((lk.includes("customer") || lk.includes("applicant") || lk.includes("name")) && typeof v === "string" && v.trim()) {
        customerName = v.trim();
        break;
      }
    }
    if (customerName === "New Applicant" && formValues["firstName"]) {
      customerName = `${formValues["firstName"]} ${formValues["lastName"] || ""}`.trim();
    }

    saveDemoCaseValues(newWid, {
      caseId: newCaseId,
      customerName,
      receivedDate: "Just now",
      values: formValues,
    });

    // Navigate to the newly created WID processing page
    setTimeout(() => {
      router.push(`/solutions/${solution.id}/work-items/${newWid}`);
    }, 300);
  };

  return (
    <div
      className="ucs-runtime-container"
      data-testid="create-case-container"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}
    >
      {/* Header & Breadcrumb */}
      <div>
        <Link
          href={`/solutions/${solution.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontWeight: "var(--font-weight-medium)",
            marginBottom: "var(--space-2)",
          }}
        >
          ← Back to Navigator ({solution.name})
        </Link>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Create New Case
        </h1>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
          Fill in the required application details according to the solution schema.
        </p>
      </div>

      {/* Main Dynamic Form Aggregate Card */}
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Tab Headers if multiple tabs exist */}
        {tabs.length > 1 && (
          <div
            role="tablist"
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-page)",
              padding: "0 var(--space-6)",
              overflowX: "auto",
            }}
          >
            {tabs.map((tab) => {
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

        {/* Form Body: Sections and Fields */}
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {hasFormLayout ? (
            activeSections.map((section) => {
              const sectionFields = fieldsBySection.get(section.id) || [];
              const visibleFields = sectionFields.filter((f) => f.isVisible);

              if (visibleFields.length === 0) return null;

              return (
                <div key={section.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <h3
                    style={{
                      fontSize: "var(--font-size-base)",
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--text-primary)",
                      margin: 0,
                      paddingBottom: "var(--space-2)",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    {section.title}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "var(--space-4)",
                    }}
                  >
                    {visibleFields.map((field) => {
                      const prop = propertyMap.get(field.propertyId);
                      const fieldKey = prop?.localSymbolicName || field.propertyId;
                      const value = formValues[fieldKey] !== undefined ? String(formValues[fieldKey]) : prop?.defaultValue || "";
                      const isRequired = field.isRequired;
                      const isReadOnly = !field.isEditable;

                      const choiceOptions =
                        prop?.choiceListId && choiceListsMap.has(prop.choiceListId)
                          ? choiceListsMap.get(prop.choiceListId)!.options
                          : [];

                      // Validate field
                      const fieldError = validateRuntimeField(
                        prop,
                        {
                          isVisible: true,
                          isEditable: field.isEditable ?? true,
                          isRequired: field.isRequired ?? false,
                        },
                        value
                      );

                      const showError = Boolean(
                        fieldError && (touchedFields[fieldKey] || isSubmitted)
                      );

                      return (
                        <div key={field.id} data-testid={`runtime-field-${fieldKey}`} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Label
                              htmlFor={`add-field-${field.id}`}
                              style={{
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {prop?.label || fieldKey}
                              {isRequired && <span style={{ color: "var(--error-main)", marginLeft: "4px" }}>*</span>}
                            </Label>
                            {isReadOnly && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", backgroundColor: "var(--action-secondary-bg)", padding: "1px 4px", borderRadius: "3px" }}>
                                Read-only
                              </span>
                            )}
                          </div>

                          {/* Control Type Rendering */}
                          {field.controlType === "TEXT_INPUT" && (
                            <Input
                              id={`add-field-${field.id}`}
                              type="text"
                              value={value}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              placeholder={`Enter ${prop?.label || fieldKey}`}
                              style={{
                                height: "var(--control-height-sm)",
                                backgroundColor: isReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                borderColor: showError ? "var(--error-main)" : undefined,
                              }}
                            />
                          )}

                          {field.controlType === "TEXTAREA" && (
                            <textarea
                              id={`add-field-${field.id}`}
                              rows={3}
                              value={value}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              placeholder={`Enter ${prop?.label || fieldKey}`}
                              style={{
                                width: "100%",
                                padding: "var(--space-2)",
                                fontSize: "var(--font-size-sm)",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid ${showError ? "var(--error-main)" : "var(--border-default)"}`,
                                backgroundColor: isReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                color: "var(--text-primary)",
                                resize: "vertical",
                              }}
                            />
                          )}

                          {field.controlType === "NUMBER_INPUT" && (
                            <Input
                              id={`add-field-${field.id}`}
                              type="number"
                              value={value}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              placeholder="0"
                              style={{
                                height: "var(--control-height-sm)",
                                backgroundColor: isReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                borderColor: showError ? "var(--error-main)" : undefined,
                              }}
                            />
                          )}

                          {field.controlType === "DATE_PICKER" && (
                            <Input
                              id={`add-field-${field.id}`}
                              type="date"
                              value={value}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              style={{
                                height: "var(--control-height-sm)",
                                backgroundColor: isReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                borderColor: showError ? "var(--error-main)" : undefined,
                              }}
                            />
                          )}

                          {field.controlType === "CHECKBOX" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", height: "var(--control-height-sm)" }}>
                              <input
                                id={`add-field-${field.id}`}
                                type="checkbox"
                                checked={value === "true" || value === "Yes" || Boolean(value)}
                                disabled={isReadOnly}
                                onChange={(e) => handleFieldChange(fieldKey, e.target.checked ? "Yes" : "No")}
                                style={{ width: "16px", height: "16px" }}
                              />
                              <label htmlFor={`add-field-${field.id}`} style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                                {prop?.label}
                              </label>
                            </div>
                          )}

                          {field.controlType === "DROPDOWN" && (
                            <select
                              id={`add-field-${field.id}`}
                              value={value}
                              disabled={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              style={{
                                width: "100%",
                                height: "var(--control-height-sm)",
                                padding: "0 var(--space-2)",
                                fontSize: "var(--font-size-sm)",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid ${showError ? "var(--error-main)" : "var(--border-default)"}`,
                                backgroundColor: isReadOnly ? "var(--bg-page)" : "var(--bg-surface)",
                                color: "var(--text-primary)",
                              }}
                            >
                              <option value="">Select {prop?.label || fieldKey}...</option>
                              {choiceOptions.length > 0 ? (
                                choiceOptions.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))
                              ) : (
                                <>
                                  <option value="Salaried">Salaried</option>
                                  <option value="Self Employed">Self Employed</option>
                                  <option value="Business">Business</option>
                                  <option value="Home Renovation">Home Renovation</option>
                                  <option value="Education">Education</option>
                                  <option value="Medical Expenses">Medical Expenses</option>
                                </>
                              )}
                            </select>
                          )}

                          {/* Fallback for other control types */}
                          {!["TEXT_INPUT", "TEXTAREA", "NUMBER_INPUT", "DATE_PICKER", "CHECKBOX", "DROPDOWN"].includes(field.controlType) && (
                            <Input
                              id={`add-field-${field.id}`}
                              type="text"
                              value={value}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              required={isRequired}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              placeholder={`Enter ${prop?.label || fieldKey}`}
                              style={{
                                height: "var(--control-height-sm)",
                                borderColor: showError ? "var(--error-main)" : undefined,
                              }}
                            />
                          )}

                          {/* Error Message */}
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
                              {fieldError}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            /* Fallback: If no Form layout is configured, render properties directly */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {properties.map((p) => {
                const val = formValues[p.localSymbolicName] !== undefined ? String(formValues[p.localSymbolicName]) : "";
                const fieldError = validateRuntimeField(
                  p,
                  { isVisible: true, isEditable: true, isRequired: false },
                  val
                );
                const showError = Boolean(fieldError && (touchedFields[p.localSymbolicName] || isSubmitted));

                return (
                  <div key={p.id} data-testid={`runtime-field-${p.localSymbolicName}`} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    <Label htmlFor={`prop-${p.id}`} style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                      {p.label}
                    </Label>
                    <Input
                      id={`prop-${p.id}`}
                      type="text"
                      value={val}
                      onChange={(e) => handleFieldChange(p.localSymbolicName, e.target.value)}
                      placeholder={`Enter ${p.label}`}
                      style={{ borderColor: showError ? "var(--error-main)" : undefined }}
                    />
                    {showError && (
                      <span
                        data-testid={`field-error-${p.localSymbolicName}`}
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--error-main)",
                          marginTop: "2px",
                        }}
                      >
                        {fieldError}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-6)",
            backgroundColor: "var(--bg-page)",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.push(`/solutions/${solution.id}`)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Case..." : "Create Case & Open →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
