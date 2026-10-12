"use client";

import { Dialog } from "@/app/components/ui";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType: "Property" | "Tab" | "Section" | "Field" | "Option" | "Choice Set";
  actionType?: "delete" | "remove" | "deactivate";
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  itemName,
  itemType,
  actionType = "delete",
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: ConfirmDeleteModalProps) {
  const verb = actionType === "deactivate" ? "deactivate" : actionType === "remove" ? "remove" : "delete";
  const verbCapitalized = verb.charAt(0).toUpperCase() + verb.slice(1);

  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      description={`Are you sure you want to ${verb} the ${itemType.toLowerCase()} "${itemName}"? This action cannot be undone.`}
      confirmLabel={`${verbCapitalized} ${itemType}`}
      cancelLabel="Cancel"
      isDestructive={true}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isPending={isPending}
      error={error}
    />
  );
}
