// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import LoginPage from "./page";

describe("Stage B2 Static Login Page Composition Suite", () => {
  it("renders default state with empty fields and enabled submit button", () => {
    render(<LoginPage searchParams={{ state: "default" }} />);

    expect(screen.getByRole("heading", { level: 1, name: "UCS CM" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter your password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders filled state with fixture credentials", () => {
    render(<LoginPage searchParams={{ state: "filled" }} />);

    expect(screen.getByLabelText(/Email address/i)).toHaveValue("demo.user@example.invalid");
    expect(screen.getByPlaceholderText("Enter your password")).toHaveValue("Password123!");
    expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled();
  });

  it("renders validation-error state with field-level messages and aria-invalid linkage", () => {
    render(<LoginPage searchParams={{ state: "validation-error" }} />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");

    expect(emailInput).toHaveValue("invalid-email");
    expect(passwordInput).toHaveValue("");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
    expect(passwordInput).toHaveAttribute("aria-describedby", "password-error");
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("renders invalid-credentials state with form-level error alert", () => {
    render(<LoginPage searchParams={{ state: "invalid-credentials" }} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
  });

  it("renders pending state with disabled fields, disabled button, and loading spinner text", () => {
    render(<LoginPage searchParams={{ state: "pending" }} />);

    expect(screen.getByLabelText(/Email address/i)).toBeDisabled();
    expect(screen.getByPlaceholderText("Enter your password")).toBeDisabled();
    const btn = screen.getByRole("button", { name: "Signing in..." });
    expect(btn).toBeDisabled();
  });

  it("renders network-failure state with persistent connection alert", () => {
    render(<LoginPage searchParams={{ state: "network-failure" }} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Connection Error")).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach authentication service/i)).toBeInTheDocument();
  });

  it("renders session-expired state with status alert distinct from invalid credentials", () => {
    render(<LoginPage searchParams={{ state: "session-expired" }} />);

    const statusAlert = screen.getByRole("status");
    expect(statusAlert).toBeInTheDocument();
    expect(screen.getByText("Session Expired")).toBeInTheDocument();
    expect(screen.getByText(/Your session has expired due to inactivity/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls back to default state when an unknown fixture state parameter is provided", () => {
    render(<LoginPage searchParams={{ state: "unknown-state-value" }} />);

    expect(screen.getByRole("heading", { level: 1, name: "UCS CM" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("verifies accessible landmark hierarchy and SkipLink target", () => {
    render(<LoginPage searchParams={{ state: "default" }} />);

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("heading", { level: 1, name: "UCS CM" })).toBeInTheDocument();
  });
});
