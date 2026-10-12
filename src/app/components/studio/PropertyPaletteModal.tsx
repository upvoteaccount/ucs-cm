"use client";

import { useState } from "react";
import { Dialog, Button, FormField, Select, SelectOption } from "@/app/components/ui";

export interface PropertyPaletteModalProps {
  isOpen: boolean;
  sectionTitle: string;
  properties: any[];
  usedPropertyIds: Set<string>;
  onAddPropertyField: (propertyId: string) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

export function PropertyPaletteModal({
  isOpen,
  sectionTitle,
  properties,
  usedPropertyIds,
  onAddPropertyField,
  onCancel,
  isPending = false,
}: PropertyPaletteModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unusedProperties = properties.filter((p) => !usedPropertyIds.has(p.id));

  const propertyOptions: SelectOption[] = unusedProperties.map((prop) => ({
    value: prop.id,
    label: `${prop.label} (${prop.localSymbolicName})`,
  }));

  const handleAdd = async () => {
    if (!selectedPropertyId) return;
    setError(null);
    setActionPending(true);

    try {
      await onAddPropertyField(selectedPropertyId);
      setSelectedPropertyId("");
    } catch (err: any) {
      setError(err?.message || "Failed to add field to section.");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title={`Add Property Field to "${sectionTitle}"`}
      description="Select an existing Property from the Solution Data Dictionary to add as a form field reference."
      onCancel={onCancel}
      hideFooter={true}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {error && (
          <div style={{ color: "var(--error-main)", fontSize: "var(--font-size-sm)" }}>
            {error}
          </div>
        )}

        {unusedProperties.length === 0 ? (
          <div
            style={{
              padding: "var(--space-6)",
              backgroundColor: "var(--bg-page)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
            }}
          >
            All properties created for this Solution are already referenced on the form. Create a new Property in the Data tab first.
          </div>
        ) : (
          <FormField id="palette-prop-select" label="Available Properties" isRequired>
            {() => (
              <Select
                id="palette-prop-select"
                options={propertyOptions}
                value={selectedPropertyId}
                onChange={(val) => setSelectedPropertyId(val)}
                placeholder="Select a property to add..."
                disabled={isPending || actionPending}
              />
            )}
          </FormField>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending || actionPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAdd}
            disabled={isPending || actionPending || !selectedPropertyId || unusedProperties.length === 0}
            aria-busy={actionPending}
          >
            {actionPending ? "Adding..." : "Add Field to Form"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
