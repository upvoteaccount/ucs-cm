"use client";

import React, { useState } from "react";
import { Button, Input, FormField, Alert, Dialog } from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export interface TabControlsProps {
  tabs: any[];
  activeTabId: string | null;
  expectedRevision?: number;
  onSelectTab: (tabId: string) => void;
  onCreateTab: (title: string) => Promise<void>;
  onUpdateTabTitle: (tabId: string, title: string) => Promise<void>;
  onDeleteTab: (tabId: string) => Promise<void>;
  onReorderTabs: (tabIds: string[]) => Promise<void>;
  isPending?: boolean;
}

export function TabControls({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onUpdateTabTitle,
  onDeleteTab,
  onReorderTabs,
  isPending = false,
}: TabControlsProps) {
  // Add Tab state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Rename Tab state
  const [editingTab, setEditingTab] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Delete Tab state
  const [deletingTab, setDeletingTab] = useState<any | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    setActionPending(true);

    try {
      await onCreateTab(newTitle.trim());
      setIsAddModalOpen(false);
      setNewTitle("");
    } catch (err: any) {
      setError(err?.message || "Failed to create tab.");
    } finally {
      setActionPending(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTab || !editTitle.trim()) return;
    setError(null);
    setActionPending(true);

    try {
      await onUpdateTabTitle(editingTab.id, editTitle.trim());
      setEditingTab(null);
    } catch (err: any) {
      setError(err?.message || "Failed to rename tab.");
    } finally {
      setActionPending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTab) return;
    setError(null);
    setActionPending(true);

    try {
      await onDeleteTab(deletingTab.id);
      setDeletingTab(null);
    } catch (err: any) {
      setError(err?.message || "Failed to delete tab.");
    } finally {
      setActionPending(false);
    }
  };

  const handleMoveTab = async (index: number, direction: "left" | "right") => {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tabs.length) return;

    const newTabs = [...tabs];
    const temp = newTabs[index];
    newTabs[index] = newTabs[newIndex];
    newTabs[newIndex] = temp;

    const tabIds = newTabs.map((t) => t.id);

    setError(null);
    setActionPending(true);

    try {
      await onReorderTabs(tabIds);
    } catch (err: any) {
      setError(err?.message || "Failed to reorder tabs.");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        backgroundColor: "var(--bg-surface)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
        {/* Tab Strip */}
        <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-1)" }}>
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  backgroundColor: isActive ? "var(--action-secondary-bg)" : "transparent",
                  border: `1px solid ${isActive ? "var(--action-primary)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-1) var(--space-2)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: isActive ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                    color: isActive ? "var(--action-primary)" : "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {tab.title}
                </button>

                {/* Move & Action Controls */}
                <button
                  type="button"
                  onClick={() => handleMoveTab(idx, "left")}
                  disabled={idx === 0 || isPending || actionPending}
                  aria-label={`Move tab ${tab.title} left`}
                  style={{ border: "none", background: "none", cursor: "pointer", opacity: idx === 0 ? 0.3 : 1, fontSize: "0.75rem" }}
                >
                  &larr;
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveTab(idx, "right")}
                  disabled={idx === tabs.length - 1 || isPending || actionPending}
                  aria-label={`Move tab ${tab.title} right`}
                  style={{ border: "none", background: "none", cursor: "pointer", opacity: idx === tabs.length - 1 ? 0.3 : 1, fontSize: "0.75rem" }}
                >
                  &rarr;
                </button>

                <button
                  type="button"
                  onClick={() => { setEditingTab(tab); setEditTitle(tab.title); }}
                  aria-label={`Rename tab ${tab.title}`}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-secondary)" }}
                >
                  &edit;
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingTab(tab)}
                  aria-label={`Delete tab ${tab.title}`}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--error-main)" }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} disabled={isPending || actionPending}>
          + Add Tab
        </Button>
      </div>

      {error && !deletingTab && <Alert variant="error">{error}</Alert>}

      {/* Add Tab Modal */}
      {isAddModalOpen && (
        <Dialog
          isOpen={true}
          title="Add Form Tab"
          onCancel={() => { setIsAddModalOpen(false); setError(null); }}
          cancelLabel="Cancel"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <FormField id="new-tab-title" label="Tab Title" isRequired>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Additional Details"
                  disabled={actionPending}
                  required
                />
              )}
            </FormField>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={actionPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={actionPending || !newTitle.trim()} aria-busy={actionPending}>
                {actionPending ? "Adding..." : "Add Tab"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Rename Tab Modal */}
      {editingTab && (
        <Dialog
          isOpen={true}
          title={`Rename Tab: ${editingTab.title}`}
          onCancel={() => { setEditingTab(null); setError(null); }}
          cancelLabel="Cancel"
        >
          <form onSubmit={handleRenameSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <FormField id="edit-tab-title" label="New Tab Title" isRequired>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={actionPending}
                  required
                />
              )}
            </FormField>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <Button type="button" variant="secondary" onClick={() => setEditingTab(null)} disabled={actionPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={actionPending || !editTitle.trim()} aria-busy={actionPending}>
                {actionPending ? "Saving..." : "Save Title"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Tab Confirmation Modal */}
      {deletingTab && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Delete Form Tab"
          itemName={deletingTab.title}
          itemType="Tab"
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeletingTab(null); setError(null); }}
          isPending={actionPending}
          error={error}
        />
      )}
    </div>
  );
}
