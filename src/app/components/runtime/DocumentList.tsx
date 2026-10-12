"use client";

import { DemoDocument } from "@/demo-runtime/types";
import { getDocumentFormat } from "./DocumentViewer";

interface DocumentListProps {
  documents: DemoDocument[];
  activeDocumentId: string;
  onSelectDocument: (doc: DemoDocument) => void;
}

export function DocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
}: DocumentListProps) {
  const getBadgeConfig = (doc: DemoDocument) => {
    const ext = doc.name.split(".").pop()?.toUpperCase() || "";
    const fmt = getDocumentFormat(doc);
    switch (fmt) {
      case "pdf":
        return { label: ext || "PDF", bg: "#fef2f2", color: "#b91c1c" };
      case "image":
        return { label: ext || "IMG", bg: "#eff6ff", color: "#2563eb" };
      case "word":
        return { label: ext || "DOC", bg: "#e0e7ff", color: "#4338ca" };
      case "excel":
        return { label: ext || "XLS", bg: "#f0fdf4", color: "#166534" };
      default:
        return { label: ext || "FILE", bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div
      data-testid="document-list-container"
      style={{
        backgroundColor: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border-default)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--action-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Attached Documents ({documents.length})
          </h3>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
          Click to inspect in viewer
        </span>
      </div>

      <div
        data-testid="document-list-scrollable"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-4)",
          overflowY: "auto",
          flex: "1 1 0%",
          minHeight: 0,
        }}
      >
        {documents.map((doc) => {
          const isSelected = doc.id === activeDocumentId;
          const badge = getBadgeConfig(doc);
          const ext = doc.name.split(".").pop()?.toUpperCase() || badge.label;
          return (
            <button
              key={doc.id}
              type="button"
              data-testid={`document-item-${doc.id}`}
              onClick={() => onSelectDocument(doc)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: isSelected ? "var(--action-secondary-bg)" : "var(--bg-surface)",
                border: isSelected ? "1.5px solid var(--action-primary)" : "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all var(--transition-speed) ease",
                width: "100%",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                {/* Format Icon */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isSelected ? "var(--action-primary)" : badge.bg,
                    color: isSelected ? "var(--action-primary-text)" : badge.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "11px",
                    flexShrink: 0,
                  }}
                >
                  {badge.label}
                </div>

                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: isSelected ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.name}
                  </span>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                    {ext} • {doc.size} • {doc.uploadedAt}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
