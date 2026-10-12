// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { SolutionsListContainer } from "./SolutionsListContainer";
import { LandingPageContent } from "@/app/(authenticated)/landing/page";
import * as studioApiClient from "./studio-api.client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("INC-03C7 Redesigned Solution List & Entry Flow Test Suite", () => {
  const mockSolutions = [
    {
      id: "sol-1",
      name: "Customer Support Case Management",
      description: "Handles customer support tickets.",
      solutionPrefix: "CSM",
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sol-2",
      name: "Human Resources Onboarding",
      description: "Manages employee onboarding.",
      solutionPrefix: "HRO",
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sol-3",
      name: "Financial Audit Tracking",
      description: "Monitors internal compliance and audits.",
      solutionPrefix: "FAT",
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    },
  ];

  it("renders Create Solution action in main heading row with no full-width bar", async () => {
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1, name: "Design Studio Solutions" });
      expect(heading).toBeInTheDocument();
      expect(screen.getByText("Manage and configure your Solutions.")).toBeInTheDocument();
    });

    // Secondary navigation
    const backLink = screen.getByRole("link", { name: "← Back to Workspaces" });
    expect(backLink).toHaveAttribute("href", "/landing");

    // Primary CTA in heading row
    const createBtn = screen.getByRole("button", { name: /\+ Create Solution/i });
    expect(createBtn).toBeInTheDocument();

    // Confirm Create Solution action lives in header element alongside heading
    const headerElement = screen.getByText("Design Studio Solutions").closest("header");
    expect(headerElement).toContainElement(createBtn);

    // Confirm exactly ONE Create Solution trigger button exists on the page
    const allCreateBtns = screen.getAllByRole("button", { name: /\+ Create Solution/i });
    expect(allCreateBtns).toHaveLength(1);
  });

  it("renders Cards view as default with stable card IDs and compact hierarchy", async () => {
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("solution-card-sol-1")).toBeInTheDocument();
      expect(screen.getByTestId("solution-card-sol-2")).toBeInTheDocument();
      expect(screen.getByTestId("solution-card-sol-3")).toBeInTheDocument();
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
      expect(screen.getByText("CSM")).toBeInTheDocument();
    });

    const openLinks = screen.getAllByRole("link", { name: /^Open Solution →$/i });
    expect(openLinks[0]).toHaveAttribute("href", "/studio/solutions/sol-1");
  });

  it("filters solutions by name, prefix, and description (case-insensitive) via search field", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const searchInput = screen.getByRole("textbox", { name: "Search solutions" });

    // Filter by name (case-insensitive)
    await user.type(searchInput, "human");
    expect(screen.getByText("Human Resources Onboarding")).toBeInTheDocument();
    expect(screen.queryByText("Customer Support Case Management")).not.toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    await user.click(clearBtn);
    expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();

    // Filter by prefix
    await user.type(searchInput, "fat");
    expect(screen.getByText("Financial Audit Tracking")).toBeInTheDocument();
    expect(screen.queryByText("Human Resources Onboarding")).not.toBeInTheDocument();

    await user.clear(searchInput);

    // Filter by description
    await user.type(searchInput, "tickets");
    expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    expect(screen.queryByText("Financial Audit Tracking")).not.toBeInTheDocument();
  });

  it("renders distinct 'No Solutions match your search' state with Clear Search button", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const searchInput = screen.getByRole("textbox", { name: "Search solutions" });
    await user.type(searchInput, "nonexistentquery123");

    expect(screen.getByText("No Solutions match your search.")).toBeInTheDocument();

    const clearSearchBtn = screen.getByRole("button", { name: "Clear Search" });
    await user.click(clearSearchBtn);

    expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
  });

  it("renders distinct true empty organisation state ('No Solutions yet') when org has 0 solutions", async () => {
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: [],
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("No Solutions yet")).toBeInTheDocument();
      expect(screen.getByText(/Create your first Solution to begin configuring/)).toBeInTheDocument();
    });

    // Ensure search bar is not shown for 0 org solutions
    expect(screen.queryByRole("textbox", { name: "Search solutions" })).not.toBeInTheDocument();
  });

  it("supports compact keyboard-accessible Cards and List view toggle", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const listToggleBtn = screen.getByRole("button", { name: /^List$/i });
    await user.click(listToggleBtn);

    // Verify table layout rendered in List view
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Solution")).toBeInTheDocument();

    const cardsToggleBtn = screen.getByRole("button", { name: /^Cards$/i });
    await user.click(cardsToggleBtn);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders Create Solution modal with single footer and focus retention while typing", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /\+ Create Solution/i });
    await user.click(createBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Solution Name/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(nameInput);
    });

    await user.type(nameInput, "New Solution");
    expect(document.activeElement).toBe(nameInput);

    const cancelButtons = screen.getAllByRole("button", { name: /^Cancel$/i });
    expect(cancelButtons).toHaveLength(1);
  });

  it("resets form state and draft on Cancel and reopening modal", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /\+ Create Solution/i });
    await user.click(createBtn);

    const nameInput = screen.getByLabelText(/Solution Name/i);
    fireEvent.change(nameInput, { target: { value: "Draft Solution" } });

    const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Reopen modal
    await user.click(createBtn);

    const freshNameInput = screen.getByLabelText(/Solution Name/i);
    expect(freshNameInput).toHaveValue("");
  });

  it("displays duplicate prefix conflict error (HTTP 409) in Create Solution modal without closing", async () => {
    const user = userEvent.setup();
    vi.spyOn(studioApiClient, "apiFetchSolutions").mockResolvedValue({
      solutions: mockSolutions,
    });

    vi.spyOn(studioApiClient, "apiCreateSolutionMain").mockRejectedValue({
      status: 409,
      code: "DUPLICATE_PREFIX",
      message: 'Prefix "CSM" is already in use by another Solution.',
    });

    render(<SolutionsListContainer />);

    await waitFor(() => {
      expect(screen.getByText("Customer Support Case Management")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /\+ Create Solution/i });
    await user.click(createBtn);

    const nameInput = screen.getByLabelText(/Solution Name/i);
    fireEvent.change(nameInput, { target: { value: "Customer Support" } });

    const submitBtn = screen.getByRole("button", { name: /^Create Solution$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Prefix "CSM" is already in use/)).toBeInTheDocument();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  describe("Landing Page Role-Aware Entry Cards", () => {
    it("authorised Studio roles see Design Studio entry card navigating to /studio/solutions", () => {
      render(<LandingPageContent roles={["SOLUTION_DESIGNER"]} />);

      expect(screen.getByText("Design Studio")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open Design Studio" })).toHaveAttribute("href", "/studio/solutions");
      expect(screen.queryByText("Runtime Portal")).not.toBeInTheDocument();
    });

    it("runtime-only users do not see Design Studio entry card", () => {
      render(<LandingPageContent roles={["RUNTIME_USER"]} />);

      expect(screen.queryByText("Design Studio")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Open Design Studio" })).not.toBeInTheDocument();
      expect(screen.getByText("Runtime Portal")).toBeInTheDocument();
    });

    it("users with both Studio and Runtime access see both destinations", () => {
      render(<LandingPageContent roles={["SOLUTION_DESIGNER", "RUNTIME_USER"]} />);

      expect(screen.getByText("Design Studio")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open My Solutions" })).toHaveAttribute("href", "/solutions");
      expect(screen.queryByText("Runtime Portal (Unavailable in INC-03)")).not.toBeInTheDocument();
    });
  });
});
