/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { FormDesigner } from "./FormDesigner";
import { FieldInspector } from "./FieldInspector";
import { OverviewSection } from "./OverviewSection";
import { QueueManager } from "./QueueManager";
import { SolutionsListContainer } from "./SolutionsListContainer";
import * as studioApi from "./studio-api.client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("./studio-api.client", async () => {
  const actual = await vi.importActual<any>("./studio-api.client");
  return {
    ...actual,
    apiFetchQueues: vi.fn(),
    apiFetchEligibleUsers: vi.fn(),
    apiCreateQueue: vi.fn(),
    apiUpdateQueue: vi.fn(),
    apiDeleteQueue: vi.fn(),
    apiFetchSolutions: vi.fn(),
    apiFetchSolution: vi.fn(),
    apiFetchProperties: vi.fn(),
    apiFetchChoiceLists: vi.fn(),
    apiFetchForms: vi.fn(),
    apiFetchForm: vi.fn(),
  };
});

describe("Field Behaviour Review Issues Verification", () => {
  const mockQueues = [
    { id: "q-1", name: "SOL Maker", queueKey: "sol_maker" },
    { id: "q-2", name: "SOL Checker", queueKey: "sol_checker" },
  ];

  const mockProperty = {
    id: "prop-1",
    label: "Customer Name",
    localSymbolicName: "CUST_NAME",
    generatedTechnicalName: "SOL_CUST_NAME",
    storedDataType: "TEXT",
    formatPreset: "NONE",
    cardinality: "SINGLE",
  };

  const mockCaseViewForm = {
    id: "form-cv-1",
    formKey: "case_view",
    formType: "CASE_VIEW",
    name: "Case View Form",
    description: "Manage existing cases.",
  };

  const mockAggregate = {
    form: mockCaseViewForm,
    tabs: [
      { id: "tab-1", formId: "form-cv-1", tabKey: "tab_1", title: "General", displayOrder: 1 },
    ],
    sections: [
      { id: "sec-1", tabId: "tab-1", sectionKey: "sec_1", title: "Details", displayOrder: 1 },
    ],
    fields: [
      {
        id: "fref-1",
        sectionId: "sec-1",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        displayOrder: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
      },
    ],
    queueRules: [
      {
        fieldReferenceId: "fref-1",
        queueId: "q-2",
        isVisible: false,
        isEditable: false,
        isRequired: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Issue 1: Move Case View Queue selector into Field Inspector", () => {
    it("does not render top-of-canvas queue context bar in FormDesigner", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={mockAggregate}
          properties={[mockProperty]}
          choiceLists={[]}
          queues={mockQueues}
          onBackToLanding={vi.fn()}
        />
      );

      // Top-of-canvas bar must be absent
      expect(screen.queryByTestId("case-view-queue-context-bar")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Viewing Queue Context:")).not.toBeInTheDocument();

      // When no field is selected, empty inspector state is shown without queue selector
      expect(screen.getByTestId("field-inspector-empty")).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Queue$/i)).not.toBeInTheDocument();
    });

    it("renders Queue selector inside Field Inspector when field is selected", () => {
      const onSelectedQueueChange = vi.fn();
      const onQueueRuleChange = vi.fn();

      render(
        <FieldInspector
          formType="CASE_VIEW"
          field={mockAggregate.fields[0]}
          property={mockProperty}
          queues={mockQueues}
          selectedQueueId="q-1"
          onSelectedQueueChange={onSelectedQueueChange}
          queueRules={mockAggregate.queueRules}
          onQueueRuleChange={onQueueRuleChange}
        />
      );

      // Queue Behaviour section exists
      expect(screen.getByText("Queue Behaviour")).toBeInTheDocument();

      // Queue selector is rendered with label 'Queue'
      const queueSelectButton = screen.getByRole("combobox", { name: "Queue" });
      expect(queueSelectButton).toBeInTheDocument();
      expect(queueSelectButton).toHaveTextContent("SOL Maker (sol_maker)");

      // Checkboxes Visible, Editable, Mandatory are rendered with sparse defaults for q-1
      const visibleCb = screen.getByRole("checkbox", { name: /Visible/i });
      const editableCb = screen.getByRole("checkbox", { name: /Editable/i });
      const mandatoryCb = screen.getByRole("checkbox", { name: /Mandatory/i });

      expect(visibleCb).toBeChecked();
      expect(editableCb).toBeChecked();
      expect(mandatoryCb).not.toBeChecked();

      // Open select listbox and pick SOL Checker
      fireEvent.click(queueSelectButton);
      const optionChecker = screen.getByRole("option", { name: "SOL Checker (sol_checker)" });
      fireEvent.click(optionChecker);

      expect(onSelectedQueueChange).toHaveBeenCalledWith("q-2");
    });

    it("projects canvas field card behaviour for Queue selected in Inspector without dirtying form", () => {
      let isFormDirty = false;
      const setIsFormDirty = vi.fn((d) => {
        isFormDirty = d;
      });

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={mockAggregate}
          properties={[mockProperty]}
          choiceLists={[]}
          queues={mockQueues}
          onBackToLanding={vi.fn()}
          isFormDirty={isFormDirty}
          setIsFormDirty={setIsFormDirty}
        />
      );

      // Select field fref-1 by clicking its field card
      const fieldCard = screen.getByText("Customer Name").closest("[data-testid='field-card-fref-1']") ||
        screen.getByText("Customer Name").closest("div");
      fireEvent.click(fieldCard!);

      // Field Inspector is now open with q-1 selected by default (all defaults: visible, editable, optional)
      expect(screen.getByText("Queue Behaviour")).toBeInTheDocument();
      const queueSelectButton = screen.getByRole("combobox", { name: "Queue" });
      expect(queueSelectButton).toHaveTextContent("SOL Maker (sol_maker)");

      // Form must still be clean (queue selection does not dirty form)
      expect(screen.queryByText("Unsaved Edits")).not.toBeInTheDocument();

      // Switch queue in inspector to q-2 (SOL Checker) which has { isVisible: false, isEditable: false, isRequired: true }
      fireEvent.click(queueSelectButton);
      const optionChecker = screen.getByRole("option", { name: "SOL Checker (sol_checker)" });
      fireEvent.click(optionChecker);

      // Canvas field card now projects q-2 behaviour: Hidden, Read-only, Required
      expect(screen.getByText("Hidden")).toBeInTheDocument();
      expect(screen.getByText("Read-only")).toBeInTheDocument();
      expect(screen.getByText("Required")).toBeInTheDocument();

      // Still clean after switching queue!
      expect(screen.queryByText("Unsaved Edits")).not.toBeInTheDocument();
    });
  });

  describe("Issue 2: Fix stale Queue list after Queue mutations & safe fallback", () => {
    it("updates shared queue collection and preserves selected queue if still valid", () => {
      const TestContainer = () => {
        const [queues, setQueues] = useState(mockQueues);

        return (
          <div>
            <button
              onClick={() =>
                setQueues([
                  ...mockQueues,
                  { id: "q-3", name: "Test Queue", queueKey: "test_queue" },
                ])
              }
            >
              Add Queue
            </button>
            <FormDesigner
              solutionId="sol-1"
              expectedRevision={1}
              formAggregate={mockAggregate}
              properties={[mockProperty]}
              choiceLists={[]}
              queues={queues}
              onBackToLanding={vi.fn()}
            />
          </div>
        );
      };

      render(<TestContainer />);

      // Select field to show inspector
      fireEvent.click(screen.getByText("Customer Name"));
      const queueSelectButton = screen.getByRole("combobox", { name: "Queue" });
      expect(queueSelectButton).toHaveTextContent("SOL Maker (sol_maker)");

      // Select q-2
      fireEvent.click(queueSelectButton);
      fireEvent.click(screen.getByRole("option", { name: "SOL Checker (sol_checker)" }));
      expect(queueSelectButton).toHaveTextContent("SOL Checker (sol_checker)");

      // Simulate Queue creation updating shared studio queues without full browser refresh
      fireEvent.click(screen.getByText("Add Queue"));

      // q-2 was previously selected and still exists -> preserved!
      expect(queueSelectButton).toHaveTextContent("SOL Checker (sol_checker)");

      // New queue option is now available in inspector dropdown
      fireEvent.click(queueSelectButton);
      expect(screen.getByRole("option", { name: "Test Queue (test_queue)" })).toBeInTheDocument();
    });

    it("falls back deterministically to first available Queue when selected Queue is deleted", () => {
      const TestContainer = () => {
        const [queues, setQueues] = useState(mockQueues);

        return (
          <div>
            <button onClick={() => setQueues([mockQueues[0]])}>
              Delete Checker Queue
            </button>
            <FormDesigner
              solutionId="sol-1"
              expectedRevision={1}
              formAggregate={mockAggregate}
              properties={[mockProperty]}
              choiceLists={[]}
              queues={queues}
              onBackToLanding={vi.fn()}
            />
          </div>
        );
      };

      render(<TestContainer />);

      // Select field
      fireEvent.click(screen.getByText("Customer Name"));
      const queueSelectButton = screen.getByRole("combobox", { name: "Queue" });

      // Select q-2 (SOL Checker)
      fireEvent.click(queueSelectButton);
      fireEvent.click(screen.getByRole("option", { name: "SOL Checker (sol_checker)" }));
      expect(queueSelectButton).toHaveTextContent("SOL Checker (sol_checker)");

      // Delete q-2
      fireEvent.click(screen.getByText("Delete Checker Queue"));

      // Selected queue q-2 no longer exists -> falls back deterministically to q-1 (first available)
      expect(queueSelectButton).toHaveTextContent("SOL Maker (sol_maker)");
    });
  });

  describe("Issue 3: Fix React isInvalid DOM warning", () => {
    it("OverviewSection does not pass isInvalid to native textarea DOM element", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockSolution = {
        id: "sol-1",
        name: "Test Solution",
        solutionPrefix: "TST",
        description: "Initial description",
        status: "DRAFT",
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <OverviewSection
          solution={mockSolution}
          isLoading={false}
          onSaveSolution={vi.fn()}
          isDirty={false}
          setIsDirty={vi.fn()}
        />
      );

      const textarea = screen.getByLabelText("Solution Description");
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName.toLowerCase()).toBe("textarea");

      // Verify no isInvalid attribute exists on the DOM node
      expect(textarea).not.toHaveAttribute("isInvalid");
      expect(textarea).not.toHaveAttribute("isinvalid");

      // Verify React did not log unrecognized isInvalid prop warning
      const isInvalidWarning = consoleErrorSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("isInvalid"))
      );
      expect(isInvalidWarning).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("QueueManager does not pass isInvalid to native textarea elements", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (studioApi.apiFetchQueues as any).mockResolvedValue({
        queues: [{ id: "q-1", name: "Queue 1", queueKey: "queue_1", description: "Desc 1" }],
      });
      (studioApi.apiFetchEligibleUsers as any).mockResolvedValue({ users: [] });

      render(
        <QueueManager
          solutionId="sol-1"
          solutionRevision={1}
          onRevisionUpdate={vi.fn()}
          onApiError={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Queue 1")).toBeInTheDocument();
      });

      // Open Create Modal
      fireEvent.click(screen.getByRole("button", { name: "+ Add Queue" }));

      const textarea = screen.getByLabelText("Description");
      expect(textarea.tagName.toLowerCase()).toBe("textarea");
      expect(textarea).not.toHaveAttribute("isInvalid");
      expect(textarea).not.toHaveAttribute("isinvalid");

      const isInvalidWarning = consoleErrorSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("isInvalid"))
      );
      expect(isInvalidWarning).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("SolutionsListContainer create modal does not pass isInvalid to native textarea", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (studioApi.apiFetchSolutions as any).mockResolvedValue({
        solutions: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<SolutionsListContainer />);

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "+ Create Solution" })[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: "+ Create Solution" })[0]);

      const descTextarea = screen.getByLabelText("Description");
      expect(descTextarea.tagName.toLowerCase()).toBe("textarea");
      expect(descTextarea).not.toHaveAttribute("isInvalid");
      expect(descTextarea).not.toHaveAttribute("isinvalid");

      const isInvalidWarning = consoleErrorSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("isInvalid"))
      );
      expect(isInvalidWarning).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });
});
