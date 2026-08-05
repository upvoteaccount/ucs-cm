// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import {
  AppShell,
  Header,
  NavigationContainer,
  UserContext,
  OrganisationContext,
  RoleContext,
  Badge,
  UserMenu,
  ShellUser,
  ShellOrganisation,
  PlatformRole,
} from "./index";

const mockUser: ShellUser = {
  id: "usr_1",
  displayName: "Jane Doe",
  email: "jane.doe@example.invalid",
};

const mockOrg: ShellOrganisation = {
  id: "org_1",
  name: "Acme Corporation",
};

const mockRoles: PlatformRole[] = ["PLATFORM_ADMIN", "SOLUTION_DESIGNER"];

describe("Stage C1 Minimum Shell Primitives Suite", () => {
  describe("SkipLink", () => {
    it("renders SkipLink before header trigger in DOM order, exactly one banner landmark, and target href", () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const skipLink = screen.getByRole("link", { name: "Skip to main content" });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
      expect(skipLink.className).toContain("ucs-skip-link");

      const header = screen.getByRole("banner");
      expect(skipLink.compareDocumentPosition(header)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe("AppShell Primitive", () => {
    it("renders SkipLink before header trigger in DOM order, exactly one banner landmark, and one main landmark with id='main-content'", () => {
      render(
        <AppShell headerProps={{ user: mockUser, organisation: mockOrg }}>
          <div>Main Dashboard Content</div>
        </AppShell>
      );

      const skipLink = screen.getByRole("link", { name: "Skip to main content" });
      const banner = screen.getByRole("banner");
      const main = screen.getByRole("main");

      expect(skipLink.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getAllByRole("banner")).toHaveLength(1);
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(main).toHaveAttribute("id", "main-content");
      expect(screen.getByText("Main Dashboard Content")).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
  });

  describe("Header Primitive", () => {
    it("displays product name, active organisation, user menu, and supports absent navigation without empty nav element", () => {
      render(<Header user={mockUser} organisation={mockOrg} roles={mockRoles} />);

      expect(screen.getByText("UCS CM")).toBeInTheDocument();
      expect(screen.getAllByText("Acme Corporation").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: /User menu for Jane Doe/i })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
  });

  describe("NavigationContainer Primitive", () => {
    it("renders semantic nav with accessible label when children are provided and supports aria-current", () => {
      render(
        <NavigationContainer aria-label="Main Navigation">
          <a href="/cases" aria-current="page">Cases</a>
          <a href="/queues">Queues</a>
        </NavigationContainer>
      );

      const nav = screen.getByRole("navigation", { name: "Main Navigation" });
      expect(nav).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Queues" })).not.toHaveAttribute("aria-current");
    });

    it("renders no DOM output when no children are supplied", () => {
      const { container } = render(<NavigationContainer />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
  });

  describe("UserContext Primitive", () => {
    it("displays user name and optionally email while preserving title tooltip and accessible aria-label", () => {
      const { rerender } = render(<UserContext user={mockUser} />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.queryByText("jane.doe@example.invalid")).not.toBeInTheDocument();
      expect(screen.queryByText("usr_1")).not.toBeInTheDocument();

      rerender(<UserContext user={mockUser} showEmail />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane.doe@example.invalid")).toBeInTheDocument();
      expect(screen.getByLabelText("Jane Doe (jane.doe@example.invalid)")).toBeInTheDocument();
      expect(screen.queryByText("usr_1")).not.toBeInTheDocument();
    });
  });

  describe("OrganisationContext Primitive", () => {
    it("displays active organisation name without selector affordances or internal IDs", () => {
      render(<OrganisationContext organisation={mockOrg} />);

      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      expect(screen.queryByText("org_1")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("RoleContext and Badge Primitives", () => {
    it("maps platform roles to readable user-facing labels", () => {
      render(<RoleContext roles={["PLATFORM_ADMIN", "RUNTIME_USER"]} />);

      expect(screen.getByText("Platform Administrator")).toBeInTheDocument();
      expect(screen.getByText("Runtime User")).toBeInTheDocument();
    });

    it("renders Badge variants correctly", () => {
      render(
        <div>
          <Badge variant="primary">Admin</Badge>
          <Badge variant="info">Designer</Badge>
        </div>
      );

      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });
  });

  describe("UserMenu Primitive", () => {
    it("starts closed, links aria-controls to panel, opens via click, closes via Escape and outside click, and fires onSignOut", async () => {
      const user = userEvent.setup();
      const onSignOutMock = vi.fn();

      render(
        <div>
          <button type="button">Outside Element</button>
          <UserMenu
            user={mockUser}
            organisation={mockOrg}
            roles={mockRoles}
            onSignOut={onSignOutMock}
          />
        </div>
      );

      const trigger = screen.getByRole("button", { name: /User menu for Jane Doe/i });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      const controlsId = trigger.getAttribute("aria-controls");
      expect(controlsId).toBeTruthy();

      // Open via click
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      const panel = screen.getByRole("region", { name: "User Account Menu" });
      expect(panel).toHaveAttribute("id", controlsId!);
      expect(screen.getByText("jane.doe@example.invalid")).toBeInTheDocument();
      expect(screen.getByText("Platform Administrator")).toBeInTheDocument();

      // Close via outside click
      const outsideBtn = screen.getByRole("button", { name: "Outside Element" });
      await user.click(outsideBtn);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("region", { name: "User Account Menu" })).not.toBeInTheDocument();

      // Open via Enter key
      trigger.focus();
      await user.keyboard("{Enter}");
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      // Close via Escape key
      await user.keyboard("{Escape}");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveFocus();

      // Re-open and click Sign out button
      await user.click(trigger);
      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);
      expect(onSignOutMock).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });
});
