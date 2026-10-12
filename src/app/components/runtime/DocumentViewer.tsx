"use client";

import { DemoDocument } from "@/demo-runtime/types";

export type DocumentFormat = "pdf" | "image" | "word" | "excel" | "unsupported";

export function getDocumentFormat(doc: DemoDocument | null): DocumentFormat {
  if (!doc) return "unsupported";
  const type = (doc.type || "").toLowerCase();
  const name = (doc.name || "").toLowerCase();
  const url = (doc.fileUrl || "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf") || url.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".webp")
  ) {
    return "image";
  }
  if (
    type.includes("word") ||
    type.includes("officedocument.wordprocessingml") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    url.endsWith(".docx") ||
    url.endsWith(".doc")
  ) {
    return "word";
  }
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("officedocument.spreadsheetml") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    url.endsWith(".xlsx") ||
    url.endsWith(".xls")
  ) {
    return "excel";
  }
  return "unsupported";
}

interface DocumentViewerProps {
  document: DemoDocument | null;
  customerName?: string;
  caseId?: string;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const doc = document;
  const isAvailable = Boolean(doc && doc.isAvailable !== false && doc.fileUrl);
  const format = getDocumentFormat(doc);

  const getActionLabel = () => {
    switch (format) {
      case "pdf":
        return "Open PDF ↗";
      case "image":
        return "Open Image ↗";
      default:
        return "Open / Download Original ↗";
    }
  };

  return (
    <div
      data-testid="document-viewer"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        backgroundColor: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-subtle)",
        overflow: "hidden",
      }}
    >
      {/* Document Viewer Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-2) var(--space-4)",
          backgroundColor: "var(--bg-surface-sunken)",
          borderBottom: "1px solid var(--border-default)",
          gap: "var(--space-2)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
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
          </svg>
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={doc?.name || "Document Viewer"}
          >
            {doc?.name || "Document Viewer"}
          </span>
        </div>

        {doc && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {doc.size}
            </span>
            {isAvailable && (
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--action-primary)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                }}
                title={getActionLabel()}
              >
                {getActionLabel()}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Format-Aware Preview Area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          display: "flex",
          position: "relative",
          backgroundColor: isAvailable && format === "pdf" ? "#525659" : "var(--bg-surface-sunken)",
          overflow: "hidden",
        }}
      >
        {!doc ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-8)",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
                No document selected.
              </p>
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
                Select an attached document from the list to display in this viewer.
              </p>
            </div>
          </div>
        ) : !isAvailable ? (
          /* Clean Missing Document State without breaking page */
          <div
            data-testid="document-not-available"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-8)",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-surface-sunken)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "var(--space-3)",
                border: "1px solid var(--border-default)",
              }}
            >
              📄
            </div>
            <h3
              style={{
                margin: "0 0 var(--space-1)",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Document not available
            </h3>
            <p
              style={{
                margin: "0 0 var(--space-2)",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                maxWidth: "340px",
                lineHeight: 1.5,
              }}
            >
              This document file is not available in local demo storage. You can select another attached document from the list.
            </p>
          </div>
        ) : format === "pdf" ? (
          <iframe
            key={doc.id}
            src={doc.fileUrl}
            title={doc.name}
            data-testid="pdf-viewer-frame"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
          />
        ) : format === "image" ? (
          <div
            data-testid="image-viewer-container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-4)",
              overflow: "auto",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.fileUrl}
              alt={doc.name}
              data-testid="image-viewer-frame"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
        ) : format === "word" ? (
          <div
            data-testid="word-preview-adapter"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-8)",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "var(--space-4)",
                border: "1px solid #bfdbfe",
              }}
            >
              W
            </div>
            <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "1.125rem", color: "var(--text-primary)" }}>
              {doc.name}
            </h3>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Microsoft Word Document • {doc.size}
            </p>
            <div
              style={{
                maxWidth: "420px",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-sunken)",
                border: "1px solid var(--border-default)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
                lineHeight: 1.5,
              }}
            >
              Direct in-browser preview is available for PDF and images. For Word documents, view or download the original file. Future server-side PDF rendition pipeline can be integrated seamlessly.
            </div>
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid="download-original-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--action-primary, #2563eb)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Open / Download Original
            </a>
          </div>
        ) : format === "excel" ? (
          <div
            data-testid="spreadsheet-preview-adapter"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-8)",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "12px",
                backgroundColor: "#f0fdf4",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "var(--space-4)",
                border: "1px solid #bbf7d0",
              }}
            >
              X
            </div>
            <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "1.125rem", color: "var(--text-primary)" }}>
              {doc.name}
            </h3>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Microsoft Excel Spreadsheet • {doc.size}
            </p>
            <div
              style={{
                maxWidth: "420px",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-sunken)",
                border: "1px solid var(--border-default)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
                lineHeight: 1.5,
              }}
            >
              Direct in-browser preview is available for PDF and images. For spreadsheet documents, view or download the original file. Future server-side rendition pipeline can be connected seamlessly.
            </div>
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid="download-original-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Open / Download Original
            </a>
          </div>
        ) : (
          <div
            data-testid="unsupported-preview-adapter"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "var(--space-8)",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-surface-sunken)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "var(--space-4)",
                border: "1px solid var(--border-default)",
              }}
            >
              ?
            </div>
            <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "1.125rem", color: "var(--text-primary)" }}>
              No Preview Available
            </h3>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              {doc.name} ({doc.size})
            </p>
            <p
              style={{
                maxWidth: "380px",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
              }}
            >
              This file format does not support inline preview. You can open or download the original file to view it locally.
            </p>
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid="download-original-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--action-primary, #2563eb)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Open / Download Original
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
