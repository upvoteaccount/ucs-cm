"use client";

import { useEffect } from "react";
import { Alert, Button } from "@/app/components/ui";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error silently for monitoring without exposing raw details to UI
    console.error("Unhandled global application error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <section aria-labelledby="error-heading">
          <Alert variant="error" title="System Error" style={{ marginBottom: "var(--space-6)" }}>
            An unexpected error occurred while processing your request.
          </Alert>

          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              padding: "var(--space-8)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-subtle)",
            }}
          >
            <h1
              id="error-heading"
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Application Error
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "var(--space-6)" }}>
              The application encountered an unexpected runtime condition. You can attempt to retry the operation or return home.
            </p>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button type="button" variant="primary" onClick={reset}>
                Try again
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
