"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button, FormField, Alert, Select } from "@/app/components/ui";
import { getCompatibleControlTypes } from "./control-compatibility";

export interface FieldInspectorHandle {
  submitSave: () => Promise<boolean>;
  discard: () => void;
}

export interface FieldInspectorProps {
  formType: "ADD_CASE" | "CASE_VIEW" | string;
  field?: any | null;
  property?: any | null;
  expectedRevision?: number;
  onFieldChange?: (fieldId: string, updates: { controlType?: string; isVisible?: boolean; isEditable?: boolean; isRequired?: boolean }) => void;
  queues?: Array<{ id: string; name: string; queueKey: string }>;
  selectedQueueId?: string | null;
  onSelectedQueueChange?: (queueId: string) => void;
  queueRules?: Array<{ fieldReferenceId: string; queueId: string; isVisible?: boolean; isEditable?: boolean; isRequired?: boolean }>;
  onQueueRuleChange?: (fieldReferenceId: string, queueId: string, updates: { isVisible?: boolean; isEditable?: boolean; isRequired?: boolean }) => void;
  onUpdateField?: (fieldReferenceId: string, payload: any) => Promise<void>;
  onOpenPropertyEditor?: (propertyId: string) => void;
  onClose?: () => void;
  isPending?: boolean;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
  isSessionExpired?: boolean;
}

