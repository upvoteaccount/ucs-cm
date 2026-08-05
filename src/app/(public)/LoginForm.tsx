"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  PasswordInput,
  FormField,
  Alert,
  SkipLink,
} from "@/app/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [formAlert, setFormAlert] = useState<{
    variant: "error" | "information";
    title: string;
    description: string;
  } | null>(null);

  const [isPending, setIsPending] = useState(false);

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPending) return;

    // Reset errors before validation
    setEmailError(undefined);
    setPasswordError(undefined);
    setFormAlert(null);

    const trimmedEmail = email.trim();
    let hasValidationError = false;

    if (!trimmedEmail) {
      setEmailError("Please enter a valid email address");
      hasValidationError = true;
    } else if (!validateEmailFormat(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      hasValidationError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      if (res.ok) {
        window.location.href = "/landing";
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 400) {
        setFormAlert({
          variant: "error",
          title: "Request Error",
          description: "Invalid request parameters. Please verify your entries and try again.",
        });
      } else if (res.status === 401) {
        setFormAlert({
          variant: "error",
          title: "Authentication Failed",
          description: "Invalid email or password. Please check your credentials and try again.",
        });
      } else if (res.status === 403) {
        setFormAlert({
          variant: "error",
          title: "Access Restricted",
          description: data.error || "Your account or organisation access is inactive. Please contact support.",
        });
      } else {
        setFormAlert({
          variant: "error",
          title: "Authentication Error",
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } catch {
      setFormAlert({
        variant: "error",
        title: "Connection Error",
        description: "Unable to reach authentication service. Please verify your network connection and try again.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <SkipLink targetId="main-content">Skip to main content</SkipLink>

      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-10) var(--space-8)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            border: "1px solid var(--border-default)",
          }}
        >
          {/* Brand & Heading Header */}
          <header style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--action-primary)",
                color: "var(--action-primary-text)",
                fontWeight: "var(--font-weight-bold)",
                fontSize: "var(--font-size-xl)",
                marginBottom: "var(--space-4)",
                boxShadow: "var(--shadow-subtle)",
              }}
              aria-hidden="true"
            >
              UCS
            </div>
            <h1
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
                marginBottom: "var(--space-2)",
                letterSpacing: "-0.02em",
              }}
            >
              UCS CM
            </h1>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              Sign in to access your solution workspace
            </p>
          </header>

          {/* Form-Level Persistent Alert Area */}
          {formAlert && (
            <div style={{ marginBottom: "var(--space-6)" }}>
              <Alert variant={formAlert.variant} title={formAlert.title} style={{ marginBottom: 0 }}>
                {formAlert.description}
              </Alert>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate aria-label="Sign in to UCS CM">
            <FormField
              id="email"
              label="Email address"
              isRequired
              errorMessage={emailError}
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="name@company.com"
                  disabled={isPending}
                  style={{ height: "var(--control-height-lg)" }}
                />
              )}
            </FormField>

            <FormField
              id="password"
              label="Password"
              isRequired
              errorMessage={passwordError}
            >
              {(fieldProps) => (
                <PasswordInput
                  {...fieldProps}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isPending}
                  style={{ height: "var(--control-height-lg)" }}
                />
              )}
            </FormField>

            <div style={{ marginTop: "var(--space-8)" }}>
              <Button
                type="submit"
                variant="primary"
                isPending={isPending}
                pendingText="Signing in..."
                disabled={isPending}
                style={{ height: "var(--control-height-lg)", fontSize: "var(--font-size-base)" }}
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
