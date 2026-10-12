"use client";

import { useState } from "react";
import { Button, Badge, Skeleton, Alert } from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export interface PropertyListProps {
  properties: any[];
  solutionPrefix?: string;
  selectedPropertyId?: string | null;
  onSelectProperty: (propertyId: string) => void;
  onCreateProperty: () => void;
  onDeleteProperty: (propertyId: string) => Promise<void>;
  isLoading?: boolean;
  isPending?: boolean;
}

export function PropertyList({
  properties,
  solutionPrefix = "PLA",
  selectedPropertyId: _selectedPropertyId,
  onSelectProperty,
  onCreateProperty,
  onDeleteProperty,
  isLoading = false,
}: PropertyListProps) {
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Skeleton height="2.5rem" width="100%" label="Loading property list header..." />
        <Skeleton height="3rem" width="100%" label="Loading property row 1..." />
        <Skeleton height="3rem" width="100%" label="Loading property row 2..." />
        <Skeleton height="3rem" width="100%" label="Loading property row 3..." />
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsPendingDelete(true);

    try {
      await onDeleteProperty(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete property.");
    } finally {
      setIsPendingDelete(false);
    }
  };

  const formatSymbolicNameDisplay = (prop: any) => {
    if (prop.generatedTechnicalName) {
      return prop.generatedTechnicalName;
    }
    const rawLocal = prop.localSymbolicName || prop.label || "";
    const cleanLocal = rawLocal
      .trim()
      .toUpperCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")
      .replace(/_+/g, "_");
    return `${solutionPrefix}_${cleanLocal}`;
  };

  const getDisplayType = (prop: any) => {
    if (prop.choiceListId) return "Choice";
    switch (prop.storedDataType) {
      case "TEXT": return "Text";
      case "NUMBER": return "Number";
      case "BOOLEAN": return "Boolean";
      case "DATE": return "Date";
      case "DATETIME": return "Date & Time";
      case "USER_REFERENCE": return "User Reference";
      default: return prop.storedDataType || "Text";
    }
  };

  const getConfigurationSummary = (prop: any) => {
    if (prop.choiceListId) {
      const choiceListName = prop.choiceList?.name || "Choice Set";
      const cardinality = prop.cardinality === "MULTIPLE" ? "Multiple selection" : "Single selection";
      return `${choiceListName} · ${cardinality}`;
    }
    const rules = prop.validationRules || {};
    if (prop.formatPreset === "EMAIL" || rules.regexPreset === "EMAIL_BASIC") {
      return "Email validation";
    }
    if (prop.formatPreset === "PHONE" || rules.regexPreset === "INDIAN_MOBILE") {
      return "Indian mobile";
    }
    if (rules.regexPreset) {
      return `Preset: ${rules.regexPreset}`;
    }
    if (rules.customRegex) {
      return "Custom pattern";
    }
    if (rules.maxLength !== undefined) {
      return `Max ${rules.maxLength} characters`;
    }
    if (rules.minLength !== undefined) {
      return `Min ${rules.minLength} characters`;
    }
    if (rules.minimumValue !== undefined || rules.maximumValue !== undefined) {
      return `Min ${rules.minimumValue ?? 0} · Max ${rules.maximumValue ?? "∞"}`;
    }
    if (rules.minimumDate || rules.maximumDate) {
      return `Min: ${rules.minimumDate || "None"} · Max: ${rules.maximumDate || "None"}`;
    }
    return "-";
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
        gap: "var(--space-4)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Data Dictionary
          </h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
            All properties used by this Solution.
          </p>
        </div>
        <Button variant="primary" onClick={onCreateProperty}>
          + Add Property
        </Button>
      </div>

      {deleteError && !deleteTarget && <Alert variant="error">{deleteError}</Alert>}

      {properties.length === 0 ? (
        <div
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            backgroundColor: "var(--bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-default)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: 0 }}>
            No properties defined yet. Click &quot;+ Add Property&quot; above to create your first property.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Property</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Type</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Configuration</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Sensitive</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", fontWeight: "var(--font-weight-semibold)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop) => (
                <tr key={prop.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{prop.label}</strong>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {formatSymbolicNameDisplay(prop)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <Badge variant="neutral">{getDisplayType(prop)}</Badge>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--text-secondary)" }}>
                    {getConfigurationSummary(prop)}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    {prop.isSensitive ? <Badge variant="info">Yes</Badge> : <span style={{ color: "var(--text-muted)" }}>-</span>}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                      <Button variant="secondary" style={{ height: "var(--control-height-sm)", padding: "0 var(--space-3)" }} onClick={() => onSelectProperty(prop.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ height: "var(--control-height-sm)", padding: "0 var(--space-3)", color: "var(--error-main)", borderColor: "var(--error-border)" }}
                        onClick={() => setDeleteTarget(prop)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Delete Property"
          itemType="Property"
          itemName={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isPending={isPendingDelete}
          error={deleteError}
        />
      )}
    </div>
  );
}
