"use client";

import { Button, Badge } from "@/app/components/ui";

export interface FieldCardProps {
  field: any;
  property: any | null;
  formType?: string;
  effectiveBehaviour?: { isVisible: boolean; isEditable: boolean; isRequired: boolean } | null;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveSection: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  isPending?: boolean;
}

export function FieldCard({
  field,
  property,
  formType = "ADD_CASE",
  effectiveBehaviour,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onMoveSection,
  onRemove,
  isFirst,
  isLast,
  isPending = false,
}: FieldCardProps) {
  const label = property?.label || `Property ${field.propertyId.slice(0, 8)}`;
  const symbolicName = property?.localSymbolicName || field.propertyId;
  const technicalName = property?.generatedTechnicalName || "-";

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: isSelected ? "var(--info-surface)" : "var(--bg-surface)",
        border: `1px solid ${isSelected ? "var(--info-main)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--space-3)",
        cursor: "pointer",
        transition: "all 150ms ease",
        boxShadow: isSelected ? "0 0 0 2px var(--focus-ring)" : "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
            {label}
          </strong>
          <code style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
            ({symbolicName})
          </code>
          <Badge variant="neutral" style={{ fontSize: "var(--font-size-xs)" }}>
            {field.controlType}
          </Badge>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            Tech: <code>{technicalName}</code>
          </span>
          {formType === "ADD_CASE" && field.isVisible === false && (
            <Badge variant="neutral" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}>
              Hidden
            </Badge>
          )}
          {formType === "ADD_CASE" && field.isEditable === false && (
            <Badge variant="neutral" style={{ backgroundColor: "#fefce8", color: "#854d0e", borderColor: "#fef08a" }}>
              Read-only
            </Badge>
          )}
          {formType === "ADD_CASE" && field.isRequired === true && (
            <Badge variant="info" style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5" }}>
              Required
            </Badge>
          )}

          {formType === "CASE_VIEW" && effectiveBehaviour?.isVisible === false && (
            <Badge variant="neutral" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}>
              Hidden
            </Badge>
          )}
          {formType === "CASE_VIEW" && effectiveBehaviour?.isEditable === false && (
            <Badge variant="neutral" style={{ backgroundColor: "#fefce8", color: "#854d0e", borderColor: "#fef08a" }}>
              Read-only
            </Badge>
          )}
          {formType === "CASE_VIEW" && effectiveBehaviour?.isRequired === true && (
            <Badge variant="info" style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5" }}>
              Required
            </Badge>
          )}
        </div>
      </div>

      <div
        style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          onClick={onMoveUp}
          disabled={isFirst || isPending}
          aria-label={`Move field ${label} up`}
          style={{ padding: "0 var(--space-2)", height: "1.75rem", fontSize: "var(--font-size-xs)" }}
        >
          &uarr;
        </Button>
        <Button
          variant="secondary"
          onClick={onMoveDown}
          disabled={isLast || isPending}
          aria-label={`Move field ${label} down`}
          style={{ padding: "0 var(--space-2)", height: "1.75rem", fontSize: "var(--font-size-xs)" }}
        >
          &darr;
        </Button>
        <Button
          variant="secondary"
          onClick={onMoveSection}
          disabled={isPending}
          aria-label={`Move field ${label} to another section`}
          style={{ padding: "0 var(--space-2)", height: "1.75rem", fontSize: "var(--font-size-xs)" }}
        >
          Move Section
        </Button>
        <Button
          variant="secondary"
          onClick={onRemove}
          disabled={isPending}
          aria-label={`Remove field ${label} from form`}
          style={{ padding: "0 var(--space-2)", height: "1.75rem", fontSize: "var(--font-size-xs)", color: "var(--error-main)" }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
