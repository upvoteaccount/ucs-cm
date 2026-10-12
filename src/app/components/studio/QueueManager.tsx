"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Badge,
  Input,
  FormField,
  Label,
  Checkbox,
  Dialog,
  Skeleton,
} from "@/app/components/ui";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  apiFetchQueues,
  apiFetchQueueDetails,
  apiFetchEligibleUsers,
  apiCreateQueue,
  apiUpdateQueue,
  apiDeleteQueue,
  apiSetQueueUsers,
  SolutionQueue,
  EligibleUser,
} from "./studio-api.client";

export interface QueueManagerHandle {
  submitSave: () => Promise<boolean>;
  discard: () => void;
  selectQueue: (queueId: string) => void;
}

interface QueueManagerProps {
  solutionId: string;
  solutionRevision: number;
  onRevisionUpdate: (newRevision: number) => void;
  onApiError: (err: any) => void;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
  onSelectQueueRequest?: (queueId: string) => void;
  onQueuesUpdated?: (queues: SolutionQueue[]) => void;
}

export const QueueManager = React.forwardRef<QueueManagerHandle, QueueManagerProps>(
  function QueueManager(
    {
      solutionId,
      solutionRevision,
      onRevisionUpdate,
      onApiError,
      isDirty: _isDirty,
      setIsDirty,
      onSelectQueueRequest,
      onQueuesUpdated,
    },
    ref
  ) {
  const [queues, setQueues] = useState<SolutionQueue[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueDescription, setNewQueueDescription] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Editor Drawer state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);

  // Baseline Snapshot State
  const [baselineState, setBaselineState] = useState<{
    name: string;
    description: string;
    userIds: string[];
  }>({ name: "", description: "", userIds: [] });

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [queuesRes, usersRes] = await Promise.all([
        apiFetchQueues(solutionId),
        apiFetchEligibleUsers(solutionId),
      ]);
      setQueues(queuesRes.queues);
      setEligibleUsers(usersRes.users);
      onQueuesUpdated?.(queuesRes.queues);
    } catch (err: any) {
      onApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [solutionId]);

  const selectedQueue = queues.find((q) => q.id === selectedQueueId) || null;

  useEffect(() => {
    if (selectedQueueId) {
      apiFetchQueueDetails(solutionId, selectedQueueId)
        .then((res) => {
          const loadedName = res.queue.name;
          const loadedDesc = res.queue.description || "";
          const loadedUsers = res.assignedUsers.map((u) => u.id).sort();

          setEditName(loadedName);
          setEditDescription(loadedDesc);
          setSelectedUserIds(loadedUsers);
          setBaselineState({ name: loadedName, description: loadedDesc, userIds: loadedUsers });
          setIsDirty?.(false);
        })
        .catch((err) => onApiError(err));
    } else {
      setEditName("");
      setEditDescription("");
      setSelectedUserIds([]);
      setBaselineState({ name: "", description: "", userIds: [] });
      setIsDirty?.(false);
    }
  }, [selectedQueueId, solutionId]);

  // Compute normalized snapshots
  const computeSnapshot = (name: string, desc: string, userIds: string[]) => {
    return JSON.stringify({
      name: name.trim(),
      description: desc.trim(),
      userIds: [...userIds].sort(),
    });
  };

  const initialSnapshot = computeSnapshot(baselineState.name, baselineState.description, baselineState.userIds);
  const currentSnapshot = computeSnapshot(editName, editDescription, selectedUserIds);
  const calculatedIsDirty = selectedQueueId !== null && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    setIsDirty?.(calculatedIsDirty);
  }, [calculatedIsDirty, setIsDirty]);

  const performSave = async (): Promise<boolean> => {
    if (!selectedQueue) return true;

    try {
      setEditorSaving(true);
      let currentRev = solutionRevision;

      // Update name/description if changed
      if (editName.trim() !== baselineState.name || editDescription.trim() !== baselineState.description) {
        const updateRes = await apiUpdateQueue(solutionId, selectedQueue.id, {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          expectedRevision: currentRev,
        });
        currentRev = updateRes.solutionRevision;
      }

      // Update user assignments if changed
      const sortedCurrent = [...selectedUserIds].sort();
      if (JSON.stringify(sortedCurrent) !== JSON.stringify(baselineState.userIds)) {
        const usersRes = await apiSetQueueUsers(solutionId, selectedQueue.id, {
          userIds: sortedCurrent,
          expectedRevision: currentRev,
        });
        currentRev = usersRes.solutionRevision;
      }

      onRevisionUpdate(currentRev);
      const newBaseline = {
        name: editName.trim(),
        description: editDescription.trim(),
        userIds: sortedCurrent,
      };
      setBaselineState(newBaseline);
      setIsDirty?.(false);
      await loadData();
      return true;
    } catch (err: any) {
      onApiError(err);
      return false;
    } finally {
      setEditorSaving(false);
    }
  };

  React.useImperativeHandle(ref, () => ({
    submitSave: performSave,
    discard: () => {
      setEditName(baselineState.name);
      setEditDescription(baselineState.description);
      setSelectedUserIds([...baselineState.userIds]);
      setIsDirty?.(false);
    },
    selectQueue: (queueId: string) => {
      setSelectedQueueId(queueId);
    },
  }));

  const handleCreateQueue = async () => {
    if (!newQueueName.trim()) return;

    try {
      setCreateError(null);
      setCreateSaving(true);
      const res = await apiCreateQueue(solutionId, {
        name: newQueueName.trim(),
        description: newQueueDescription.trim() || undefined,
        expectedRevision: solutionRevision,
      });
      onRevisionUpdate(res.solutionRevision);
      setIsCreateModalOpen(false);
      setNewQueueName("");
      setNewQueueDescription("");
      await loadData();
      setSelectedQueueId(res.queue.id);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create work queue.");
    } finally {
      setCreateSaving(false);
    }
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave();
  };

  const handleDeleteQueue = async () => {
    if (!selectedQueue) return;

    try {
      setDeleteError(null);
      setDeleteSaving(true);
      const res = await apiDeleteQueue(solutionId, selectedQueue.id, solutionRevision);
      onRevisionUpdate(res.solutionRevision);
      setIsDeleteModalOpen(false);
      setSelectedQueueId(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete work queue.");
    } finally {
      setDeleteSaving(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredEligibleUsers = eligibleUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          maxWidth: "1040px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Skeleton height="2.5rem" width="100%" label="Loading work queues header..." />
        <Skeleton height="3rem" width="100%" label="Loading queue card 1..." />
        <Skeleton height="3rem" width="100%" label="Loading queue card 2..." />
      </div>
    );
  }

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
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Work Queues
          </h2>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
            Define solution work queues and assign users directly to process work items.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + Add Queue
        </Button>
      </div>

      {/* Empty State */}
      {queues.length === 0 ? (
        <div
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            backgroundColor: "var(--bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-default)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <strong style={{ fontSize: "var(--font-size-base)", color: "var(--text-primary)" }}>
            No Work Queues Created
          </strong>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: 0, maxWidth: "420px" }}>
            Create work queues to organize human task routing and assign team members.
          </p>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + Add Queue
          </Button>
        </div>
      ) : (
        /* Main Grid: Left Queue List, Right Editor Panel */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--space-6)" }}>
          {/* Left Column: Queue List Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {queues.map((q) => {
              const isSelected = q.id === selectedQueueId;
              return (
                <div
                  key={q.id}
                  onClick={() => {
                    if (q.id === selectedQueueId) return;
                    if (onSelectQueueRequest) {
                      onSelectQueueRequest(q.id);
                    } else {
                      setSelectedQueueId(q.id);
                    }
                  }}
                  style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${isSelected ? "var(--primary-main)" : "var(--border-default)"}`,
                    backgroundColor: isSelected ? "var(--primary-surface)" : "var(--bg-card)",
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
                        {q.name}
                      </strong>
                      <div style={{ marginTop: "var(--space-1)" }}>
                        <Badge variant="neutral" style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)" }}>
                          {q.queueKey}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="info">
                      {q.assignedUserCount} user{q.assignedUserCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {q.description && (
                    <p
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-secondary)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {q.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Queue Editor Panel */}
          <div>
            {selectedQueue ? (
              <div
                style={{
                  backgroundColor: "var(--bg-page)",
                  padding: "var(--space-6)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: "var(--space-3)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "var(--font-size-base)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      Queue Details
                    </h3>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                      Key: <code style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{selectedQueue.queueKey}</code>
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => setIsDeleteModalOpen(true)} style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}>
                    Delete Queue
                  </Button>
                </div>

                <form onSubmit={handleSaveEditor} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <FormField id="queue-edit-name" label="Queue Name" isRequired>
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    )}
                  </FormField>

                  <FormField id="queue-edit-key" label="Generated Queue Key (Read-Only)" helperText="Auto-generated from Queue Name for system routing and identity.">
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        value={selectedQueue.queueKey}
                        disabled
                        style={{ backgroundColor: "var(--bg-page)", fontFamily: "monospace", color: "var(--text-muted)" }}
                      />
                    )}
                  </FormField>

                  <FormField id="queue-edit-description" label="Description">
                    {({ isInvalid, ...validProps }) => (
                      <textarea
                        {...validProps}
                        aria-invalid={isInvalid ? "true" : undefined}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "var(--space-2) var(--space-3)",
                          fontSize: "var(--font-size-sm)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-default)",
                          backgroundColor: "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    )}
                  </FormField>

                  {/* Assigned Users Section */}
                  <div style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-default)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                      <Label>Assigned Users ({selectedUserIds.length})</Label>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                        Select users to assign access
                      </span>
                    </div>

                    <Input
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      style={{ marginBottom: "var(--space-3)" }}
                    />

                    <div
                      style={{
                        maxHeight: "220px",
                        overflowY: "auto",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-card)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {filteredEligibleUsers.length === 0 ? (
                        <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          No active organisation users found matching search query.
                        </div>
                      ) : (
                        filteredEligibleUsers.map((u) => {
                          const isChecked = selectedUserIds.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              style={{
                                padding: "var(--space-2) var(--space-3)",
                                borderBottom: "1px solid var(--border-default)",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Checkbox
                                id={`user-check-${u.id}`}
                                checked={isChecked}
                                onChange={() => toggleUserSelection(u.id)}
                                label={
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
                                      {u.fullName}
                                    </strong>
                                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                                      {u.email}
                                    </span>
                                  </div>
                                }
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--space-2)" }}>
                    <Button variant="primary" type="submit" disabled={editorSaving}>
                      {editorSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--bg-page)",
                  padding: "var(--space-8)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border-default)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Select a Queue from the left to view and edit details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Queue Dialog */}
      <Dialog
        isOpen={isCreateModalOpen}
        title="Add Work Queue"
        confirmLabel="Create Queue"
        cancelLabel="Cancel"
        onConfirm={handleCreateQueue}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setNewQueueName("");
          setNewQueueDescription("");
          setCreateError(null);
        }}
        isPending={createSaving}
        error={createError}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <FormField id="queue-new-name" label="Queue Name" isRequired>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="e.g. SOL Maker"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                required
              />
            )}
          </FormField>

          <FormField id="queue-new-description" label="Description">
            {({ isInvalid, ...validProps }) => (
              <textarea
                {...validProps}
                aria-invalid={isInvalid ? "true" : undefined}
                placeholder="Optional description of work queue purpose..."
                value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-sm)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            )}
          </FormField>
        </div>
      </Dialog>

      {/* Delete Queue Confirm Modal */}
      {selectedQueue && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          title="Delete Work Queue"
          itemName={selectedQueue.name}
          itemType="Property" // Reusing Dialog wording
          actionType="delete"
          onConfirm={handleDeleteQueue}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }}
          isPending={deleteSaving}
          error={deleteError}
        />
      )}
    </div>
  );
});
