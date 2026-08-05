"use client";

import React, { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Input,
  PasswordInput,
  FormField,
  Alert,
  SkipLink,
} from "@/app/components/ui";

export type LoginFixtureState =
  | "default"
  | "filled"
  | "validation-error"
  | "invalid-credentials"
  | "pending"
  | "network-failure"
  | "session-expired";

interface PageProps {
  searchParams?: Promise<{ state?: string }> | { state?: string };
}

function LoginPageContent({ searchParams }: PageProps) {
  const searchParamsHook = useSearchParams();

  let rawState: string | undefined;

  if (searchParams && typeof (searchParams as any).then === "function") {
    const resolved = use(searchParams as Promise<{ state?: string }>);
    rawState = resolved?.state;
  } else if (searchParams && (searchParams as any).state) {
    rawState = (searchParams as any).state;
  } else {
    rawState = searchParamsHook?.get("state") || undefined;
  }

  rawState = rawState || "default";

  const validStates: LoginFixtureState[] = [
    "default",
    "filled",
    "validation-error",
    "invalid-credentials",
    "pending",
    "network-failure",
    "session-expired",
  ];

  const fixtureState: LoginFixtureState = validStates.includes(rawState as LoginFixtureState)
    ? (rawState as LoginFixtureState)
    : "default";

  // Fixture State Configuration Derivations
  const isFilled = fixtureState === "filled" || fixtureState === "invalid-credentials" || fixtureState === "pending" || fixtureState === "network-failure";
  const initialEmail = fixtureState === "validation-error" ? "invalid-email" : isFilled ? "demo.user@example.invalid" : "";
  const initialPassword = fixtureState === "validation-error" ? "" : isFilled ? "Password123!" : "";

  const isPending = fixtureState === "pending";


  const emailError = fixtureState === "validation-error" ? "Please enter a valid email address" : undefined;
  const passwordError = fixtureState === "validation-error" ? "Password is required" : undefined;

  let alertConfig: { variant: "error" | "information"; title: string; description: string } | null = null;

  if (fixtureState === "invalid-credentials") {
    alertConfig = {
      variant: "error",
      title: "Authentication Failed",
      description: "Invalid email or password. Please check your credentials and try again.",
    };
  } else if (fixtureState === "network-failure") {
    alertConfig = {
      variant: "error",
      title: "Connection Error",
      description: "Unable to reach authentication service. Please verify your network connection and try again.",
    };
  } else if (fixtureState === "session-expired") {
    alertConfig = {
      variant: "information",
      title: "Session Expired",
      description: "Your session has expired due to inactivity. Please sign in again to continue.",
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Static stage B2: prevent submission and network requests
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
          {alertConfig && (
            <div style={{ marginBottom: "var(--space-6)" }}>
              <Alert variant={alertConfig.variant} title={alertConfig.title} style={{ marginBottom: 0 }}>
                {alertConfig.description}
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
                  defaultValue={initialEmail}
                  key={`email-${fixtureState}`}
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
                  defaultValue={initialPassword}
                  key={`password-${fixtureState}`}
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

export default function LoginPage(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}
