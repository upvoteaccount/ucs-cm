"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, FormField, Badge, Skeleton, Alert, Dialog } from "@/app/components/ui";
import { apiFetchSolutions, apiCreateSolutionMain, StudioApiError } from "./studio-api.client";

export function SolutionsListContainer() {
  const router = useRouter();
  const [solutions, setSolutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ title: string; message: string; code?: string } | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Navigation confirm modal state for dirty Create draft
  const [showNavConfirmModal, setShowNavConfirmModal] = useState(false);

  // View Mode: Cards (default) vs List with lazy sessionStorage initializer
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("ucs_studio_solutions_view_mode");
        if (saved === "cards" || saved === "list") return saved;
      } catch {
        // Ignore storage restrictions
      }
    }
    return "cards";
  });

  const handleViewModeChange = (mode: "cards" | "list") => {
    setViewMode(mode);
    try {
      sessionStorage.setItem("ucs_studio_solutions_view_mode", mode);
    } catch {
      // Ignore storage restrictions
    }
  };

  // Create Solution Modal State & Refs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [isPrefixUserModified, setIsPrefixUserModified] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const createTriggerBtnRef = useRef<HTMLButtonElement | null>(null);

  const loadSolutions = useCallback(async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      const res = await apiFetchSolutions();
      setSolutions(res.solutions || []);
      setStatusAnnouncement("Solutions list loaded successfully.");
    } catch (err: any) {
      if (err instanceof StudioApiError) {
        if (err.status === 401) {
          setErrorState({
            title: "Session Expired (HTTP 401)",
            message: "Your session has expired. Please log in again to continue.",
            code: "UNAUTHENTICATED",
          });
        } else if (err.status === 403) {
          setErrorState({
            title: "Access Forbidden (HTTP 403)",
            message: "You do not have permission to access Design Studio solutions.",
            code: "FORBIDDEN",
          });
        } else {
          setErrorState({
            title: "Error Loading Solutions",
            message: err.message || "Failed to load Solutions list.",
            code: "SERVER_ERROR",
          });
        }
      } else {
        setErrorState({
          title: "Unexpected Error",
          message: err?.message || "An unexpected error occurred while loading Solutions.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await loadSolutions();
      }
    };
    void init();
    return () => {
      ignore = true;
    };
  }, [loadSolutions]);

  // Prefix Auto-Suggestion from Name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);

    if (!isPrefixUserModified) {
      const words = val.trim().split(/\s+/).filter(Boolean);
      let suggested = "";
      if (words.length >= 2) {
        suggested = words.map((w) => w[0]).join("").toUpperCase();
      } else if (words.length === 1) {
        suggested = words[0].slice(0, 3).toUpperCase();
      }
      suggested = suggested.replace(/[^A-Z0-9]/g, "");
      setPrefix(suggested);
    }
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value.toUpperCase());
    setIsPrefixUserModified(true);
  };

  const handleCancelCreate = () => {
    setIsCreateModalOpen(false);
    setName("");
    setDescription("");
    setPrefix("");
    setIsPrefixUserModified(false);
    setCreateError(null);
    setCreatePending(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreateError(null);
    setCreatePending(true);

    try {
      const cleanPrefix = prefix.trim().toUpperCase();
      const res = await apiCreateSolutionMain({
        name: name.trim(),
        description: description.trim() || null,
        prefix: cleanPrefix || undefined,
        solutionPrefix: cleanPrefix || undefined,
      });

      setStatusAnnouncement("Solution created successfully.");
      handleCancelCreate();

      if (res.solution?.id) {
        router.push(`/studio/solutions/${res.solution.id}`);
      } else {
        await loadSolutions();
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "DUPLICATE_PREFIX" || err?.code === "CONFLICT") {
        setCreateError(err.message || `Prefix "${prefix.trim().toUpperCase()}" is already in use by another Solution in your organization.`);
      } else {
        setCreateError(err?.message || "Failed to create Solution.");
      }
    } finally {
      setCreatePending(false);
    }
  };

  // Filter Solutions based on Search Query across Name, Prefix, and Description
  const filteredSolutions = solutions.filter((sol) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (sol.name || "").toLowerCase().includes(q);
    const prefixMatch = (sol.solutionPrefix || sol.prefix || "").toLowerCase().includes(q);
    const descMatch = (sol.description || "").toLowerCase().includes(q);
    return nameMatch || prefixMatch || descMatch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      {/* Live Status Region */}
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

      {/* Page Header (Clean, unbordered direct page layout) */}
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <Link
            href="/landing"
            onClick={(e) => {
              if (isCreateModalOpen && (name.trim() || description.trim() || prefix.trim())) {
                e.preventDefault();
                setShowNavConfirmModal(true);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: "var(--font-weight-medium)",
              marginBottom: "var(--space-2)",
            }}
          >
            ← Back to Workspaces
          </Link>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <div>
              <h1
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Design Studio Solutions
              </h1>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                Manage and configure your Solutions.
              </p>
            </div>

            <Button
              ref={createTriggerBtnRef}
              variant="primary"
              onClick={() => {
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              disabled={isLoading || Boolean(errorState)}
              style={{ width: "fit-content", whiteSpace: "nowrap" }}
            >
              + Create Solution
            </Button>
          </div>
        </div>

        {/* Search & View Mode Toolbar */}
        {!isLoading && !errorState && solutions.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap", paddingTop: "var(--space-2)" }}>
            {/* Search Input Field */}
            <div style={{ display: "flex", alignItems: "center", flex: "1", maxWidth: "420px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Input
                  type="text"
                  aria-label="Search solutions"
                  placeholder="Search solutions by name, prefix, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: searchQuery ? "var(--space-8)" : "var(--space-3)" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "var(--space-2)",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                      padding: "var(--space-1)",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Cards / List View Control */}
            <div
              role="group"
              aria-label="Solution view mode"
              style={{
                display: "inline-flex",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                backgroundColor: "var(--bg-surface)",
                padding: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleViewModeChange("cards")}
                aria-pressed={viewMode === "cards"}
                style={{
                  padding: "4px var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: viewMode === "cards" ? "var(--action-primary)" : "transparent",
                  color: viewMode === "cards" ? "var(--action-primary-text)" : "var(--text-secondary)",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                aria-pressed={viewMode === "list"}
                style={{
                  padding: "4px var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: viewMode === "list" ? "var(--action-primary)" : "transparent",
                  color: viewMode === "list" ? "var(--action-primary-text)" : "var(--text-secondary)",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                List
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Error Alert Display */}
      {errorState && (
        <Alert variant="error" title={errorState.title}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span>{errorState.message}</span>
            {errorState.code === "UNAUTHENTICATED" && (
              <a href="/login" style={{ textDecoration: "none" }}>
                <Button variant="primary" style={{ height: "var(--control-height-sm)", width: "fit-content" }}>
                  Log In / Re-authenticate
                </Button>
              </a>
            )}
          </div>
        </Alert>
      )}

      {/* Initial Loading Skeletons */}
      {isLoading && !errorState && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              style={{
                backgroundColor: "var(--bg-surface)",
                padding: "var(--space-5)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <Skeleton height="1.5rem" width="220px" label="Loading Solution title..." />
              <Skeleton height="1rem" width="140px" label="Loading Solution prefix..." />
              <Skeleton height="3rem" width="100%" label="Loading Solution description..." />
              <Skeleton height="2.25rem" width="120px" label="Loading action button..." />
            </div>
          ))}
        </div>
      )}

      {/* True Empty State (0 Solutions in Org) */}
      {!isLoading && !errorState && solutions.length === 0 && (
        <div
          style={{
            padding: "var(--space-12) var(--space-4)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            maxWidth: "480px",
            width: "100%",
          }}
        >
          {/* Subtle solution/document-style icon */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-full, 50%)",
              backgroundColor: "var(--bg-subtle, #f3f4f6)",
              color: "var(--text-muted, #6b7280)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-4)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>

          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--text-primary)",
              margin: "0 0 var(--space-2) 0",
            }}
          >
            No Solutions yet
          </h2>

          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              margin: "0 0 var(--space-6) 0",
              lineHeight: 1.5,
              maxWidth: "400px",
            }}
          >
            Create your first Solution to begin configuring properties, reusable choices, and forms.
          </p>

          <Button
            variant="primary"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            disabled={isLoading || Boolean(errorState)}
          >
            + Create Solution
          </Button>
        </div>
      )}

      {/* Search No Matches State */}
      {!isLoading && !errorState && solutions.length > 0 && filteredSolutions.length === 0 && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-8)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
            margin: "var(--space-4) auto",
            maxWidth: "520px",
            width: "100%",
          }}
        >
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
            No Solutions match your search.
          </h2>
          <Button variant="secondary" onClick={() => setSearchQuery("")} style={{ height: "var(--control-height-sm)" }}>
            Clear Search
          </Button>
        </div>
      )}

      {/* CARDS VIEW */}
      {!isLoading && !errorState && filteredSolutions.length > 0 && viewMode === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "var(--space-5)",
          }}
        >
          {filteredSolutions.map((sol) => (
            <div
              key={sol.id}
              data-testid={`solution-card-${sol.id}`}
              style={{
                backgroundColor: "var(--bg-surface)",
                padding: "var(--space-5)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-subtle)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                minHeight: "200px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="neutral">{sol.solutionPrefix || sol.prefix || "CSM"}</Badge>
                  <Badge variant="info">{sol.status}</Badge>
                </div>

                <h3
                  style={{
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--text-primary)",
                    margin: "var(--space-1) 0 0 0",
                  }}
                >
                  {sol.name}
                </h3>

                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {sol.description || "No description provided."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "var(--space-3)",
                  borderTop: "1px solid var(--border-default)",
                }}
              >
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                  Updated {new Date(sol.updatedAt).toLocaleDateString()}
                </span>

                <Link
                  href={`/studio/solutions/${sol.id}`}
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--action-primary)",
                    textDecoration: "none",
                  }}
                >
                  Open Solution →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && !errorState && filteredSolutions.length > 0 && viewMode === "list" && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-page)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Solution</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Prefix</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Status</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: "var(--font-weight-semibold)" }}>Updated</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", fontWeight: "var(--font-weight-semibold)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSolutions.map((sol) => (
                <tr key={sol.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{sol.name}</strong>
                      {sol.description && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                          {sol.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <Badge variant="neutral">{sol.solutionPrefix || sol.prefix || "CSM"}</Badge>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <Badge variant="info">{sol.status}</Badge>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--font-size-xs)" }}>
                    {new Date(sol.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                    <Link
                      href={`/studio/solutions/${sol.id}`}
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--action-primary)",
                        textDecoration: "none",
                      }}
                    >
                      Open Solution →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Navigation Confirmation Dialog for Dirty Create Draft */}
      {showNavConfirmModal && (
        <Dialog
          isOpen={true}
          title="Unsaved Create Solution Draft"
          description="You have unsaved changes in your Create Solution draft. Are you sure you want to leave and discard this draft?"
          onCancel={() => setShowNavConfirmModal(false)}
          hideFooter={true}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Button variant="secondary" onClick={() => setShowNavConfirmModal(false)}>
              Continue Editing
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowNavConfirmModal(false);
                handleCancelCreate();
                router.push("/landing");
              }}
              style={{ backgroundColor: "var(--error-main)", borderColor: "var(--error-main)" }}
            >
              Discard Draft & Leave
            </Button>
          </div>
        </Dialog>
      )}

      {/* Create Solution Modal Dialog (Single Footer, Initial Focus on Name) */}
      {isCreateModalOpen && (
        <Dialog
          isOpen={true}
          title="Create New Solution"
          description="Define a new Solution container for your organization. The system will provision an initial Form aggregate."
          onCancel={handleCancelCreate}
          hideFooter={true}
          initialFocusRef={nameInputRef}
        >
          <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {createError && <Alert variant="error">{createError}</Alert>}

            <FormField id="sol-create-name" label="Solution Name" isRequired>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  ref={nameInputRef}
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g., Customer Support Case Management"
                  disabled={createPending}
                  required
                />
              )}
            </FormField>

            <FormField id="sol-create-prefix" label="Solution Prefix (Key Identifier)" isRequired>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={prefix}
                  onChange={handlePrefixChange}
                  placeholder="e.g., CSM"
                  disabled={createPending}
                  required
                />
              )}
            </FormField>

            <FormField id="sol-create-desc" label="Description">
              {({ isInvalid, ...validProps }) => (
                <textarea
                  {...validProps}
                  aria-invalid={isInvalid ? "true" : undefined}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Manages incoming support tickets and customer inquiries."
                  disabled={createPending}
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <Button type="button" variant="secondary" onClick={handleCancelCreate} disabled={createPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createPending || !name.trim() || !prefix.trim()} aria-busy={createPending}>
                {createPending ? "Creating Solution..." : "Create Solution"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
