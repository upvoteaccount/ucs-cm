"use client";

import { useState } from "react";
import { Button, Input, Alert, Badge } from "@/app/components/ui";
import { apiTestValidation } from "./studio-api.client";

export interface ValidationTestPanelProps {
  solutionId: string;
  storedDataType: string;
  formatPreset?: string;
  validationRules: any;
}

export function ValidationTestPanel({
  solutionId,
  storedDataType,
  formatPreset = "NONE",
  validationRules,
}: ValidationTestPanelProps) {
  const [sampleValue, setSampleValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [testResult, setTestResult] = useState<{
    isValid: boolean;
    normalizedRules: any;
    errors: { code: string; message: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSampleEmpty = !sampleValue || sampleValue.trim() === "";

  const handleTest = async () => {
    if (isSampleEmpty) {
      return; // Do not call backend when empty
    }

    setError(null);
    setTestResult(null);
    setIsPending(true);

    try {
      let parsedSample: any = sampleValue.trim();
      if (storedDataType === "NUMBER") {
        const num = Number(sampleValue);
        if (!isNaN(num)) parsedSample = num;
      }

      const res = await apiTestValidation(solutionId, {
        storedDataType,
        formatPreset,
        validationRules,
        sampleValue: parsedSample,
      });

      setTestResult(res);
    } catch (err: any) {
      setError(err?.message || "Invalid regular expression pattern or validation configuration.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>
        Test Pattern
      </label>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <Input
          value={sampleValue}
          onChange={(e) => {
            setSampleValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={
            storedDataType === "NUMBER"
              ? "e.g., 42"
              : storedDataType === "DATE"
              ? "e.g., 2026-01-01"
              : "e.g., SampleText123"
          }
          disabled={isPending}
          style={{ flex: 1, height: "36px" }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleTest}
          disabled={isPending || isSampleEmpty}
          aria-busy={isPending}
          style={{ height: "36px", whiteSpace: "nowrap" }}
        >
          {isPending ? "Testing..." : "Test"}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {testResult && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: testResult.isValid ? "#f0fdf4" : "var(--error-surface)",
            border: `1px solid ${testResult.isValid ? "#86efac" : "var(--error-border)"}`,
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            marginTop: "var(--space-1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <strong style={{ fontSize: "var(--font-size-xs)" }}>Result:</strong>
            <Badge
              variant="info"
              style={
                testResult.isValid
                  ? { backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#86efac" }
                  : { backgroundColor: "var(--error-surface)", color: "var(--error-main)", borderColor: "var(--error-border)" }
              }
            >
              {testResult.isValid ? "Matches validation" : "Does not match validation"}
            </Badge>
          </div>

          {!testResult.isValid && testResult.errors.length > 0 && (
            <div>
              <ul style={{ margin: "var(--space-1) 0 0 var(--space-4)", padding: 0 }}>
                {testResult.errors.map((err) => (
                  <li key={err.code || err.message} style={{ fontSize: "var(--font-size-xs)", color: "var(--error-main)" }}>
                    <code>{err.code}</code>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
