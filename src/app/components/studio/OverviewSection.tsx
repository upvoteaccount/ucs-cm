"use client";

import { useState } from "react";
import { Button, Input, FormField, Skeleton, Alert } from "@/app/components/ui";

export interface OverviewSectionProps {
  solution: {
    id: string;
    name: string;
    description: string | null;
    solutionPrefix: string;
    status: string;
    revision: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  } | null;
  isLoading?: boolean;
  onSaveSolution: (payload: { name: string; description: string | null; expectedRevision: number }) => Promise<void>;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  onReloadSolution?: () => void;
}

export function OverviewSection({
  solution,
  isLoading = false,
  onSaveSolution,
  isDirty,
  setIsDirty,
  onReloadSolution,
}: OverviewSectionProps) {
  const [name, setName] = useState(solution?.name || "");
  const [description, setDescription] = useState(solution?.description || "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [prevSolutionId, setPrevSolutionId] = useState(solution?.id);
  if (solution && solution.id !== prevSolutionId) {
    setPrevSolutionId(solution.id);
    setName(solution.name);
    setDescription(solution.description || "");
  }

  if (isLoading || !solution) {
    return (
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <Skeleton height="1.5rem" width="200px" label="Loading overview title..." />
        <Skeleton height="2.5rem" width="100%" label="Loading name input..." />
        <Skeleton height="4rem" width="100%" label="Loading description input..." />
        <Skeleton height="2rem" width="150px" label="Loading button..." />
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsDirty(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictError(null);
    setIsPending(true);

    try {
      await onSaveSolution({
        name: name.trim(),
        description: description.trim() || null,
        expectedRevision: solution.revision,
      });
      setIsDirty(false);
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "REVISION_CONFLICT") {
        setConflictError(err.message || "The Solution was modified concurrently by another process.");
      } else {
        setError(err?.message || "Failed to update Solution overview.");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleDiscard = () => {
    setName(solution.name);
    setDescription(solution.description || "");
    setError(null);
    setConflictError(null);
    setIsDirty(false);
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
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Solution Overview
        </h2>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
          Manage canonical identity and metadata for this Solution.
        </p>
      </div>

      {conflictError && (
        <Alert variant="error" title="Revision Conflict (HTTP 409)">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span>{conflictError}</span>
            {onReloadSolution && (
              <Button
                type="button"
                variant="secondary"
                onClick={onReloadSolution}
                style={{ width: "fit-content" }}
              >
                Reload Solution
              </Button>
            )}
          </div>
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <FormField id="overview-name" label="Solution Name" isRequired>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={name}
              onChange={handleNameChange}
              disabled={isPending}
              required
            />
          )}
        </FormField>

        <FormField id="overview-description" label="Solution Description">
          {({ isInvalid, ...validProps }) => (
            <textarea
              {...validProps}
              aria-invalid={isInvalid ? "true" : undefined}
              value={description}
              onChange={handleDescriptionChange}
              disabled={isPending}
              rows={3}
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--font-size-sm)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${isInvalid ? "var(--error-main)" : "var(--border-default)"}`,
                fontFamily: "inherit",
              }}
            />
          )}
        </FormField>

        <FormField id="overview-prefix" label="Solution Prefix (Server-Owned & Immutable)">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={solution.solutionPrefix}
              disabled={true}
              style={{ backgroundColor: "var(--action-secondary-bg)" }}
            />
          )}
        </FormField>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            backgroundColor: "var(--bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
              Status
            </span>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
              {solution.status}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
              Revision
            </span>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
              r{solution.revision}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
              Created At
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
              {new Date(solution.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
              Last Updated At
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
              {new Date(solution.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !isDirty}
            aria-busy={isPending}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {isDirty && (
            <Button type="button" variant="secondary" onClick={handleDiscard} disabled={isPending}>
              Discard Changes
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
