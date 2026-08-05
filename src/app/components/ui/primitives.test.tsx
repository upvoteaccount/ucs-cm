// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import {
  Button,
  IconButton,
  Input,
  PasswordInput,
  FormField,
  Alert,
  SkipLink,
  VisuallyHidden,
  Spinner,
} from "./index";

describe("Stage B1 Minimum Visual Primitives Test Suite", () => {
  describe("Button Primitive", () => {
    it("renders accessible button text and forwards type", () => {
      render(<Button type="submit">Sign In</Button>);
      const btn = screen.getByRole("button", { name: "Sign In" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("type", "submit");
    });

    it("handles disabled state and prevents click events", async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(<Button disabled onClick={() => { clicked = true; }}>Submit</Button>);
      const btn = screen.getByRole("button", { name: "Submit" });
      expect(btn).toBeDisabled();
      await user.click(btn);
      expect(clicked).toBe(false);
    });

    it("pending state disables button and renders loading indication with pending text", () => {
      render(<Button isPending pendingText="Signing in...">Sign In</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Signing in...");
    });

    it("forwards React ref correctly", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>With Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveTextContent("With Ref");
    });
  });

  describe("IconButton Primitive", () => {
    it("requires and renders accessible label and defaults type to button", () => {
      render(
        <IconButton aria-label="Toggle password">
          <span>Icon</span>
        </IconButton>
      );
      const btn = screen.getByRole("button", { name: "Toggle password" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("type", "button");
    });

    it("respects disabled state", () => {
      render(
        <IconButton aria-label="Toggle password" disabled>
          <span>Icon</span>
        </IconButton>
      );
      const btn = screen.getByRole("button", { name: "Toggle password" });
      expect(btn).toBeDisabled();
    });

    it("forwards React ref correctly", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <IconButton ref={ref} aria-label="Settings">
          <span>Icon</span>
        </IconButton>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Input Primitive", () => {
    it("forwards input attributes and supports invalid state", () => {
      render(<Input id="email" type="email" isInvalid placeholder="Enter email" />);
      const input = screen.getByPlaceholderText("Enter email");
      expect(input).toHaveAttribute("type", "email");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("handles disabled and readonly states", () => {
      render(<Input placeholder="Disabled input" disabled readOnly />);
      const input = screen.getByPlaceholderText("Disabled input");
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("readonly");
    });
  });

  describe("PasswordInput Primitive", () => {
    it("is masked by default and toggles visibility via user mouse click", async () => {
      const user = userEvent.setup();
      render(<PasswordInput placeholder="Enter password" />);
      const input = screen.getByPlaceholderText("Enter password");
      expect(input).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByRole("button", { name: "Show password" });
      expect(toggleBtn).toBeInTheDocument();

      await user.click(toggleBtn);
      expect(input).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hide password" }));
      expect(input).toHaveAttribute("type", "password");
    });

    it("toggles visibility via keyboard Space / Enter activation", async () => {
      const user = userEvent.setup();
      render(<PasswordInput placeholder="Enter password" />);
      const toggleBtn = screen.getByRole("button", { name: "Show password" });

      toggleBtn.focus();
      expect(toggleBtn).toHaveFocus();

      await user.keyboard("[Space]");
      const input = screen.getByPlaceholderText("Enter password");
      expect(input).toHaveAttribute("type", "text");
    });

    it("disables toggle button when PasswordInput is disabled", () => {
      render(<PasswordInput placeholder="Disabled pass" disabled />);
      const toggleBtn = screen.getByRole("button", { name: "Show password" });
      expect(toggleBtn).toBeDisabled();
    });
  });

  describe("FormField Primitive", () => {
    it("composes label, helper text, and validation message with ARIA attributes and communicates required in text", () => {
      render(
        <FormField
          id="username"
          label="Username"
          isRequired
          helperText="Enter your unique handle"
          errorMessage="Username is required"
        >
          {(fieldProps) => <Input {...fieldProps} />}
        </FormField>
      );

      const label = screen.getByText("Username");
      expect(label).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();
      expect(screen.getByText("(required)")).toBeInTheDocument();

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "username");
      expect(input).toHaveAttribute("aria-describedby", "username-helper username-error");
      expect(input).toHaveAttribute("aria-invalid", "true");

      expect(screen.getByText("Enter your unique handle")).toBeInTheDocument();
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });
  });

  describe("Spinner Primitive", () => {
    it("renders with role=status when standalone", () => {
      render(<Spinner label="Loading data" />);
      const status = screen.getByRole("status", { name: "Loading data" });
      expect(status).toBeInTheDocument();
    });

    it("renders with aria-hidden=true and no status role when accompanying text", () => {
      const { container } = render(<Spinner aria-hidden="true" />);
      const span = container.querySelector("span");
      expect(span).toHaveAttribute("aria-hidden", "true");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("Alert Primitive", () => {
    it("renders error semantics with role=alert", () => {
      render(
        <Alert variant="error" title="Authentication Error">
          Invalid email or password
        </Alert>
      );
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Authentication Error")).toBeInTheDocument();
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });

    it("renders information semantics with role=status and optional recovery action", () => {
      render(
        <Alert variant="information" title="Session Status" actionSlot={<button>Refresh</button>}>
          Your session will expire soon
        </Alert>
      );
      const alert = screen.getByRole("status");
      expect(alert).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });
  });

  describe("SkipLink Primitive", () => {
    it("renders correct target and accessible text", () => {
      render(<SkipLink targetId="main-content">Skip to main content</SkipLink>);
      const link = screen.getByRole("link", { name: "Skip to main content" });
      expect(link).toHaveAttribute("href", "#main-content");
    });
  });

  describe("VisuallyHidden Primitive", () => {
    it("keeps content rendered in DOM for screen readers", () => {
      render(<VisuallyHidden>Screen reader text</VisuallyHidden>);
      const span = screen.getByText("Screen reader text");
      expect(span).toBeInTheDocument();
    });
  });
});
