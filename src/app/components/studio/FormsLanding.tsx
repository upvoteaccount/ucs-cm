"use client";

import { Button, Badge, Skeleton, Alert } from "@/app/components/ui";

export interface FormSummary {
  id: string;
  formKey: string;
  formType: "ADD_CASE" | "CASE_VIEW" | string;
  name: string;
  description?: string | null;
}

export interface FormsLandingProps {
  forms: FormSummary[];
  onConfigureForm: (formId: string) => void;
  isLoading?: boolean;
  onReload?: () => void;
  error?: string | null;
}

export function FormsLanding({
  forms,
  onConfigureForm,
  isLoading = false,
  onReload,
  error = null,
}: FormsLandingProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          maxWidth: "1040px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Skeleton height="2.5rem" width="100%" label="Loading forms header..." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)" }}>
          <Skeleton height="12rem" width="100%" label="Loading Add Case Form card..." />
          <Skeleton height="12rem" width="100%" label="Loading Case View Form card..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
          maxWidth: "1040px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Alert variant="error" title="Error Loading Forms">
          {error}
        </Alert>
        {onReload && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button variant="secondary" onClick={onReload}>
              Retry Loading
            </Button>
          </div>
        )}
      </div>
    );
  }

  const addCaseForm = forms.find((f) => f.formType === "ADD_CASE" || f.formKey === "add_case");
  const caseViewForm = forms.find((f) => f.formType === "CASE_VIEW" || f.formKey === "case_view");

  const systemForms = [
    {
      form: addCaseForm,
      fallbackName: "Add Case Form",
      badge: "ADD_CASE",
      purpose: "Used to capture initial case details when creating a new case.",
    },
    {
      form: caseViewForm,
      fallbackName: "Case View Form",
      badge: "CASE_VIEW",
      purpose: "Used to display and manage case details when working on existing cases.",
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        padding: "var(--space-6)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: "1040px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header Bar */}
      <div>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Solution Forms
        </h2>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
          Configure layout, tabs, sections, and field presentation for this Solution&apos;s system forms.
        </p>
      </div>

      {/* Two System Form Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {systemForms.map(({ form, fallbackName, badge, purpose }) => {
          const formName = form?.name || fallbackName;
          const formId = form?.id;

          return (
            <div
              key={badge}
              style={{
                backgroundColor: "var(--bg-page)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3
                    style={{
                      fontSize: "var(--font-size-base)",
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {formName}
                  </h3>
                  <Badge variant="neutral">{badge}</Badge>
                </div>

                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {form?.description || purpose}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                <Button
                  variant="primary"
                  onClick={() => formId && onConfigureForm(formId)}
                  disabled={!formId}
                >
                  Configure
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
