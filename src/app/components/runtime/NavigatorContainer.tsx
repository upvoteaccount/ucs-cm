"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoWorkItem } from "@/demo-runtime/types";
import { getDemoWorkItemsForQueue } from "@/demo-runtime/adapter";
import { Button, Pagination } from "@/app/components/ui";

export interface NavigatorQueueItem {
  id: string;
  name: string;
  queueKey: string;
  description?: string | null;
  count?: number;
}

interface NavigatorContainerProps {
  solution: {
    id: string;
    name: string;
    description?: string | null;
    solutionPrefix: string;
  };
  queues: NavigatorQueueItem[];
  initialQueueId?: string;
}

export function NavigatorContainer({
  solution,
  queues,
  initialQueueId,
}: NavigatorContainerProps) {
  const router = useRouter();

  // Selected queue state for In Basket dropdown (lists user's accessible queues)
  const [selectedQueueId, setSelectedQueueId] = useState<string>(() => {
    return initialQueueId || queues[0]?.id || "";
  });

  // Selected queue resolved
  const selectedQueue = useMemo(() => {
    return queues.find((q) => q.id === selectedQueueId) || queues[0];
  }, [queues, selectedQueueId]);

  // Work items for selected queue (refreshed in place on queue change)
  const workItems = useMemo<DemoWorkItem[]>(() => {
    if (!selectedQueue) return [];
    return getDemoWorkItemsForQueue(selectedQueue.queueKey, selectedQueue.name);
  }, [selectedQueue]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleQueueChange = (queueId: string) => {
    setSelectedQueueId(queueId);
    setCurrentPage(1);
  };

  // Paginated items
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = workItems.slice(startIndex, startIndex + pageSize);

  return (
    <div
      className="ucs-runtime-container"
      data-testid="navigator-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        width: "100%",
      }}
    >
      {/* Compact Solution Header: <Full Solution Name> (<Prefix>) */}
      <div>
        <Link
          href="/solutions"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontWeight: "var(--font-weight-medium)",
            marginBottom: "var(--space-1)",
          }}
        >
          ← Back to My Solutions
        </Link>

        <h1
          data-testid="solution-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {solution.name} ({solution.solutionPrefix})
        </h1>
      </div>

      {/* Controls Row: In Basket: [Queue dropdown]     Search Cases     Create Case */}
      <div
        data-testid="navigator-controls"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        {/* Left: Queue Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <label
            htmlFor="navigator-queue-select"
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            In Basket:
          </label>
          <select
            id="navigator-queue-select"
            aria-label="Queue"
            data-testid="queue-dropdown"
            value={selectedQueueId}
            onChange={(e) => handleQueueChange(e.target.value)}
            style={{
              fontSize: "var(--font-size-sm)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-page)",
              color: "var(--text-primary)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
              minWidth: "220px",
            }}
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}{q.count !== undefined ? ` (${q.count})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Link href={`/solutions/${solution.id}/search`}>
            <Button
              variant="secondary"
              data-testid="search-cases-btn"
              style={{
                height: "var(--control-height-sm)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Search Cases
            </Button>
          </Link>
          <Link href={`/solutions/${solution.id}/create-case`}>
            <Button
              variant="primary"
              data-testid="create-case-btn"
              style={{
                height: "var(--control-height-sm)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              Create Case
            </Button>
          </Link>
        </div>
      </div>

      {/* Selected Queue In Basket Table */}
      <div
        data-testid="in-basket-table-container"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          {paginatedItems.length === 0 ? (
            <div
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              No work items currently waiting in queue &quot;{selectedQueue?.name}&quot;.
            </div>
          ) : (
            <table
              data-testid="in-basket-table"
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
                    backgroundColor: "var(--bg-surface-sunken, var(--bg-page))",
                    borderBottom: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  <th style={{ padding: "var(--space-3) var(--space-4)" }}>WID</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)" }}>Customer Name</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)" }}>Received</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.wid}
                    onClick={() =>
                      router.push(
                        `/solutions/${solution.id}/work-items/${item.wid}?queueId=${selectedQueue?.id}`
                      )
                    }
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
                      {item.wid}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.customerName}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        color: "var(--text-muted)",
                        fontSize: "var(--font-size-xs)",
                      }}
                    >
                      {item.receivedDate}
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

        {/* Pagination */}
        {workItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={workItems.length}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            testId="in-basket-pagination"
          />
        )}
      </div>
    </div>
  );
}
