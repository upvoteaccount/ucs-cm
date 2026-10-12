"use client";

import { useState } from "react";
import Link from "next/link";
import { DocumentViewer } from "./DocumentViewer";
import { DocumentList } from "./DocumentList";
import { CaseHistoryList } from "./CaseHistoryList";
import { CaseViewRuntimeForm, ChoiceListDto, QueueDto } from "./CaseViewRuntimeForm";
import type { FormAggregate, SolutionPropertyRow } from "@/modules/solution/index";
import { DemoCaseData, DemoDocument } from "@/demo-runtime/types";
import { saveDemoCaseValues } from "@/demo-runtime/adapter";
import { getDemoCaseHistory } from "@/demo-runtime/history";
import { Button, Toast } from "@/app/components/ui";

interface WidProcessingContainerProps {
  solution: {
    id: string;
    name: string;
    solutionPrefix: string;
  };
  wid: string;
  initialCase: DemoCaseData;
  formAggregate: FormAggregate;
  properties: SolutionPropertyRow[];
  choiceLists?: ChoiceListDto[];
  initialQueueId: string;
  initialQueueName: string;
  availableQueues?: QueueDto[];
  isReadOnly?: boolean;
}

export function WidProcessingContainer({
  solution,
  wid,
  initialCase,
  formAggregate,
  properties,
  choiceLists = [],
  initialQueueId,
  initialQueueName,
  isReadOnly = false,
}: WidProcessingContainerProps) {
  // Demo Case State
  const [caseData, setCaseData] = useState<DemoCaseData>(initialCase);
  // Queue context comes strictly from opened WID
  const activeQueueId = initialCase.assignedQueueKey || initialQueueId;
  const activeQueueName = initialCase.assignedQueueName || initialQueueName;

  // Lower RHS panel tab state: Documents | Case History
  const [lowerTab, setLowerTab] = useState<"documents" | "history">("documents");

  // Form validation errors state
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  // Active Document State
  const [activeDocument, setActiveDocument] = useState<DemoDocument>(() => {
    return (
      initialCase.documents?.[0] || {
        id: "doc-aadhaar-01",
        name: "Aadhaar Card.pdf",
        type: "application/pdf",
        size: "1.2 MB",
        pageCount: 2,
        uploadedAt: "Today, 09:12 AM",
        verified: true,
        documentType: "AADHAAR",
        fileUrl: "/demo-documents/aadhaar-card-verified.pdf",
      }
    );
  });

  // Local Save Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  const handleValuesChange = (newValues: Record<string, any>) => {
    setCaseData((prev) => ({
      ...prev,
      values: { ...prev.values, ...newValues },
    }));
  };

  const handleSave = () => {
    if (isReadOnly) return;
    if (hasValidationErrors) {
      setToastVariant("error");
      setToastMessage("Please resolve validation errors before saving.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSaving(true);
    try {
      saveDemoCaseValues(wid, caseData.values);
      setToastVariant("success");
      setToastMessage(`Case changes saved successfully for ${wid}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const caseHistory = getDemoCaseHistory(wid);

  return (
    <div
      className="ucs-runtime-container wid-processing-container wid-workspace"
      data-testid="wid-processing-container"
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        rowGap: "var(--space-3)",
        width: "100%",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          isOpen={Boolean(toastMessage)}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Fixed/Sticky Toolbar: Compact header: WID: <wid> | <Queue Name>   Save | Send */}
      <div
        data-testid="wid-toolbar"
        className="wid-toolbar"
        style={{
          flexShrink: 0,
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "var(--space-2) var(--space-5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Left Toolbar Context */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Link
            href={`/solutions/${solution.id}`}
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--text-secondary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ← Back to In Basket
          </Link>

          <div style={{ height: "18px", width: "1px", backgroundColor: "var(--border-default)" }} />

          {/* Operational Identifier: WID: <wid> | <Queue Name> */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span
              data-testid="wid-display"
              style={{
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
              }}
            >
              WID: {wid} | {activeQueueName}
            </span>
          </div>
        </div>

        {/* Right Toolbar Actions: Save | Send */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {isReadOnly && (
            <span
              data-testid="readonly-mode-indicator"
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--text-muted)",
                backgroundColor: "var(--action-secondary-bg)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full, 9999px)",
              }}
            >
              Read-only Mode
            </span>
          )}

          {/* Save Action */}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isReadOnly || isSaving || hasValidationErrors}
            title={isReadOnly ? "Read-only mode: Save is disabled" : undefined}
            style={{
              height: "var(--control-height-sm)",
              padding: "0 var(--space-4)",
              fontWeight: "var(--font-weight-semibold)",
              opacity: isReadOnly ? 0.5 : 1,
              cursor: isReadOnly ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>

          {/* Send Action (Disabled in Demo Slice / Read-only) */}
          <div
            style={{ position: "relative" }}
            title={isReadOnly ? "Read-only mode: Send is disabled" : "Workflow routing unavailable until Workflow is enabled"}
          >
            <Button
              variant="secondary"
              disabled={true}
              style={{
                height: "var(--control-height-sm)",
                padding: "0 var(--space-4)",
                opacity: 0.5,
                cursor: "not-allowed",
              }}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2: Workspace (fills minmax(0, 1fr)) */}
      <div
        data-testid="wid-workspace"
        className="wid-workspace"
        style={{
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* Main Two-Column Layout (~42% Viewer / ~58% Case Side) */}
        <div
          data-testid="wid-workspace-grid"
          className="wid-workspace-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "42% minmax(0, calc(58% - var(--space-4)))",
            gap: "var(--space-4)",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            width: "100%",
          }}
        >
        {/* Left Column: Format-Aware Document Viewer (100% available height) */}
        <div
          data-testid="wid-viewer-column"
          className="wid-viewer-panel"
          style={{
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DocumentViewer
            document={activeDocument}
            customerName={caseData.customerName}
            caseId={caseData.caseId}
          />
        </div>

        {/* Right Column: Case View Form (~58%) + Lower Panel Tabs (~42%) */}
        <div
          data-testid="wid-rhs-column"
          className="wid-right-panel"
          style={{
            display: "grid",
            gridTemplateRows: "minmax(0, 58%) minmax(0, 42%)",
            gap: "var(--space-3)",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Case View Form Region (Fixed Upper Region ~58%, Internal Scroll Only) */}
          <div
            data-testid="wid-case-form-wrapper"
            className="case-form-region"
            style={{
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CaseViewRuntimeForm
              formAggregate={formAggregate}
              properties={properties}
              choiceLists={choiceLists}
              activeQueueId={activeQueueId}
              activeQueueName={activeQueueName}
              initialValues={caseData.values}
              isReadOnly={isReadOnly}
              onValuesChange={handleValuesChange}
              onValidationChange={setHasValidationErrors}
            />
          </div>

          {/* Lower RHS Panel Region: Documents | Case History (~42% Fixed Layout Region) */}
          <div
            data-testid="wid-rhs-lower-panel"
            className="case-support-region"
            style={{
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-subtle)",
            }}
          >
            {/* Tabs Bar: Documents | Case History */}
            <div
              role="tablist"
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border-default)",
                backgroundColor: "var(--bg-surface-sunken, var(--bg-page))",
                padding: "0 var(--space-3)",
                flexShrink: 0,
                gap: "var(--space-2)",
              }}
            >
              <button
                role="tab"
                type="button"
                aria-selected={lowerTab === "documents"}
                data-testid="tab-documents"
                onClick={() => setLowerTab("documents")}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: lowerTab === "documents" ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                  color: lowerTab === "documents" ? "var(--action-primary)" : "var(--text-secondary)",
                  border: "none",
                  borderBottom: lowerTab === "documents" ? "2.5px solid var(--action-primary)" : "2.5px solid transparent",
                  background: "none",
                  cursor: "pointer",
                  transition: "color var(--transition-speed) ease",
                }}
              >
                Documents ({caseData.documents?.length || 0})
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={lowerTab === "history"}
                data-testid="tab-case-history"
                onClick={() => setLowerTab("history")}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: lowerTab === "history" ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                  color: lowerTab === "history" ? "var(--action-primary)" : "var(--text-secondary)",
                  border: "none",
                  borderBottom: lowerTab === "history" ? "2.5px solid var(--action-primary)" : "2.5px solid transparent",
                  background: "none",
                  cursor: "pointer",
                  transition: "color var(--transition-speed) ease",
                }}
              >
                Case History
              </button>
            </div>

            {/* Tab Body */}
            <div
              data-testid="wid-lower-tab-content"
              className="documents-history-content"
              style={{
                flex: "1 1 0%",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {lowerTab === "documents" ? (
                <DocumentList
                  documents={caseData.documents || []}
                  activeDocumentId={activeDocument.id}
                  onSelectDocument={(doc) => setActiveDocument(doc)}
                />
              ) : (
                <CaseHistoryList history={caseHistory} />
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
