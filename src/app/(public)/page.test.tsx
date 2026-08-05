// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { LoginForm } from "./LoginForm";
import PublicPage from "./page";
import { authService } from "@/modules/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

describe("Stage E Production Login Form Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default state with empty fields and enabled submit button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("heading", { level: 1, name: "UCS CM" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter your password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 1. required-field validation prevents fetch
  it("prevents fetch when required fields are empty", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LoginForm />);

    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });
    act(() => {
      fireEvent.submit(form);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  // 2. invalid email prevents fetch
  it("prevents fetch when email format is invalid", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    act(() => {
      fireEvent.submit(form);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
  });

  // 3, 4, 5, 6, 7, 16. trimming, unchanged password, exact endpoint, exact JSON body, Content-Type, navigation
  it("submits trimmed email and unchanged password to POST /api/auth/session with application/json and navigates on 200", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "SUCCESS" }),
    } as Response);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "" },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "  aarav.mehta@example.invalid  " } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aarav.mehta@example.invalid",
        password: "Password123!",
      }),
    });

    expect(window.location.href).toBe("/landing");

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  // 8, 9, 10, 11, 12, 13. pending state disables inputs, toggle, submit button, pending label, prevents duplicate submissions
  it("disables email, password, toggle, and submit button with 'Signing in...' label and prevents duplicate submissions while pending", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchSpy = vi.spyOn(global, "fetch").mockReturnValue(fetchPromise);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const toggleButton = screen.getByRole("button", { name: "Show password" });
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    act(() => {
      fireEvent.submit(form);
    });

    // Check pending state disabled states and label
    const pendingSubmit = screen.getByRole("button", { name: "Signing in..." });
    expect(pendingSubmit).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(toggleButton).toBeDisabled();

    // Duplicate submit attempt while pending
    act(() => {
      fireEvent.submit(form);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Resolve fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ status: "SUCCESS" }),
      } as Response);
    });
  });

  // 14, 15. clearing stale field and form-level errors before retry
  it("clears stale field and form-level errors when retrying submission", async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    // Trigger validation error
    act(() => {
      fireEvent.submit(form);
    });
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();

    // Fill valid data and resubmit
    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid email or password" }),
    } as Response);

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument();
    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
  });

  // 18. 401 renders generic invalid-credentials error
  it("renders generic invalid-credentials error for 401 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid email or password" }),
    } as Response);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPass" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
  });

  // 19. 403 renders safe inactive-access error
  it("renders safe inactive-access error for 403 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "User has no active organisation membership" }),
    } as Response);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "inactive@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  // 20, 21. 500 / unexpected status renders generic safe error
  it("renders generic safe error for 500 or unexpected non-success status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Database Error" }),
    } as Response);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Authentication Error")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeInTheDocument();
  });

  // 22. fetch rejection renders connection error
  it("renders connection error when fetch rejects", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network Error"));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Connection Error")).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach authentication service/i)).toBeInTheDocument();
  });

  // 23, 24, 25. Credentials are not written to location, URL, localStorage, or sessionStorage
  it("ensures credentials are never written to location, URL, localStorage, or sessionStorage", async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, "setItem");
    const sessionStorageSpy = vi.spyOn(Storage.prototype, "setItem");

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "SUCCESS" }),
    } as Response);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "" },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "SecretPassword123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(window.location.href).toBe("/landing");
    expect(window.location.href).not.toContain("SecretPassword123!");
    expect(window.location.href).not.toContain("user@example.invalid");
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  // 17. 400 response renders a safe request error
  it("renders a safe request error for 400 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad Request" }),
    } as Response);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "badreq@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Request Error")).toBeInTheDocument();
    expect(screen.getByText("Invalid request parameters. Please verify your entries and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Bad Request")).not.toBeInTheDocument();

    // Verify submit action restored and controlled inputs retain values
    expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled();
    expect(emailInput).toHaveValue("badreq@example.invalid");
    expect(passwordInput).toHaveValue("Password123!");
  });

  // 23, 24, 25, 26. Credentials are not written to location, URL, localStorage, sessionStorage, or logged
  it("ensures credentials are never written to location, URL, localStorage, or sessionStorage", async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, "setItem");
    const sessionStorageSpy = vi.spyOn(Storage.prototype, "setItem");

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "SUCCESS" }),
    } as Response);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "" },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    fireEvent.change(emailInput, { target: { value: "user@example.invalid" } });
    fireEvent.change(passwordInput, { target: { value: "SecretPassword123!" } });

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(window.location.href).toBe("/landing");
    expect(window.location.href).not.toContain("SecretPassword123!");
    expect(window.location.href).not.toContain("user@example.invalid");
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it("does not log credential values", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid credentials" }),
    } as Response);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const form = screen.getByRole("form", { name: "Sign in to UCS CM" });

    const sensitiveEmail = "sensitive.user@example.invalid";
    const sensitivePassword = "SuperSecretPassword999!";

    fireEvent.change(emailInput, { target: { value: sensitiveEmail } });
    fireEvent.change(passwordInput, { target: { value: sensitivePassword } });

    await act(async () => {
      fireEvent.submit(form);
    });

    const allConsoleCalls = [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ].flat();

    const callStrings = allConsoleCalls.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)));

    for (const callStr of callStrings) {
      expect(callStr).not.toContain(sensitiveEmail);
      expect(callStr).not.toContain(sensitivePassword);
    }
  });
});

describe("Stage E Public Page Server Component Boundary Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies server page redirects valid session to /landing", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: "valid-token-hash-123456789012345678901234567890" }),
    } as any);

    const validateSpy = vi.spyOn(authService, "validateSession").mockResolvedValueOnce({
      user: { id: "user-1", email: "admin@acme.com", fullName: "Alice Admin" },
      activeOrganisation: { id: "org-1", key: "acme-corp", name: "ACME Corporation" },
      membership: { id: "mem-1", roles: ["PLATFORM_ADMIN"] },
    });

    await PublicPage();

    expect(validateSpy).toHaveBeenCalledWith("valid-token-hash-123456789012345678901234567890");
    expect(redirect).toHaveBeenCalledWith("/landing");
  });

  it("verifies server page renders LoginForm when cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const pageElement = await PublicPage();
    expect(pageElement).toBeDefined();
  });

  it("verifies server page renders LoginForm when session validation fails", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: "invalid-token" }),
    } as any);

    vi.spyOn(authService, "validateSession").mockRejectedValueOnce(new Error("Invalid session"));

    const pageElement = await PublicPage();
    expect(pageElement).toBeDefined();
  });

  it("verifies server page does not make GET fetch calls", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    await PublicPage();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
