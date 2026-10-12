"use client";

import { DemoCaseHistoryEntry } from "@/demo-runtime/types";

interface CaseHistoryListProps {
  history: DemoCaseHistoryEntry[];
}

export function CaseHistoryList({ history }: CaseHistoryListProps) {
  return (
    <div
      data-testid="case-history-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        backgroundColor: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: "var(--space-6)",
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            No history recorded for this case.
          </div>
        ) : (
          <table
            data-testid="case-history-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "var(--font-size-xs)",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--bg-surface-sunken, var(--bg-page))",
                  borderBottom: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  fontWeight: "var(--font-weight-semibold)",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th style={{ padding: "var(--space-2) var(--space-3)", width: "130px" }}>Timestamp</th>
                <th style={{ padding: "var(--space-2) var(--space-3)", width: "140px" }}>Action</th>
                <th style={{ padding: "var(--space-2) var(--space-3)", width: "130px" }}>Actor</th>
                <th style={{ padding: "var(--space-2) var(--space-3)" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: "1px solid var(--border-default)",
                    transition: "background-color var(--transition-speed)",
                  }}
                >
                  <td
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.timestamp}
                  </td>
                  <td
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.action}
                  </td>
                  <td
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.actor}
                  </td>
                  <td
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {entry.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
