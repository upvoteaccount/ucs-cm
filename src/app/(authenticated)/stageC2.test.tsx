// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AuthenticatedLayout from "./layout";
import LandingPage from "./landing/page";
import ForbiddenPage from "./forbidden/page";
import Loading from "./loading";
import NotFound from "../not-found";
import GlobalError from "../error";
import { AppShell } from "../components/ui";

describe("Stage C2 Static Authenticated Shell Composition Suite", () => {
  describe("Authenticated Shell Composition", () => {
    it("renders AppShell banner and main landmarks with exactly one UserMenu in the Header", () => {
      render(
        <AuthenticatedLayout>
          <LandingPage />
        </AuthenticatedLayout>
      );

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
      expect(screen.getByRole("button", { name: /User menu for Aarav Mehta/i })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /User menu for Aarav Mehta/i })).toHaveLength(1);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("renders pending state in Header UserMenu when isSignOutPending is true", async () => {
      const user = userEvent.setup();
      const mockSignOut = vi.fn();

      render(
        <AppShell
          headerProps={{
            user: { id: "user-1", displayName: "Aarav Mehta", email: "aarav@example.invalid" },
            organisation: { id: "org-1", name: "Acme Financial Services" },
            roles: ["PLATFORM_ADMIN"],
            onSignOut: mockSignOut,
            isSignOutPending: true,
            signOutPendingText: "Signing out...",
          }}
        >
          <div>Main Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Aarav Mehta/i });
      expect(trigger).toBeDisabled();

      // Open menu
      trigger.focus();
      await user.click(trigger);
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe("Forbidden Screen (/forbidden)", () => {
    it("renders forbidden access alert, heading, and return link inside authenticated shell", () => {
      render(
        <AuthenticatedLayout>
          <ForbiddenPage />
        </AuthenticatedLayout>
      );

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
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
    it("renders polite status landmark with loading text inside authenticated layout", () => {
      render(
        <AuthenticatedLayout>
          <Loading />
        </AuthenticatedLayout>
      );

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
      expect(screen.getByText("Loading session context...")).toBeInTheDocument();
    });
  });
});
