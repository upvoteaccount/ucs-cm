"use client";

import { useState } from "react";
import { Button, Input, FormField, Badge, Alert } from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export interface ChoiceListEditorProps {
  solutionPrefix?: string;
  choiceList: any | null;
  expectedRevision?: number;
  onSaveChoiceList?: (payload: any) => Promise<void>;
  onUpdateChoiceList?: (choiceListId: string, payload: { name?: string; description?: string | null }) => Promise<void>;
  onAddOption?: (payload: { key: string; label: string }) => Promise<void>;
  onCreateOption?: (choiceListId: string, payload: { key: string; label: string }) => Promise<void>;
  onUpdateOptionLabel?: (optionId: string, label: string) => Promise<void>;
  onDeactivateOption?: (optionId: string) => Promise<void>;
  onReactivateOption?: (optionId: string) => Promise<void>;
  onReorderOptions?: (optionIds: string[]) => Promise<void>;
  onClose?: () => void;
  onCancel?: () => void;
  isPending?: boolean;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
}

export function ChoiceListEditor({
  solutionPrefix = "PLA",
  choiceList,
  onSaveChoiceList,
  onAddOption,
  onUpdateOptionLabel,
  onDeactivateOption,
  onReactivateOption,
  onReorderOptions,
  onClose,
  onCancel,
  isPending = false,
  isDirty = false,
  setIsDirty,
}: ChoiceListEditorProps) {
  const isCreateMode = !choiceList;

  const [name, setName] = useState(choiceList?.name || "");
  const [description, setDescription] = useState(choiceList?.description || "");

  const [prevId, setPrevId] = useState(choiceList?.id || "create");
  if ((choiceList?.id || "create") !== prevId) {
    setPrevId(choiceList?.id || "create");
    setName(choiceList?.name || "");
    setDescription(choiceList?.description || "");
    setIsDirty?.(false);
  }

  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionLabel, setEditingOptionLabel] = useState("");
  const [deactivatingOption, setDeactivatingOption] = useState<any | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const options: any[] = choiceList?.options || [];

  // Compute Symbolic Name
  const normalizedName = name.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
  const computedSymbolicName = name.trim() ? `${solutionPrefix}_LIST_${normalizedName.toUpperCase()}` : `${solutionPrefix}_LIST_...`;
  const computedKey = `${solutionPrefix.toLowerCase()}_list_${normalizedName}`;

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setActionPending(true);

    try {
      if (isCreateMode) {
        await onSaveChoiceList?.({
          key: computedKey,
          name: name.trim(),
          description: description.trim() || null,
        });
      } else {
        await onSaveChoiceList?.({
          id: choiceList.id,
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      setIsDirty?.(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save choice list.");
    } finally {
      setActionPending(false);
    }
  };

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionLabel.trim()) return;

    setError(null);
    setActionPending(true);

    try {
      const rawKey = newOptionLabel.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
      const cleanKey = !rawKey || /^[0-9]/.test(rawKey) ? `opt_${rawKey || "val"}` : rawKey;

      await onAddOption?.({
        key: cleanKey,
        label: newOptionLabel.trim(),
      });
      setNewOptionLabel("");
    } catch (err: any) {
      setError(err?.message || "Failed to add choice option.");
    } finally {
      setActionPending(false);
    }
  };

  const handleSaveOptionLabel = async (optionId: string) => {
    if (!editingOptionLabel.trim()) return;

    setError(null);
    setActionPending(true);

    try {
      await onUpdateOptionLabel?.(optionId, editingOptionLabel.trim());
      setEditingOptionId(null);
    } catch (err: any) {
      setError(err?.message || "Failed to update option label.");
    } finally {
      setActionPending(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingOption) return;

    setError(null);
    setActionPending(true);

    try {
      await onDeactivateOption?.(deactivatingOption.id);
      setDeactivatingOption(null);
    } catch (err: any) {
      setError(err?.message || "Failed to deactivate choice option.");
    } finally {
      setActionPending(false);
    }
  };

  const handleMoveOption = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const reordered = [...options];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setError(null);
    setActionPending(true);

    try {
      await onReorderOptions?.(reordered.map((o) => o.id));
    } catch (err: any) {
      setError(err?.message || "Failed to reorder options.");
    } finally {
      setActionPending(false);
    }
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
        gap: "var(--space-6)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "var(--font-size-xl)", fontWeight: "bold", margin: 0 }}>
            {isCreateMode ? "Create Choice Set" : `Edit Choice Set: ${choiceList.name}`}
          </h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: 0 }}>
            Configure lookup catalogue options for dropdown and radio form fields.
          </p>
        </div>
        <Button variant="secondary" onClick={onCancel || onClose} disabled={isPending || actionPending}>
          Close Editor
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <FormField id="cl-name" label="Choice Set Name" isRequired>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={name}
                onChange={(e) => { setName(e.target.value); setIsDirty?.(true); }}
                placeholder="e.g., Existing Loans"
                disabled={isPending || actionPending}
                required
              />
            )}
          </FormField>

          <FormField id="cl-symbolic" label="Symbolic Name">
            {() => (
              <Input
                value={computedSymbolicName}
                readOnly
                disabled
                style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)", fontFamily: "var(--font-family-mono)" }}
              />
            )}
          </FormField>
        </div>

        <FormField id="cl-desc" label="Description">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setIsDirty?.(true); }}
              placeholder="e.g., Standard list of existing active customer loan accounts."
              disabled={isPending || actionPending}
            />
          )}
        </FormField>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <Button variant="secondary" type="button" onClick={onCancel || onClose} disabled={isPending || actionPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending || actionPending || (!isCreateMode && !isDirty)}>
            {isCreateMode ? "Save Choice Set" : "Save Choice Set"}
          </Button>
        </div>
      </form>

      {/* Choice Options Section */}
      {!isCreateMode && (
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <h4 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: 0 }}>
              Options ({options.length})
            </h4>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: 0 }}>
              Add, rename, reorder, or deactivate selection options for this Choice Set.
            </p>
          </div>

          {/* Add Option Input */}
          <form onSubmit={handleAddOptionSubmit} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <Input
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              placeholder="Add option (e.g. Personal Loan)"
              disabled={isPending || actionPending}
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="secondary" disabled={!newOptionLabel.trim() || isPending || actionPending}>
              + Add Option
            </Button>
          </form>

          {/* Options Table */}
          {options.length === 0 ? (
            <div style={{ padding: "var(--space-4)", backgroundColor: "var(--bg-page)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-secondary)", fontSize: "var(--font-size-sm)" }}>
              No options added yet. Type an option label above and click &quot;+ Add Option&quot;.
            </div>
          ) : (
            <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {options.map((opt, idx) => (
                <div
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: idx < options.length - 1 ? "1px solid var(--border-default)" : "none",
                    backgroundColor: opt.isActive ? "var(--bg-surface)" : "var(--bg-muted)",
                    opacity: opt.isActive ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <button
                        type="button"
                        onClick={() => handleMoveOption(idx, "up")}
                        disabled={idx === 0 || isPending || actionPending}
                        style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", padding: 0, opacity: idx === 0 ? 0.3 : 1 }}
                        aria-label={`Move ${opt.label} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOption(idx, "down")}
                        disabled={idx === options.length - 1 || isPending || actionPending}
                        style={{ border: "none", background: "none", cursor: idx === options.length - 1 ? "default" : "pointer", padding: 0, opacity: idx === options.length - 1 ? 0.3 : 1 }}
                        aria-label={`Move ${opt.label} down`}
                      >
                        ▼
                      </button>
                    </div>

                    {editingOptionId === opt.id ? (
                      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flex: 1 }}>
                        <Input
                          value={editingOptionLabel}
                          onChange={(e) => setEditingOptionLabel(e.target.value)}
                          autoFocus
                          disabled={isPending || actionPending}
                        />
                        <Button variant="primary" onClick={() => handleSaveOptionLabel(opt.id)} disabled={!editingOptionLabel.trim() || isPending || actionPending}>
                          Save
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingOptionId(null)} disabled={isPending || actionPending}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <span style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
                          {opt.label}
                        </span>
                        {!opt.isActive && <Badge variant="neutral">Deactivated</Badge>}
                      </div>
                    )}
                  </div>

                  {editingOptionId !== opt.id && (
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      {opt.isActive ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingOptionId(opt.id);
                              setEditingOptionLabel(opt.label);
                            }}
                            disabled={isPending || actionPending}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setDeactivatingOption(opt)}
                            disabled={isPending || actionPending}
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            setError(null);
                            setActionPending(true);
                            try {
                              await onReactivateOption?.(opt.id);
                            } catch (err: any) {
                              setError(err?.message || "Failed to reactivate choice option.");
                            } finally {
                              setActionPending(false);
                            }
                          }}
                          disabled={isPending || actionPending}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deactivatingOption && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Deactivate Option"
          itemName={deactivatingOption.label}
          itemType="Option"
          actionType="deactivate"
          isPending={actionPending}
          onConfirm={handleDeactivateConfirm}
          onCancel={() => setDeactivatingOption(null)}
        />
      )}
    </div>
  );
}
