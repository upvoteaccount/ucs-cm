"use client";

import React, { useEffect } from "react";
import { Badge, Button, Skeleton } from "@/app/components/ui";

export interface StudioShellProps {
  solution: {
    id: string;
    name: string;
    solutionPrefix: string;
    status: string;
    revision: number;
  } | null;
  activeSection: "overview" | "data" | "queues" | "forms";
  onSectionChange: (section: "overview" | "data" | "queues" | "forms") => void;
  isLoading?: boolean;
  isRevisionConflict?: boolean;
  conflictMessage?: string | null;
  onReloadSolution?: () => void;
  onReloadConflict?: () => void;
  onBackToSolutions?: () => void;
  isDirty?: boolean;
  statusAnnouncement?: string | null;
  errorState?: { title: string; message: string; code?: string } | null;
  children: React.ReactNode;
}

export function StudioShell({
  solution,
  activeSection,
  onSectionChange,
  isLoading = false,
  isRevisionConflict = false,
  conflictMessage = null,
  onReloadSolution,
  onBackToSolutions,
  isDirty = false,
  statusAnnouncement = null,
  errorState = null,
  children,
}: StudioShellProps) {
  // Document title update
  useEffect(() => {
    if (solution) {
      const sectionName =
        activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
      document.title = `${solution.name} - ${sectionName} | Design Studio`;
    } else {
      document.title = "Design Studio";
    }
  }, [solution, activeSection]);

  if (errorState) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          role="alert"
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-8)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: errorState.code === "FORBIDDEN" ? "var(--error-main)" : "var(--text-primary)",
              marginBottom: "var(--space-2)",
            }}
          >
            {errorState.title}
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-6)",
            }}
          >
            {errorState.message}
          </p>
          {onReloadSolution && (
            <Button variant="primary" onClick={onReloadSolution}>
              Retry Loading
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Accessible Live Region for Screen Readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {statusAnnouncement}
      </div>

      {/* Revision Conflict Banner */}
      {isRevisionConflict && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            color: "#92400e",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <strong>Revision Conflict: </strong>
            {conflictMessage ||
              "The Solution was modified concurrently by another process. Please reload to fetch the latest state."}
          </div>
          {onReloadSolution && (
            <Button
              variant="secondary"
              onClick={onReloadSolution}
              style={{ backgroundColor: "#ffffff", color: "#92400e", borderColor: "#f59e0b" }}
            >
              Reload Solution
            </Button>
          )}
        </div>
      )}

      {/* Studio Header (Clean, unbordered direct page layout) */}
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {isLoading || !solution ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Skeleton height="2rem" width="300px" label="Loading solution title..." />
            <Skeleton height="1.25rem" width="200px" label="Loading solution metadata..." />
          </div>
        ) : (
          <div>
            {onBackToSolutions && (
              <button
                type="button"
                onClick={onBackToSolutions}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: "var(--font-weight-medium)",
                  marginBottom: "var(--space-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                ← Back to Solutions
              </button>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--space-4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: "var(--font-size-2xl)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {solution.name}
                </h1>
                <Badge variant="neutral">{solution.solutionPrefix}</Badge>
                <Badge variant="info">{solution.status}</Badge>
                {isDirty && (
                  <Badge variant="info" style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5" }}>
                    Unsaved Edits
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <nav
          aria-label="Studio sections"
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-2)",
          }}
        >
          {(["overview", "data", "queues", "forms"] as const).map((section) => {
            const isSelected = activeSection === section;
            const label = section.charAt(0).toUpperCase() + section.slice(1);
            return (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSectionChange(section)}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: isSelected ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  color: isSelected ? "var(--action-primary)" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: isSelected ? "var(--action-secondary-bg)" : "transparent",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Body */}
      <main id="main-content" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {children}
      </main>
    </div>
  );
}
