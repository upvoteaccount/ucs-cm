"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoWorkItem } from "@/demo-runtime/types";
import { Badge, Input, Button, Pagination } from "@/app/components/ui";

export interface InBasketColumnDef {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
}

/**
 * Default In Basket column layout for PLA demo.
 * Structured to be easily configured via Studio metadata in future iterations.
 */
export const DEFAULT_PLA_IN_BASKET_COLUMNS: InBasketColumnDef[] = [
  { key: "wid", header: "WID" },
  { key: "customerName", header: "Customer Name" },
  { key: "received", header: "Received" },
  { key: "action", header: "Action", align: "right" },
];

interface InBasketContainerProps {
  solution: {
    id: string;
    name: string;
    solutionPrefix: string;
  };
  queue: {
    id: string;
    name: string;
    queueKey: string;
    description?: string | null;
  };
  workItems: DemoWorkItem[];
  columns?: InBasketColumnDef[];
}

export function InBasketContainer({
  solution,
  queue,
  workItems,
  columns = DEFAULT_PLA_IN_BASKET_COLUMNS,
}: InBasketContainerProps) {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredItems = workItems.filter((item) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      item.wid.toLowerCase().includes(q) ||
      item.caseId.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q)
    );
  });

  const handleFilterChange = (text: string) => {
    setFilterText(text);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Slice paginated items
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  return (
    <div
      className="ucs-runtime-container"
      data-testid="in-basket-container"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", width: "100%" }}
    >
      {/* Header & Breadcrumb */}
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h1
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                In Basket: {queue.name}
              </h1>
              <Badge variant="primary">{queue.queueKey}</Badge>
            </div>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              {queue.description || "Work items pending processing in this queue."}
            </p>
          </div>

          <Badge variant="neutral">
            {filteredItems.length} {filteredItems.length === 1 ? "Work Item" : "Work Items"}
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-4)",
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <Input
            type="text"
            placeholder="Filter by WID or Customer Name..."
            value={filterText}
            onChange={(e) => handleFilterChange(e.target.value)}
            style={{ height: "var(--control-height-sm)" }}
          />
        </div>
        {filterText && (
          <Button
            variant="secondary"
            onClick={() => handleFilterChange("")}
            style={{ height: "var(--control-height-sm)" }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Work Items Table */}
      <div
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
        {filteredItems.length === 0 ? (
          <div style={{ padding: "var(--space-10) var(--space-4)", textAlign: "center", color: "var(--text-secondary)" }}>
            <p style={{ margin: "0 0 var(--space-2) 0", fontWeight: "var(--font-weight-medium)" }}>
              No work items found matching your filter.
            </p>
            {filterText && (
              <Button
                variant="secondary"
                onClick={() => handleFilterChange("")}
                style={{ height: "var(--control-height-sm)" }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
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
                    backgroundColor: "var(--bg-page)",
                    borderBottom: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontSize: "var(--font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.wid}
                    onClick={() =>
                      router.push(`/solutions/${solution.id}/work-items/${item.wid}?queueId=${queue.id}`)
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
                        color: "var(--text-primary)",
                        fontWeight: "var(--font-weight-medium)",
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
                      <Link
                        href={`/solutions/${solution.id}/work-items/${item.wid}?queueId=${queue.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--action-primary)",
                          textDecoration: "none",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reusable Pagination Component */}
        {filteredItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            testId="in-basket-pagination"
          />
        )}
      </div>
    </div>
  );
}
