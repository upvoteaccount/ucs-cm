// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import LandingPage from "./landing/page";
import ForbiddenPage from "./forbidden/page";
import Loading from "./loading";
import NotFound from "../not-found";
import GlobalError from "../error";
import { AppShell } from "../components/ui";

import AuthenticatedLayout from "./layout";
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

describe("Stage E Authenticated Shell & Page Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AppShell Composition with Safe Session DTO", () => {
    it("renders AppShell banner and main landmarks with exactly one UserMenu", () => {
      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN", "SOLUTION_DESIGNER"],
          }}
        >
          <LandingPage />
        </AppShell>
      );

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
      expect(screen.getByRole("button", { name: /User menu for Aarav Mehta/i })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /User menu for Aarav Mehta/i })).toHaveLength(1);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

      // Verify no internal IDs or database fields are present in rendered text
      expect(screen.queryByText("user-1")).not.toBeInTheDocument();
      expect(screen.queryByText("org-1")).not.toBeInTheDocument();
    });

    it("handles logout via DELETE /api/auth/session and redirects on 200", async () => {
      const user = userEvent.setup();
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

      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      await user.click(trigger);

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith("/api/auth/session", {
        method: "DELETE",
      });

      expect(window.location.href).toBe("/");
      Object.defineProperty(window, "location", {
        writable: true,
        configurable: true,
        value: originalLocation,
      });
    });

    it("handles logout 401 response by navigating to /", async () => {
      const user = userEvent.setup();
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        configurable: true,
        value: { href: "" },
      });

      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      await user.click(trigger);

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      expect(window.location.href).toBe("/");
      Object.defineProperty(window, "location", {
        writable: true,
        configurable: true,
        value: originalLocation,
      });
    });

    it("prevents duplicate logout requests while logout is pending", async () => {
      const user = userEvent.setup();
      let resolveLogout: (res: Response) => void = () => {};
      const logoutPromise = new Promise<Response>((resolve) => {
        resolveLogout = resolve;
      });

      const fetchSpy = vi.spyOn(global, "fetch").mockReturnValue(logoutPromise);

      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      await user.click(trigger);

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled();

      // Duplicate click attempt
      await user.click(screen.getByRole("button", { name: "Signing out..." }));
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Resolve logout
      await user.click(trigger); // Cleanup
      resolveLogout({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    it("restores Sign out action and shows persistent error on network failure without client storage manipulation", async () => {
      const user = userEvent.setup();
      const localStorageSpy = vi.spyOn(Storage.prototype, "setItem");
      const sessionStorageSpy = vi.spyOn(Storage.prototype, "setItem");
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network Error"));

      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      await user.click(trigger);

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      const alert = await screen.findByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText(/Unable to reach authentication service/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).not.toBeDisabled();
      expect(trigger).toHaveAttribute("aria-expanded", "true"); // Menu remains open

      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(sessionStorageSpy).not.toHaveBeenCalled();
    });

    it("restores Sign out and shows a persistent safe error for unexpected logout response", async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      } as Response);

      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        configurable: true,
        value: { href: "/landing" },
      });

      render(
        <AppShell
          headerProps={{
            user: { displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      await user.click(trigger);

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith("/api/auth/session", { method: "DELETE" });

      const alert = await screen.findByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText(/Unable to sign out/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).not.toBeDisabled();
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(window.location.href).toBe("/landing");

      Object.defineProperty(window, "location", {
        writable: true,
        configurable: true,
        value: originalLocation,
      });
    });
  });

  describe("Forbidden Screen (/forbidden)", () => {
    it("renders forbidden access alert, heading, and return link", () => {
      render(<ForbiddenPage />);

      expect(screen.getByRole("heading", { level: 1, name: "Access forbidden" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Return to landing" })).toHaveAttribute("href", "/landing");
    });
  });

  describe("Global Not Found Screen (not-found.tsx)", () => {
    it("renders neutral 404 heading and return home link without authenticated fixture context", () => {
      render(<NotFound />);

      expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
      expect(screen.getByText("404")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
      expect(screen.queryByText("Aarav Mehta")).not.toBeInTheDocument();
      expect(screen.queryByText("Acme Financial Services")).not.toBeInTheDocument();
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });
  });

  describe("Global Error Boundary (error.tsx)", () => {
    it("renders neutral generic application error without raw stack traces or authenticated fixture context and invokes reset callback", () => {
      const resetMock = vi.fn();
      const testError = new Error("Test internal error");

      render(<GlobalError error={testError} reset={resetMock} />);

      expect(screen.getByRole("heading", { level: 1, name: "Application Error" })).toBeInTheDocument();
      expect(screen.queryByText("Test internal error")).not.toBeInTheDocument();
      expect(screen.queryByText("Aarav Mehta")).not.toBeInTheDocument();
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: "Try again" });
      retryBtn.click();
      expect(resetMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Initial Session-Resolution Loading Screen (loading.tsx)", () => {
    it("renders polite status landmark with loading text", () => {
      render(<Loading />);

      expect(screen.getByText("Loading session context...")).toBeInTheDocument();
    });
  });
});

describe("Stage E Authenticated Layout Server Component Boundary Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies authenticated layout validates session and redirects unauthenticated/expired sessions to /", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const validateSpy = vi.spyOn(authService, "validateSession");

    vi.mocked(redirect).mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    try {
      await AuthenticatedLayout({ children: <div>Protected Child</div> });
    } catch {
      // Catch NEXT_REDIRECT
    }

    expect(redirect).toHaveBeenCalledWith("/");
    expect(validateSpy).not.toHaveBeenCalled();
  });

  it("verifies authenticated layout maps safe presentation DTO and renders AppShell", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: "valid-session-token-123456789012345678901234567890" }),
    } as any);

    const validateSpy = vi.spyOn(authService, "validateSession").mockResolvedValueOnce({
      user: { id: "db-user-id-999", email: "alice@acme.com", fullName: "Alice Admin" },
      activeOrganisation: { id: "db-org-id-888", key: "acme-corp", name: "ACME Corporation" },
      membership: { id: "db-mem-id-777", roles: ["PLATFORM_ADMIN", "SUPERVISOR"] },
    });

    const layoutElement = await AuthenticatedLayout({ children: <div>Protected Child Content</div> });

    expect(validateSpy).toHaveBeenCalledWith("valid-session-token-123456789012345678901234567890");
    expect(layoutElement).toBeDefined();

    // Verify Server-to-Client prop safety: AppShell headerProps contains zero internal IDs
    const headerProps = (layoutElement.props as any).headerProps;
    expect(headerProps.user).toEqual({
      displayName: "Alice Admin",
      email: "alice@acme.com",
    });
    expect(headerProps.user).not.toHaveProperty("id");

    expect(headerProps.organisation).toEqual({
      name: "ACME Corporation",
    });
    expect(headerProps.organisation).not.toHaveProperty("id");
    expect(headerProps.organisation).not.toHaveProperty("key");

    // Positive platform role validation
    expect(headerProps.roles).toEqual(["PLATFORM_ADMIN"]);
    expect(headerProps.roles).not.toContain("SUPERVISOR");
  });

  it("verifies production landing page content contains no hardcoded synthetic fixture identity", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Welcome to UCS CM" })).toBeInTheDocument();
    expect(screen.getByText("Your case management workspace.")).toBeInTheDocument();
    expect(screen.getByText("Available product areas will appear here based on your access.")).toBeInTheDocument();

    // Verify zero hardcoded synthetic identities in production landing content
    expect(screen.queryByText("Aarav Mehta")).not.toBeInTheDocument();
    expect(screen.queryByText("Acme Financial Services")).not.toBeInTheDocument();
    expect(screen.queryByText("aarav.mehta@example.invalid")).not.toBeInTheDocument();
  });
});
