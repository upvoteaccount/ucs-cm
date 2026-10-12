"use client";

import { Dialog, Button } from "@/app/components/ui";

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isPending = false,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      title="Unsaved Changes"
      description="You have unsaved changes in the editor. Would you like to save your changes or discard them before proceeding?"
      onCancel={onCancel}
      hideFooter={true}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-3)",
          marginTop: "var(--space-2)",
        }}
      >
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isPending}
        >
          Keep Editing
        </Button>
        <Button
          variant="secondary"
          onClick={onDiscard}
          disabled={isPending}
          style={{ color: "var(--error-main)", borderColor: "var(--error-border)" }}
        >
          Discard Changes
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Dialog>
  );
}