export const FieldInspector = forwardRef<FieldInspectorHandle, FieldInspectorProps>(
  function FieldInspector(
    {
      formType,
      field,
      property,
      expectedRevision = 1,
      onFieldChange,
      queues = [],
      selectedQueueId,
      onSelectedQueueChange,
      queueRules = [],
      onQueueRuleChange,
      onUpdateField,
      onOpenPropertyEditor,
      onClose,
      isPending = false,
      isDirty,
      setIsDirty,
      isSessionExpired = false,
    },
    ref
  ) {
    const isAddCase = formType === "ADD_CASE";

    // Buffered local state for ADD_CASE static settings
    const [controlType, setControlType] = useState<string>(field?.controlType || "TEXT_INPUT");
    const [isVisible, setIsVisible] = useState<boolean>(field?.isVisible ?? true);
    const [isEditable, setIsEditable] = useState<boolean>(field?.isEditable ?? true);
    const [isRequired, setIsRequired] = useState<boolean>(field?.isRequired ?? false);

    // Baseline snapshot for tracking dirty state
    const [baseline, setBaseline] = useState({
      controlType: field?.controlType || "TEXT_INPUT",
      isVisible: field?.isVisible ?? true,
      isEditable: field?.isEditable ?? true,
      isRequired: field?.isRequired ?? false,
    });

    const [error, setError] = useState<string | null>(null);
    const [isConflict, setIsConflict] = useState(false);
    const [actionPending, setActionPending] = useState(false);

    // Selected queue for CASE_VIEW
    const effectiveQueueId =
      selectedQueueId && queues.some((q) => q.id === selectedQueueId)
        ? selectedQueueId
        : queues[0]?.id || null;
    const selectedQueue = queues.find((q) => q.id === effectiveQueueId) || null;
    const activeQueueRule = queueRules.find(
      (r) => r.fieldReferenceId === field?.id && r.queueId === effectiveQueueId
    );
    const queueVisible = activeQueueRule?.isVisible ?? true;
    const queueEditable = activeQueueRule?.isEditable ?? true;
    const queueRequired = activeQueueRule?.isRequired ?? false;

    // Reset buffered state only when selected field changes
    useEffect(() => {
      if (!field) return;
      const initialControl = field.controlType || "TEXT_INPUT";
      const initialVis = field.isVisible ?? true;
      const initialEdit = field.isEditable ?? true;
      const initialReq = field.isRequired ?? false;

      setControlType(initialControl);
      setIsVisible(initialVis);
      setIsEditable(initialEdit);
      setIsRequired(initialReq);
      setBaseline({
        controlType: initialControl,
        isVisible: initialVis,
        isEditable: initialEdit,
        isRequired: initialReq,
      });
      setError(null);
      setIsConflict(false);
      setIsDirty?.(false);
    }, [field?.id]);

    const isDirtyInternal = isAddCase
      ? controlType !== baseline.controlType ||
        isVisible !== baseline.isVisible ||
        isEditable !== baseline.isEditable ||
        isRequired !== baseline.isRequired
      : controlType !== baseline.controlType;
    const effectiveDirty = isDirty !== undefined ? isDirty : isDirtyInternal;

    const checkIfDirty = (newControl: string, newVis: boolean, newEdit: boolean, newReq: boolean) => {
      const isD = isAddCase
        ? newControl !== baseline.controlType ||
          newVis !== baseline.isVisible ||
          newEdit !== baseline.isEditable ||
          newReq !== baseline.isRequired
        : newControl !== baseline.controlType;
      setIsDirty?.(isD);
    };

    // Filter compatible control types
    const compatibleControls = property
      ? getCompatibleControlTypes({
          storedDataType: property.storedDataType,
          formatPreset: property.formatPreset,
          choiceListId: property.choiceListId,
          cardinality: property.cardinality,
        })
      : [field?.controlType || "TEXT_INPUT"];

    const performSave = async (): Promise<boolean> => {
      if (!field) return true;
      setError(null);
      setIsConflict(false);
      setActionPending(true);

      try {
        const payload: any = {
          controlType,
          expectedRevision,
        };
        if (isAddCase) {
          payload.isVisible = isVisible;
          payload.isEditable = isEditable;
          payload.isRequired = isRequired;
        }

        if (onUpdateField) {
          await onUpdateField(field.id, payload);
        } else if (onFieldChange) {
          onFieldChange(field.id, { controlType, isVisible, isEditable, isRequired });
        }

        setBaseline({
          controlType,
          isVisible,
          isEditable,
          isRequired,
        });
        setIsDirty?.(false);
        return true;
      } catch (err: any) {
        if (
          err?.code === "REVISION_CONFLICT" ||
          (err?.status === 409 && err?.message?.toLowerCase().includes("revision conflict"))
        ) {
          setIsConflict(true);
          setError("Revision Conflict: The Form layout was modified concurrently. Click Save to retry or Discard to reload.");
        } else {
          setError(err?.message || "Failed to update field reference.");
        }
        return false;
      } finally {
        setActionPending(false);
      }
    };

    const handleDiscard = () => {
      setControlType(baseline.controlType);
      setIsVisible(baseline.isVisible);
      setIsEditable(baseline.isEditable);
      setIsRequired(baseline.isRequired);
      setError(null);
      setIsConflict(false);
      setIsDirty?.(false);
    };

    useImperativeHandle(ref, () => ({
      submitSave: performSave,
      discard: handleDiscard,
    }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await performSave();
    };

    // Empty inspector state when no field is selected
    if (!field) {
      return (
        <div
          data-testid="field-inspector-empty"
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-default)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: "360px",
            gap: "var(--space-3)",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>⚙</div>
          <h3
            style={{
              margin: 0,
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              fontSize: "var(--font-size-base)",
            }}
          >
            No Field Selected
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-xs)",
              maxWidth: "260px",
              lineHeight: "var(--line-height-relaxed)",
            }}
          >
            Click on any field reference in the form canvas to inspect its bound property and configure control settings.
          </p>
        </div>
      );
    }

    return (
      <div
        data-testid="field-inspector"
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-5)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Field Inspector
            </h3>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: 0 }}>
              {isAddCase
                ? "Configure input control and mandatory requirement for this Add Case field."
                : "Configure presentation control for this Case View field."}
            </p>
          </div>
          {onClose && (
            <Button variant="secondary" onClick={onClose} disabled={isPending || actionPending}>
              Close
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="error" title={isConflict ? "Revision Conflict" : undefined}>
            {error}
          </Alert>
        )}

        {/* Bound Property Context Information */}
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "var(--bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: "bold" }}>
              Bound Property Context
            </span>
            {onOpenPropertyEditor && property && (
              <Button
                variant="secondary"
                onClick={() => onOpenPropertyEditor(property.id)}
                style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto" }}
              >
                Open Property Editor
              </Button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", fontSize: "var(--font-size-xs)" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Label: </span>
              <strong style={{ color: "var(--text-primary)" }}>{property?.label || "Unknown"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Symbolic Name: </span>
              <code>{property?.localSymbolicName || field.propertyId}</code>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Stored Type: </span>
              <span>{property?.storedDataType || "TEXT"}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Technical Name: </span>
              <code>{property?.generatedTechnicalName || "-"}</code>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Field Control Selection */}
          <FormField id="field-control-type" label="Control Type (Filtered by Property Compatibility)">
            {() => (
              <Select
                id="field-control-type"
                options={compatibleControls.map((ctrl: string) => ({
                  value: ctrl,
                  label: ctrl,
                }))}
                value={controlType}
                onChange={(val) => {
                  setControlType(val);
                  checkIfDirty(val, isVisible, isEditable, isRequired);
                  onFieldChange?.(field.id, { controlType: val, isVisible, isEditable, isRequired });
                }}
                disabled={isPending || actionPending || isSessionExpired}
              />
            )}
          </FormField>

          {/* Add Case Form Semantics: 3 Independent Static Settings */}
          {isAddCase && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: "bold" }}>
                Field Behaviour (Static)
              </span>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  id="field-visible-toggle"
                  checked={isVisible}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setIsVisible(nextVal);
                    checkIfDirty(controlType, nextVal, isEditable, isRequired);
                    onFieldChange?.(field.id, { controlType, isVisible: nextVal, isEditable, isRequired });
                  }}
                  disabled={isPending || actionPending || isSessionExpired}
                />
                <span>
                  <strong>Visible</strong> — Field is visible on the case creation form
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  id="field-editable-toggle"
                  checked={isEditable}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setIsEditable(nextVal);
                    checkIfDirty(controlType, isVisible, nextVal, isRequired);
                    onFieldChange?.(field.id, { controlType, isVisible, isEditable: nextVal, isRequired });
                  }}
                  disabled={isPending || actionPending || isSessionExpired}
                />
                <span>
                  <strong>Editable</strong> — Field can be edited by the user when creating a case
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  id="field-mandatory-toggle"
                  checked={isRequired}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setIsRequired(nextVal);
                    checkIfDirty(controlType, isVisible, isEditable, nextVal);
                    onFieldChange?.(field.id, { controlType, isVisible, isEditable, isRequired: nextVal });
                  }}
                  disabled={isPending || actionPending || isSessionExpired}
                />
                <span>
                  <strong>Mandatory</strong> — Field is required when creating a new case
                </span>
              </label>
            </div>
          )}

          {/* Case View Form Semantics: Queue-specific behaviour controls */}
          {!isAddCase && (
            <div
              data-testid="case-view-queue-behaviour-section"
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Queue Behaviour
              </div>

              {(!queues || queues.length === 0) ? (
                <div
                  style={{
                    padding: "var(--space-3)",
                    backgroundColor: "var(--bg-page)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-default)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-secondary)",
                  }}
                >
                  No Queues exist in this Solution. Create a Queue in the Queues tab to configure queue-specific field behaviours.
                </div>
              ) : (
                <>
                  <FormField id="inspector-queue-selector" label="Queue">
                    {() => (
                      <Select
                        id="inspector-queue-selector"
                        options={queues.map((q) => ({
                          value: q.id,
                          label: `${q.name} (${q.queueKey})`,
                        }))}
                        value={selectedQueue?.id || queues[0]?.id || ""}
                        onChange={(val) => onSelectedQueueChange?.(val)}
                        disabled={isPending || actionPending || isSessionExpired}
                      />
                    )}
                  </FormField>

                  {selectedQueue && (
                    <div
                      style={{
                        padding: "var(--space-3)",
                        backgroundColor: "var(--bg-page)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-default)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-3)",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          fontSize: "var(--font-size-sm)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          id="queue-rule-visible-toggle"
                          checked={queueVisible}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            onQueueRuleChange?.(field.id, selectedQueue.id, {
                              isVisible: nextVal,
                              isEditable: queueEditable,
                              isRequired: queueRequired,
                            });
                          }}
                          disabled={isPending || actionPending || isSessionExpired}
                        />
                        <span>
                          <strong>Visible</strong> — Field is visible in {selectedQueue.name}
                        </span>
                      </label>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          fontSize: "var(--font-size-sm)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          id="queue-rule-editable-toggle"
                          checked={queueEditable}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            onQueueRuleChange?.(field.id, selectedQueue.id, {
                              isVisible: queueVisible,
                              isEditable: nextVal,
                              isRequired: queueRequired,
                            });
                          }}
                          disabled={isPending || actionPending || isSessionExpired}
                        />
                        <span>
                          <strong>Editable</strong> — Field can be edited in {selectedQueue.name}
                        </span>
                      </label>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          fontSize: "var(--font-size-sm)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          id="queue-rule-mandatory-toggle"
                          checked={queueRequired}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            onQueueRuleChange?.(field.id, selectedQueue.id, {
                              isVisible: queueVisible,
                              isEditable: queueEditable,
                              isRequired: nextVal,
                            });
                          }}
                          disabled={isPending || actionPending || isSessionExpired}
                        />
                        <span>
                          <strong>Mandatory</strong> — Field is required in {selectedQueue.name}
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Status or Standalone Save Actions */}
          {onUpdateField ? (
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending || actionPending || isSessionExpired || !effectiveDirty}
                aria-busy={actionPending}
              >
                {actionPending ? "Saving..." : "Save Changes"}
              </Button>
              {effectiveDirty && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDiscard}
                  disabled={isPending || actionPending}
                >
                  Discard Changes
                </Button>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-secondary)",
                fontStyle: "italic",
                borderTop: "1px solid var(--border-default)",
                paddingTop: "var(--space-2)",
              }}
            >
              Inspector changes are buffered in your Form draft. Click Save Changes in the header to persist.
            </div>
          )}
        </form>
      </div>
    );
  }
);
