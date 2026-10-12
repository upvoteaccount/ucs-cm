"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchDemoCases, getFallbackDemoQueues } from "@/demo-runtime/adapter";
import { DemoWorkItem, DemoSearchCriteria } from "@/demo-runtime/types";
import { Input, Button, Badge, Pagination } from "@/app/components/ui";

interface QueueOption {
  id: string;
  name: string;
  queueKey: string;
}

interface SearchContainerProps {
  solution: {
    id: string;
    name: string;
    solutionPrefix: string;
  };
  queues?: QueueOption[];
}

export function SearchContainer({ solution, queues }: SearchContainerProps) {
  const router = useRouter();

  const availableQueues =
    queues && queues.length > 0 ? queues : getFallbackDemoQueues(solution.solutionPrefix);

  const [criteria, setCriteria] = useState<DemoSearchCriteria>({
    caseId: "",
    wid: "",
    customerName: "",
    queueKey: "",
    receivedFrom: "",
    receivedTo: "",
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<DemoWorkItem[]>(() => searchDemoCases(""));

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleFieldChange = (field: keyof DemoSearchCriteria, val: string) => {
    setCriteria((prev) => ({ ...prev, [field]: val }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setCurrentPage(1);
    setResults(searchDemoCases(criteria));
  };

  const handleClear = () => {
    const cleared: DemoSearchCriteria = {
      caseId: "",
      wid: "",
      customerName: "",
      queueKey: "",
      receivedFrom: "",
      receivedTo: "",
    };
    setCriteria(cleared);
    setHasSearched(false);
    setCurrentPage(1);
    setResults(searchDemoCases(""));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Client-side pagination slicing
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedResults = results.slice(startIndex, startIndex + pageSize);

  return (
    <div
      className="ucs-runtime-container"
      data-testid="search-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        width: "100%",
      }}
    >
      {/* Header & Navigation */}
      <div>
        <Link
          href={`/solutions/${solution.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontWeight: "var(--font-weight-medium)",
            marginBottom: "var(--space-1)",
          }}
        >
          ← Back to Navigator ({solution.name})
        </Link>

        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Search Cases
        </h1>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
          Query cases across all queues using structured criteria.
        </p>
      </div>

      {/* Two-Column Search Workspace: [Filters 300-340px] | [Results flexible width] */}
      <div
        data-testid="search-workspace"
        style={{
          display: "flex",
          gap: "var(--space-5)",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* Left Column: Search Filters Panel (300px - 340px) */}
        <aside
          data-testid="search-filters-panel"
          style={{
            width: "320px",
            minWidth: "300px",
            maxWidth: "340px",
            flexShrink: 0,
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <div
            style={{
              paddingBottom: "var(--space-3)",
              marginBottom: "var(--space-4)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Search Filters
            </h2>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
              Filter by business or system attributes
            </span>
          </div>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {/* System Identifier: WID */}
            <div>
              <label
                htmlFor="search-wid"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                WID
              </label>
              <Input
                id="search-wid"
                type="text"
                placeholder="e.g. WID-2026-01042"
                value={criteria.wid || ""}
                onChange={(e) => handleFieldChange("wid", e.target.value)}
                style={{ height: "var(--control-height-sm)" }}
              />
            </div>

            {/* Customer Name */}
            <div>
              <label
                htmlFor="search-customer-name"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Customer Name
              </label>
              <Input
                id="search-customer-name"
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={criteria.customerName || ""}
                onChange={(e) => handleFieldChange("customerName", e.target.value)}
                style={{ height: "var(--control-height-sm)" }}
              />
            </div>

            {/* Queue */}
            <div>
              <label
                htmlFor="search-queue"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Queue
              </label>
              <select
                id="search-queue"
                aria-label="Queue"
                value={criteria.queueKey || ""}
                onChange={(e) => handleFieldChange("queueKey", e.target.value)}
                style={{
                  width: "100%",
                  height: "var(--control-height-sm)",
                  padding: "0 var(--space-3)",
                  fontSize: "var(--font-size-sm)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">All Queues</option>
                {availableQueues.map((q) => (
                  <option key={q.id} value={q.queueKey}>
                    {q.name} ({q.queueKey})
                  </option>
                ))}
              </select>
            </div>

            {/* Received From */}
            <div>
              <label
                htmlFor="search-received-from"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Received From
              </label>
              <Input
                id="search-received-from"
                type="date"
                value={criteria.receivedFrom || ""}
                onChange={(e) => handleFieldChange("receivedFrom", e.target.value)}
                style={{ height: "var(--control-height-sm)" }}
              />
            </div>

            {/* Received To */}
            <div>
              <label
                htmlFor="search-received-to"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Received To
              </label>
              <Input
                id="search-received-to"
                type="date"
                value={criteria.receivedTo || ""}
                onChange={(e) => handleFieldChange("receivedTo", e.target.value)}
                style={{ height: "var(--control-height-sm)" }}
              />
            </div>

            {/* Action Buttons: Clear & Search */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                borderTop: "1px solid var(--border-default)",
                paddingTop: "var(--space-4)",
                marginTop: "var(--space-2)",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={handleClear}
                style={{ height: "var(--control-height-sm)", flex: 1 }}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                type="submit"
                style={{ height: "var(--control-height-sm)", flex: 1 }}
              >
                Search
              </Button>
            </div>
          </form>
        </aside>

        {/* Right Column: Results Section (Flexible width, internally scrollable table) */}
        <section
          data-testid="search-results-panel"
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 12rem)",
            minHeight: "480px",
            overflow: "hidden",
          }}
        >
          {/* Results Summary Header */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-page)",
              borderBottom: "1px solid var(--border-default)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--text-secondary)",
              }}
            >
              Search Results ({results.length} {results.length === 1 ? "case" : "cases"} found)
            </span>
            {hasSearched && <Badge variant="neutral">Filtered</Badge>}
          </div>

          {/* Internally Scrollable Table Container */}
          <div
            data-testid="search-results-table-scrollable"
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {results.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-10) var(--space-4)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <p style={{ margin: "0 0 var(--space-2) 0", fontWeight: "var(--font-weight-medium)" }}>
                  No cases match the specified search criteria.
                </p>
                <Button variant="secondary" onClick={handleClear} style={{ height: "var(--control-height-sm)" }}>
                  Reset Search Criteria
                </Button>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <thead>
                  <tr
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      backgroundColor: "var(--bg-page)",
                      borderBottom: "1px solid var(--border-default)",
                      fontSize: "var(--font-size-xs)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "var(--space-3) var(--space-4)" }}>WID</th>
                    <th style={{ padding: "var(--space-3) var(--space-4)" }}>Customer Name</th>
                    <th style={{ padding: "var(--space-3) var(--space-4)" }}>Queue</th>
                    <th style={{ padding: "var(--space-3) var(--space-4)" }}>Received</th>
                    <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map((r) => (
                    <tr
                      key={r.wid}
                      onClick={() => router.push(`/solutions/${solution.id}/work-items/${r.wid}?mode=readonly`)}
                      style={{
                        borderBottom: "1px solid var(--border-default)",
                        cursor: "pointer",
                        transition: "background-color 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--action-secondary-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                          color: "var(--action-primary)",
                        }}
                      >
                        {r.wid}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {r.customerName}
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <Badge variant="neutral">{r.queueName}</Badge>
                      </td>
                      <td
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          color: "var(--text-muted)",
                          fontSize: "var(--font-size-xs)",
                        }}
                      >
                        {r.receivedDate}
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: "var(--font-size-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--action-primary)",
                          }}
                        >
                          Open →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Reusable Pagination Footer */}
          {results.length > 0 && (
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={results.length}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              testId="search-pagination"
            />
          )}
        </section>
      </div>
    </div>
  );
}
