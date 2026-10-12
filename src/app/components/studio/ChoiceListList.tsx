"use client";

import { useState } from "react";
import { Button, Skeleton, Alert } from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export interface ChoiceListListProps {
  choiceLists: any[];
  selectedChoiceListId?: string | null;
  onSelectChoiceList: (choiceListId: string) => void;
  onCreateChoiceList: () => void;
  onDeleteChoiceList?: (choiceListId: string) => Promise<void>;
  isLoading?: boolean;
  isPending?: boolean;
}

export function ChoiceListList({
  choiceLists,
  selectedChoiceListId,
  onSelectChoiceList,
  onCreateChoiceList,
  onDeleteChoiceList,
  isLoading = false,
}: ChoiceListListProps) {
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: "1040px", margin: "0 auto", width: "100%" }}>
        <Skeleton height="2.5rem" width="100%" label="Loading choice lists header..." />
        <Skeleton height="3rem" width="100%" label="Loading choice list row 1..." />
        <Skeleton height="3rem" width="100%" label="Loading choice list row 2..." />
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !onDeleteChoiceList) return;
    setDeleteError(null);
    setIsPendingDelete(true);

    try {
      await onDeleteChoiceList(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete choice set.");
    } finally {
      setIsPendingDelete(false);
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
        gap: "var(--space-4)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Reusable Choices
          </h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: 0 }}>
            Reusable lookup catalogues for dropdown and radio selections across this Solution.
          </p>
        </div>
        <Button variant="primary" onClick={onCreateChoiceList}>
          + Add Choice Set
        </Button>
      </div>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {choiceLists.length === 0 ? (
        <div
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            backgroundColor: "var(--bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px border-dashed var(--border-default)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            No reusable choice sets created yet.
          </p>
          <Button variant="primary" onClick={onCreateChoiceList}>
            + Add Choice Set
          </Button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-default)", textAlign: "left" }}>
                <th style={{ padding: "var(--space-3)", color: "var(--text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>Name</th>
                <th style={{ padding: "var(--space-3)", color: "var(--text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>Options</th>
                <th style={{ padding: "var(--space-3)", textAlign: "right", color: "var(--text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {choiceLists.map((cl) => {
                const isSelected = selectedChoiceListId === cl.id;
                const optionCount = cl.options ? cl.options.length : 0;

                return (
                  <tr
                    key={cl.id}
                    style={{
                      borderBottom: "1px solid var(--border-default)",
                      backgroundColor: isSelected ? "var(--info-surface)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "var(--space-3)", fontWeight: "var(--font-weight-medium)", color: "var(--text-primary)" }}>
                      {cl.name}
                    </td>
                    <td style={{ padding: "var(--space-3)", color: "var(--text-secondary)" }}>
                      {optionCount} {optionCount === 1 ? "option" : "options"}
                    </td>
                    <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                        <Button variant="secondary" onClick={() => onSelectChoiceList(cl.id)}>
                          Edit
                        </Button>
                        <Button variant="secondary" onClick={() => setDeleteTarget(cl)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Delete Choice Set"
          itemName={deleteTarget.name}
          itemType="Choice Set"
          actionType="delete"
          isPending={isPendingDelete}
          error={deleteError}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
        />
      )}
    </div>
  );
}
