"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Input, Button } from "@/app/components/ui";

export interface RuntimeSolutionItem {
  id: string;
  name: string;
  description?: string | null;
  solutionPrefix: string;
  status: string;
  updatedAt: string | Date;
}

interface RuntimeSolutionsListProps {
  solutions: RuntimeSolutionItem[];
}

export function RuntimeSolutionsList({ solutions }: RuntimeSolutionsListProps) {
  const [search, setSearch] = useState("");

  const filtered = solutions.filter((sol) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      sol.name.toLowerCase().includes(q) ||
      sol.solutionPrefix.toLowerCase().includes(q) ||
      (sol.description && sol.description.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="ucs-runtime-container"
      data-testid="runtime-solutions-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        width: "100%",
      }}
    >
      {/* Header */}
      <div>
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
              My Solutions (Runtime)
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              Select a solution to access its Navigator, In-Baskets, and case processing work items.
            </p>
          </div>

          <div style={{ width: "100%", maxWidth: "320px" }}>
            <Input
              type="text"
              placeholder="Search solutions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: "var(--control-height-sm)" }}
            />
          </div>
        </div>
      </div>

      {/* Solutions Cards Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            padding: "var(--space-12) var(--space-4)",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-2) 0", fontWeight: "var(--font-weight-medium)" }}>
            No solutions found.
          </p>
          {search && (
            <Button variant="secondary" onClick={() => setSearch("")} style={{ height: "var(--control-height-sm)" }}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "var(--space-5)",
          }}
        >
          {filtered.map((sol) => (
            <div
              key={sol.id}
              data-testid={`runtime-solution-card-${sol.id}`}
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
                minHeight: "190px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="primary">{sol.solutionPrefix}</Badge>
                  <Badge variant="neutral">{sol.status}</Badge>
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
                  }}
                >
                  {sol.description || "Operational loan and case management solution."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingTop: "var(--space-3)",
                  borderTop: "1px solid var(--border-default)",
                }}
              >
                <Link
                  href={`/solutions/${sol.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    height: "var(--control-height-sm)",
                    padding: "0 var(--space-4)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--action-primary)",
                    color: "var(--action-primary-text)",
                    textDecoration: "none",
                  }}
                >
                  Open Solution Navigator →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
