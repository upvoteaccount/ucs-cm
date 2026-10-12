"use client";

import React, { useState } from "react";
import { Button, Input, FormField, Alert, Dialog, Select } from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export interface SectionControlsProps {
  section: any;
  allTabs: any[];
  currentTabId: string | null;
  expectedRevision?: number;
  onUpdateSectionTitle: (sectionId: string, title: string) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onMoveSectionToTab: (sectionId: string, targetTabId: string) => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isPending?: boolean;
  children?: React.ReactNode;
}

export function SectionControls({
  section,
  allTabs,
  currentTabId,
  onUpdateSectionTitle,
  onDeleteSection,
  onMoveSectionToTab,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  isPending = false,
  children,
}: SectionControlsProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(section.title || "");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetTabId, setTargetTabId] = useState<string>(allTabs[0]?.id || "");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const handleTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setActionPending(true);

    try {
      await onUpdateSectionTitle(section.id, title.trim());
      setIsEditingTitle(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update section title.");
    } finally {
      setActionPending(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTabId || targetTabId === currentTabId) return;

    setError(null);
    setActionPending(true);

    try {
      await onMoveSectionToTab(section.id, targetTabId);
      setIsMoveModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to move section.");
    } finally {
      setActionPending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setError(null);
    setActionPending(true);

    try {
      await onDeleteSection(section.id);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to delete section.");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-page)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-default)",
          paddingBottom: "var(--space-3)",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending || actionPending}
                required
                style={{ height: "var(--control-height-sm)", fontSize: "var(--font-size-sm)" }}
              />
              <Button type="submit" variant="primary" disabled={isPending || actionPending}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsEditingTitle(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <h4 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
                {section.title}
              </h4>
              <Button
                variant="secondary"
                onClick={() => setIsEditingTitle(true)}
                disabled={isPending || actionPending}
                style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto" }}
              >
                Rename
              </Button>
            </>
          )}
        </div>

        {/* Section Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {onMoveUp && (
            <Button
              variant="secondary"
              onClick={onMoveUp}
              disabled={isFirst || isPending || actionPending}
              style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto" }}
            >
              ↑ Move Up
            </Button>
          )}

          {onMoveDown && (
            <Button
              variant="secondary"
              onClick={onMoveDown}
              disabled={isLast || isPending || actionPending}
              style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto" }}
            >
              ↓ Move Down
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setIsMoveModalOpen(true)}
            disabled={isPending || actionPending || allTabs.length <= 1}
            style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto" }}
          >
            Move to Tab
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isPending || actionPending}
            style={{ fontSize: "var(--font-size-xs)", padding: "2px 8px", height: "auto", color: "var(--error-main)" }}
          >
            Delete Section
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Children (Field References inside Section) */}
      {children}

      {/* Move Section Modal */}
      {isMoveModalOpen && (
        <Dialog
          isOpen={true}
          title={`Move Section "${section.title}"`}
          onCancel={() => setIsMoveModalOpen(false)}
          cancelLabel="Cancel"
        >
          <form onSubmit={handleMoveSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <FormField id="target-tab-select" label="Select Target Tab">
              {() => (
                <Select
                  id="target-tab-select"
                  options={allTabs.map((t) => ({
                    value: t.id,
                    label: t.id === currentTabId ? `${t.title} (Current Tab)` : t.title,
                    disabled: t.id === currentTabId,
                  }))}
                  value={targetTabId || ""}
                  onChange={(val) => setTargetTabId(val)}
                  disabled={actionPending}
                />
              )}
            </FormField>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button type="submit" variant="primary" disabled={actionPending || !targetTabId || targetTabId === currentTabId}>
                Move Section
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsMoveModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Confirm Delete Section Modal */}
      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Delete Form Section"
          itemName={section.title}
          itemType="Section"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setIsDeleteModalOpen(false)}
          isPending={actionPending}
          error={error}
        />
      )}
    </div>
  );
}
