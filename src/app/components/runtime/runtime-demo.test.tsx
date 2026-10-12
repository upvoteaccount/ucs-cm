// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CaseViewRuntimeForm } from "./CaseViewRuntimeForm";
import { NavigatorContainer } from "./NavigatorContainer";
import { InBasketContainer } from "./InBasketContainer";
import { WidProcessingContainer } from "./WidProcessingContainer";
import { CreateCaseContainer } from "./CreateCaseContainer";
import { SearchContainer } from "./SearchContainer";
import { RuntimeSolutionsList } from "./RuntimeSolutionsList";
import { FormAggregate, SolutionPropertyRow } from "@/modules/solution/index";
import { DemoCaseData } from "@/demo-runtime/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Client Demo Runtime Slice", () => {
  const mockProperties: SolutionPropertyRow[] = [
    {
      id: "prop-first-name",
      solutionId: "sol-1",
      localSymbolicName: "firstName",
      generatedTechnicalName: "PLA_FIRST_NAME",
      label: "First Name",
      storedDataType: "TEXT",
      formatPreset: "NONE",
      choiceListId: null,
      cardinality: "SINGLE",
      defaultValue: null,
      helpText: "Applicant given name",
      isSensitive: false,
      defaultControlType: "TEXT_INPUT",
      validationRules: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prop-loan-amount",
      solutionId: "sol-1",
      localSymbolicName: "loanAmount",
      generatedTechnicalName: "PLA_LOAN_AMOUNT",
      label: "Loan Amount",
      storedDataType: "NUMBER",
      formatPreset: "NONE",
      choiceListId: null,
      cardinality: "SINGLE",
      defaultValue: "500000",
      helpText: "Applied amount",
      isSensitive: false,
      defaultControlType: "NUMBER_INPUT",
      validationRules: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prop-verification-notes",
      solutionId: "sol-1",
      localSymbolicName: "verificationNotes",
      generatedTechnicalName: "PLA_VERIFICATION_NOTES",
      label: "Checker Verification Notes",
      storedDataType: "TEXT",
      formatPreset: "NONE",
      choiceListId: null,
      cardinality: "SINGLE",
      defaultValue: null,
      helpText: "Internal notes for verification",
      isSensitive: false,
      defaultControlType: "TEXTAREA",
      validationRules: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCaseViewFormAggregate: FormAggregate = {
    form: {
      id: "form-case-view",
      solutionId: "sol-1",
      formType: "CASE_VIEW",
      formKey: "PLA_CASE_VIEW",
      key: "PLA_CASE_VIEW",
      name: "Case View Form",
      description: "Demo Case View Form",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tabs: [
      {
        id: "tab-1",
        formId: "form-case-view",
        key: "DETAILS",
        title: "Loan Application Details",
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    sections: [
      {
        id: "sec-1",
        formId: "form-case-view",
        tabId: "tab-1",
        key: "APPLICANT_INFO",
        title: "Applicant Information",
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    fields: [
      {
        id: "field-first-name",
        solutionId: "sol-1",
        formId: "form-case-view",
        sectionId: "sec-1",
        propertyId: "prop-first-name",
        controlType: "TEXT_INPUT",
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        isRequired: false,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "field-loan-amount",
        solutionId: "sol-1",
        formId: "form-case-view",
        sectionId: "sec-1",
        propertyId: "prop-loan-amount",
        controlType: "NUMBER_INPUT",
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        isRequired: false,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "field-verification-notes",
        solutionId: "sol-1",
        formId: "form-case-view",
        sectionId: "sec-1",
        propertyId: "prop-verification-notes",
        controlType: "TEXTAREA",
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        isRequired: false,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    queueRules: [
      // SOL Maker Queue Rules (Queue ID: q-maker):
      // - First Name: Editable, Visible
      // - Loan Amount: Editable, Mandatory
      // - Verification Notes: HIDDEN
      {
        id: "rule-maker-first-name",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-first-name",
        queueId: "q-maker",
        isVisible: true,
        isEditable: true,
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-maker-loan-amount",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-loan-amount",
        queueId: "q-maker",
        isVisible: true,
        isEditable: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-maker-notes",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-verification-notes",
        queueId: "q-maker",
        isVisible: false, // HIDDEN IN SOL MAKER!
        isEditable: false,
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // SOL Checker Queue Rules (Queue ID: q-checker):
      // - First Name: READ-ONLY
      // - Loan Amount: READ-ONLY
      // - Verification Notes: VISIBLE & MANDATORY
      {
        id: "rule-checker-first-name",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-first-name",
        queueId: "q-checker",
        isVisible: true,
        isEditable: false, // READ-ONLY IN SOL CHECKER!
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-checker-loan-amount",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-loan-amount",
        queueId: "q-checker",
        isVisible: true,
        isEditable: false, // READ-ONLY IN SOL CHECKER!
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-checker-notes",
        solutionId: "sol-1",
        formId: "form-case-view",
        fieldReferenceId: "field-verification-notes",
        queueId: "q-checker",
        isVisible: true, // VISIBLE IN SOL CHECKER!
        isEditable: true,
        isRequired: true, // MANDATORY IN SOL CHECKER!
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockAddCaseFormAggregate: FormAggregate = {
    form: {
      id: "form-add-case",
      solutionId: "sol-1",
      formType: "ADD_CASE",
      formKey: "PLA_ADD_CASE",
      key: "PLA_ADD_CASE",
      name: "Add Case Form",
      description: "Demo Add Case Form from Studio metadata",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tabs: [
      {
        id: "add-tab-1",
        formId: "form-add-case",
        key: "APPLICANT_DETAILS",
        title: "Intake",
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    sections: [
      {
        id: "add-sec-1",
        formId: "form-add-case",
        tabId: "add-tab-1",
        key: "MAIN_INFO",
        title: "Application Intake Details",
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    fields: [
      {
        id: "add-field-1",
        solutionId: "sol-1",
        formId: "form-add-case",
        sectionId: "add-sec-1",
        propertyId: "prop-first-name",
        controlType: "TEXT_INPUT",
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        isRequired: true, // MANDATORY IN ADD CASE
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "add-field-2",
        solutionId: "sol-1",
        formId: "form-add-case",
        sectionId: "add-sec-1",
        propertyId: "prop-loan-amount",
        controlType: "NUMBER_INPUT",
        isVisible: true,
        isEnabled: true,
        isEditable: false, // READ-ONLY IN ADD CASE
        isRequired: false,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "add-field-3",
        solutionId: "sol-1",
        formId: "form-add-case",
        sectionId: "add-sec-1",
        propertyId: "prop-verification-notes",
        controlType: "TEXTAREA",
        isVisible: false, // HIDDEN IN ADD CASE
        isEnabled: true,
        isEditable: true,
        isRequired: false,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    queueRules: [],
  };

  const mockAvailableQueues = [
    { id: "q-maker", name: "SOL Maker", queueKey: "PLA_SOL_MAKER" },
    { id: "q-checker", name: "SOL Checker", queueKey: "PLA_SOL_CHECKER" },
  ];

  const mockDemoCase: DemoCaseData = {
    caseId: "PLA-2026-00892",
    customerName: "Rajesh Kumar Sharma",
    receivedDate: "Today, 09:15 AM",
    assignedQueueKey: "PLA_SOL_MAKER",
    assignedQueueName: "SOL Maker",
    values: {
      firstName: "Rajesh",
      loanAmount: "750000",
      verificationNotes: "Maker review finished.",
    },
    documents: [
      {
        id: "doc-1",
        name: "Aadhaar Card.pdf",
        type: "application/pdf",
        size: "1.2 MB",
        pageCount: 2,
        uploadedAt: "Today, 09:12 AM",
        documentType: "AADHAAR",
        fileUrl: "/demo-documents/private/aadhaar.pdf",
        isAvailable: true,
      },
      {
        id: "doc-2",
        name: "PAN Card.png",
        type: "image/png",
        size: "840 KB",
        pageCount: 1,
        uploadedAt: "Today, 09:14 AM",
        documentType: "PAN",
        fileUrl: "/demo-documents/private/pan.png",
        isAvailable: true,
      },
      {
        id: "doc-3",
        name: "Passport.pdf",
        type: "application/pdf",
        size: "2.1 MB",
        pageCount: 1,
        uploadedAt: "Today, 09:15 AM",
        documentType: "OTHER",
        fileUrl: "",
        isAvailable: false,
      },
      {
        id: "doc-4",
        name: "Employment Verification.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: "185 KB",
        pageCount: 2,
        uploadedAt: "Today, 09:18 AM",
        documentType: "WORD",
        fileUrl: "/demo-documents/employment-verification.docx",
        isAvailable: true,
      },
      {
        id: "doc-5",
        name: "Amortization Schedule.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: "95 KB",
        pageCount: 1,
        uploadedAt: "Today, 09:20 AM",
        documentType: "EXCEL",
        fileUrl: "/demo-documents/amortization-schedule.xlsx",
        isAvailable: true,
      },
      {
        id: "doc-6",
        name: "Diagnostic Log.bin",
        type: "application/octet-stream",
        size: "45 KB",
        pageCount: 1,
        uploadedAt: "Today, 09:22 AM",
        documentType: "OTHER",
        fileUrl: "/demo-documents/diagnostic-log.bin",
        isAvailable: true,
      },
    ],
  };

  describe("Case View Form Queue-Specific Field Behaviour", () => {
    it("hides fields configured as isVisible: false for the active queue (SOL Maker)", () => {
      render(
        <CaseViewRuntimeForm
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          activeQueueId="q-maker"
          activeQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
          initialValues={mockDemoCase.values}
        />
      );

      // In SOL Maker: First Name and Loan Amount are visible
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Loan Amount/i)).toBeInTheDocument();

      // In SOL Maker: Verification Notes is HIDDEN and NOT rendered
      expect(screen.queryByLabelText(/Checker Verification Notes/i)).not.toBeInTheDocument();
    });

    it("makes fields read-only when configured as isEditable: false for the active queue (SOL Checker)", () => {
      render(
        <CaseViewRuntimeForm
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          activeQueueId="q-checker"
          activeQueueName="SOL Checker"
          availableQueues={mockAvailableQueues}
          initialValues={mockDemoCase.values}
        />
      );

      // In SOL Checker: First Name is READ-ONLY
      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toBeDisabled();

      // In SOL Checker: Loan Amount is READ-ONLY
      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      expect(loanAmountInput).toBeDisabled();

      // In SOL Checker: Verification Notes is now VISIBLE and EDITABLE
      const notesInput = screen.getByLabelText(/Checker Verification Notes/i);
      expect(notesInput).toBeInTheDocument();
      expect(notesInput).not.toBeDisabled();
    });

    it("shows mandatory asterisk for fields marked as isRequired: true", () => {
      render(
        <CaseViewRuntimeForm
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          activeQueueId="q-maker"
          activeQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
          initialValues={mockDemoCase.values}
        />
      );

      // In SOL Maker: Loan Amount is mandatory
      const loanAmountLabel = screen.getByText("Loan Amount");
      expect(loanAmountLabel.parentElement).toHaveTextContent("*");

      // In SOL Maker: First Name is optional
      const firstNameLabel = screen.getByText("First Name");
      expect(firstNameLabel.parentElement).not.toHaveTextContent("*");
    });
  });

  describe("Create Case Driven by Configured Add Case Form", () => {
    it("dynamically renders Add Case form aggregate and respects visibility, editability, and required rules", () => {
      render(
        <CreateCaseContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          formAggregate={mockAddCaseFormAggregate}
          properties={mockProperties}
        />
      );

      // Visible and mandatory field
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      const firstNameLabel = screen.getByText("First Name");
      expect(firstNameLabel.parentElement).toHaveTextContent("*");

      // Visible but read-only field
      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      expect(loanAmountInput).toBeInTheDocument();
      expect(loanAmountInput).toBeDisabled();

      // Hidden field in ADD_CASE must NOT be rendered
      expect(screen.queryByLabelText(/Checker Verification Notes/i)).not.toBeInTheDocument();

      // Does not contain obsolete hardcoded fields (e.g. arbitrary PAN, Phone, Email if not in form)
      expect(screen.queryByLabelText(/PAN Number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Phone Number/i)).not.toBeInTheDocument();
    });

    it("submits the form to create a new case and navigates to the work item", () => {
      render(
        <CreateCaseContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          formAggregate={mockAddCaseFormAggregate}
          properties={mockProperties}
        />
      );

      const firstNameInput = screen.getByLabelText(/First Name/i);
      fireEvent.change(firstNameInput, { target: { value: "Aarav" } });

      const submitBtn = screen.getByRole("button", { name: /Create Case & Open/i });
      fireEvent.click(submitBtn);

      expect(screen.getByRole("button", { name: /Creating Case/i })).toBeInTheDocument();
    });
  });

  describe("Search Left/Right Workspace & Customer Name Terminology", () => {
    it("renders desktop 2-column layout [Filters 300-340px] | [Results flexible width]", () => {
      render(
        <SearchContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queues={mockAvailableQueues}
        />
      );

      // Workspace layout containers
      expect(screen.getByTestId("search-workspace")).toBeInTheDocument();
      const filtersPanel = screen.getByTestId("search-filters-panel");
      const resultsPanel = screen.getByTestId("search-results-panel");
      expect(filtersPanel).toBeInTheDocument();
      expect(resultsPanel).toBeInTheDocument();
      expect(filtersPanel.style.width).toBe("320px");

      // Results table internal scroll container
      expect(screen.getByTestId("search-results-table-scrollable")).toBeInTheDocument();
    });

    it("uses WID and Customer Name (without Application No., Case ID, or Applicant / Customer Name) in filters and results", () => {
      render(
        <SearchContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queues={mockAvailableQueues}
        />
      );

      // Exact filter labels: WID, Customer Name, Queue, Received From, Received To
      expect(screen.getByLabelText("WID")).toBeInTheDocument();
      expect(screen.getByLabelText("Customer Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Queue")).toBeInTheDocument();
      expect(screen.getByLabelText("Received From")).toBeInTheDocument();
      expect(screen.getByLabelText("Received To")).toBeInTheDocument();

      // Ensure Application No., Case ID, and Applicant / Customer Name are completely absent
      expect(screen.queryByLabelText("Application No.")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Case ID")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Applicant / Customer Name")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Applicant / Customer")).not.toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();

      // Exact results table column headers: WID, Customer Name, Queue, Received, Action
      expect(screen.getByRole("columnheader", { name: "WID" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Customer Name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Queue" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Received" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument();

      // Ensure Application No., Case ID, Priority, and Status are absent
      expect(screen.queryByRole("columnheader", { name: /Application No/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Case ID/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Priority/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Status/i })).not.toBeInTheDocument();
    });

    it("clears search filters and resets pagination", () => {
      render(
        <SearchContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queues={mockAvailableQueues}
        />
      );

      const customerInput = screen.getByLabelText("Customer Name");
      fireEvent.change(customerInput, { target: { value: "Rajesh Sharma" } });
      expect(customerInput).toHaveValue("Rajesh Sharma");

      const clearBtn = screen.getByRole("button", { name: "Clear" });
      fireEvent.click(clearBtn);

      expect(customerInput).toHaveValue("");
    });
  });

  describe("In Basket Work List - Restrained Columns, Customer Name, & Pagination", () => {
    it("renders restrained columns (WID, Customer Name, Received, Action) without Application No., Priority, or Status", () => {
      const mockWorkItems = [
        {
          wid: "WID-2026-01042",
          caseId: "PLA-2026-00892",
          customerName: "Rajesh Kumar Sharma",
          receivedDate: "Today, 09:15 AM",
          queueKey: "PLA_SOL_MAKER",
          queueName: "SOL Maker",
        },
      ];

      render(
        <InBasketContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queue={{ id: "q-1", name: "SOL Maker", queueKey: "PLA_SOL_MAKER" }}
          workItems={mockWorkItems}
        />
      );

      // Verify header and table items
      expect(screen.getByText("In Basket: SOL Maker")).toBeInTheDocument();
      expect(screen.getByText("WID-2026-01042")).toBeInTheDocument();
      expect(screen.getByText("Rajesh Kumar Sharma")).toBeInTheDocument();

      // Exact column headers: WID, Customer Name, Received, Action
      expect(screen.getByRole("columnheader", { name: "WID" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Customer Name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Received" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument();

      // Verify Application No, Case ID, Priority, and Status are NOT rendered
      expect(screen.queryByRole("columnheader", { name: /Application No/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Case ID/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Applicant \/ Customer Name/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Priority/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: /Status/i })).not.toBeInTheDocument();
    });

    it("renders reusable pagination in In Basket and responds to page change", () => {
      const items = Array.from({ length: 30 }, (_, i) => ({
        wid: `WID-2026-${String(i + 1).padStart(4, "0")}`,
        caseId: `PLA-2026-${String(i + 1).padStart(4, "0")}`,
        customerName: `Customer ${i + 1}`,
        receivedDate: "Today, 10:00 AM",
        queueKey: "PLA_SOL_MAKER",
        queueName: "SOL Maker",
      }));

      render(
        <InBasketContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queue={{ id: "q-1", name: "SOL Maker", queueKey: "PLA_SOL_MAKER" }}
          workItems={items}
        />
      );

      // Pagination elements
      expect(screen.getByTestId("in-basket-pagination")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-count")).toHaveTextContent("Showing 1-25 of 30");

      // First item is visible, 26th item is not on page 1
      expect(screen.getByText("WID-2026-0001")).toBeInTheDocument();
      expect(screen.queryByText("WID-2026-0026")).not.toBeInTheDocument();

      // Go to page 2
      const nextBtn = screen.getByTestId("pagination-next");
      fireEvent.click(nextBtn);

      expect(screen.getByTestId("pagination-count")).toHaveTextContent("Showing 26-30 of 30");
      expect(screen.getByText("WID-2026-0026")).toBeInTheDocument();
      expect(screen.queryByText("WID-2026-0001")).not.toBeInTheDocument();
    });
  });

  describe("WID Processing Page Viewport Fit & Toolbar Terminology", () => {
    it("renders WID: <wid> | Queue: <queue name> without Application No., and maintains viewport layout", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Main container fits height with no outer scroll
      const container = screen.getByTestId("wid-processing-container");
      expect(container.style.height).toBe("100%");
      expect(container.style.overflow).toBe("hidden");

      // Top Toolbar remains fixed/visible
      expect(screen.getByTestId("wid-toolbar")).toBeInTheDocument();

      // Exact toolbar terminology: WID: <wid> | <Queue Name>
      expect(screen.getByTestId("wid-display")).toHaveTextContent("WID: WID-2026-01042 | SOL Maker");
      expect(screen.queryByTestId("queue-badge")).not.toBeInTheDocument();
      expect(screen.queryByText(/Demo: Queue Context/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Case View Layout/i)).not.toBeInTheDocument();

      // Ensure Application No. is NOT anywhere in the toolbar
      expect(screen.queryByText(/Application No/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("application-no-display")).not.toBeInTheDocument();

      // Workspace 42% / 58% grid
      const grid = screen.getByTestId("wid-workspace-grid");
      expect(grid.style.overflow).toBe("hidden");
      expect(grid.style.gridTemplateColumns).toContain("42%");

      // LHS Viewer column fills height
      const viewerCol = screen.getByTestId("wid-viewer-column");
      expect(viewerCol.style.overflow).toBe("hidden");

      // RHS Column has internal scroll for form and document list
      const rhsCol = screen.getByTestId("wid-rhs-column");
      expect(rhsCol.style.overflow).toBe("hidden");

      // Case View Form scrolls internally
      const formScrollable = screen.getByTestId("case-view-form-scrollable");
      expect(formScrollable.style.overflowY).toBe("auto");

      // Document list scrolls internally
      const docScrollable = screen.getByTestId("document-list-scrollable");
      expect(docScrollable.style.overflowY).toBe("auto");
    });
  });

  describe("Format-Aware Document Viewer & Clean Neutral Metadata", () => {
    it("renders neutral document metadata without Verified, Pending Check, or Active status badges", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Verify no invented document status badges exist in document list or viewer
      expect(screen.queryByText("Verified")).not.toBeInTheDocument();
      expect(screen.queryByText("Pending Check")).not.toBeInTheDocument();
      expect(screen.queryByText(/Active 👁/i)).not.toBeInTheDocument();

      // Neutral metadata is visible in Document List items
      const docList = screen.getByTestId("document-list-container");
      expect(within(docList).getByText("Aadhaar Card.pdf")).toBeInTheDocument();
      expect(within(docList).getByText(/PDF • 1\.2 MB • Today, 09:12 AM/i)).toBeInTheDocument();
    });

    it("renders native PDF viewer for local private PDF files", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Default active document is Aadhaar Card.pdf
      const iframe = screen.getByTestId("pdf-viewer-frame") as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toContain("/demo-documents/private/aadhaar.pdf");
    });

    it("renders image viewer for local private image files (PNG/JPG)", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Select PAN Card.png
      const panBtn = screen.getByRole("button", { name: /PAN Card\.png/i });
      fireEvent.click(panBtn);

      const img = screen.getByTestId("image-viewer-frame") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain("/demo-documents/private/pan.png");
    });

    it("shows clean Document not available state when a document file is missing without breaking the page", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Select missing Passport.pdf
      const passportBtn = screen.getByRole("button", { name: /Passport\.pdf/i });
      fireEvent.click(passportBtn);

      // Renders clean "Document not available" fallback
      const notAvail = screen.getByTestId("document-not-available");
      expect(notAvail).toBeInTheDocument();
      expect(within(notAvail).getByText("Document not available")).toBeInTheDocument();

      // Page continues functioning; user can switch back to another available document
      const aadhaarBtn = screen.getByRole("button", { name: /Aadhaar Card\.pdf/i });
      fireEvent.click(aadhaarBtn);

      expect(screen.getByTestId("pdf-viewer-frame")).toBeInTheDocument();
    });

    it("renders Word preview adapter with original download link for DOC/DOCX files", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Select Employment Verification.docx
      const docxBtn = screen.getByRole("button", { name: /Employment Verification\.docx/i });
      fireEvent.click(docxBtn);

      const wordAdapter = screen.getByTestId("word-preview-adapter");
      expect(wordAdapter).toBeInTheDocument();
      expect(within(wordAdapter).getByText("Employment Verification.docx")).toBeInTheDocument();
      expect(within(wordAdapter).getByText(/Microsoft Word Document/i)).toBeInTheDocument();
      const downloadLink = within(wordAdapter).getByTestId("download-original-link") as HTMLAnchorElement;
      expect(downloadLink.href).toContain("/demo-documents/employment-verification.docx");
    });

    it("renders Spreadsheet preview adapter with original download link for XLS/XLSX files", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Select Amortization Schedule.xlsx
      const xlsxBtn = screen.getByRole("button", { name: /Amortization Schedule\.xlsx/i });
      fireEvent.click(xlsxBtn);

      const sheetAdapter = screen.getByTestId("spreadsheet-preview-adapter");
      expect(sheetAdapter).toBeInTheDocument();
      expect(within(sheetAdapter).getByText("Amortization Schedule.xlsx")).toBeInTheDocument();
      expect(within(sheetAdapter).getByText(/Microsoft Excel Spreadsheet/i)).toBeInTheDocument();
      const downloadLink = within(sheetAdapter).getByTestId("download-original-link") as HTMLAnchorElement;
      expect(downloadLink.href).toContain("/demo-documents/amortization-schedule.xlsx");
    });

    it("renders unsupported preview adapter with original download link for unknown formats", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Select Diagnostic Log.bin
      const binBtn = screen.getByRole("button", { name: /Diagnostic Log\.bin/i });
      fireEvent.click(binBtn);

      const unsuppAdapter = screen.getByTestId("unsupported-preview-adapter");
      expect(unsuppAdapter).toBeInTheDocument();
      expect(within(unsuppAdapter).getByText("No Preview Available")).toBeInTheDocument();
      const downloadLink = within(unsuppAdapter).getByTestId("download-original-link") as HTMLAnchorElement;
      expect(downloadLink.href).toContain("/demo-documents/diagnostic-log.bin");
    });
  });

  describe("Runtime Width & Layout Containers", () => {
    it("verifies all runtime containers use ucs-runtime-container and no narrow max-width wrappers", () => {
      const { container: solContainer } = render(
        <RuntimeSolutionsList
          solutions={[
            {
              id: "s-1",
              name: "Personal Loan Application",
              solutionPrefix: "PLA",
              status: "Active",
              updatedAt: new Date(),
            },
          ]}
        />
      );
      expect(solContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();

      const { container: navContainer } = render(
        <NavigatorContainer solution={{ id: "s-1", name: "PLA", solutionPrefix: "PLA" }} queues={[]} />
      );
      expect(navContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();

      const { container: inBasketContainer } = render(
        <InBasketContainer
          solution={{ id: "s-1", name: "PLA", solutionPrefix: "PLA" }}
          queue={{ id: "q-1", name: "SOL Maker", queueKey: "PLA_SOL_MAKER" }}
          workItems={[]}
        />
      );
      expect(inBasketContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();

      const { container: searchContainer } = render(
        <SearchContainer solution={{ id: "s-1", name: "PLA", solutionPrefix: "PLA" }} queues={[]} />
      );
      expect(searchContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();

      const { container: createCaseContainer } = render(
        <CreateCaseContainer
          solution={{ id: "s-1", name: "PLA", solutionPrefix: "PLA" }}
          formAggregate={mockAddCaseFormAggregate}
          properties={mockProperties}
        />
      );
      expect(createCaseContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();

      const { container: widContainer } = render(
        <WidProcessingContainer
          solution={{ id: "s-1", name: "PLA", solutionPrefix: "PLA" }}
          wid="WID-1"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );
      expect(widContainer.querySelector(".ucs-runtime-container")).toBeInTheDocument();
    });
  });

  describe("Refined Navigator - Compact Header, Queue Dropdown & In-Place Refresh", () => {
    it("renders compact header with <Full Solution Name> (<Prefix>) without duplicate blocks", () => {
      render(
        <NavigatorContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queues={mockAvailableQueues}
        />
      );

      // Compact Solution header
      const title = screen.getByTestId("solution-title");
      expect(title).toHaveTextContent("Personal Loan Application (PLA)");
      expect(screen.getByText("← Back to My Solutions")).toBeInTheDocument();

      // Controls toolbar: In Basket: [Queue dropdown]  Search Cases  Create Case
      expect(screen.getByLabelText("Queue")).toBeInTheDocument();
      expect(screen.getByTestId("search-cases-btn")).toBeInTheDocument();
      expect(screen.getByTestId("create-case-btn")).toBeInTheDocument();

      // In Basket table is rendered directly
      expect(screen.getByTestId("in-basket-table-container")).toBeInTheDocument();
    });

    it("lists accessible queues in dropdown and refreshes work items in place without navigation", () => {
      render(
        <NavigatorContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          queues={mockAvailableQueues}
        />
      );

      const dropdown = screen.getByTestId("queue-dropdown") as HTMLSelectElement;
      expect(dropdown).toBeInTheDocument();

      // Lists accessible queues
      expect(dropdown.options.length).toBe(mockAvailableQueues.length);
      expect(dropdown.options[0].text).toContain("SOL Maker");
      expect(dropdown.options[1].text).toContain("SOL Checker");

      // Table shows items for the selected queue
      expect(screen.getByTestId("in-basket-table")).toBeInTheDocument();

      // Change queue selection
      fireEvent.change(dropdown, { target: { value: "q-checker" } });
      expect(dropdown.value).toBe("q-checker");

      // Work items table refreshed in place
      expect(screen.getByTestId("in-basket-table")).toBeInTheDocument();
    });
  });

  describe("Collapsible Form Sections & Lower RHS Panel Tabs", () => {
    const multiSectionAggregate: FormAggregate = {
      ...mockCaseViewFormAggregate,
      sections: [
        {
          id: "sec-1",
          formId: "form-case-view",
          tabId: "tab-1",
          key: "SEC_1",
          title: "Primary Application Information",
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "sec-2",
          formId: "form-case-view",
          tabId: "tab-1",
          key: "SEC_2",
          title: "Underwriting & Verification Details",
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      fields: [
        ...mockCaseViewFormAggregate.fields,
        {
          id: "field-notes",
          solutionId: "sol-1",
          formId: "form-case-view",
          sectionId: "sec-2",
          propertyId: "prop-verification-notes",
          controlType: "TEXTAREA",
          isVisible: true,
          isEnabled: true,
          isEditable: true,
          isRequired: false,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it("expands first section by default and collapses subsequent sections", () => {
      render(
        <CaseViewRuntimeForm
          formAggregate={multiSectionAggregate}
          properties={mockProperties}
          activeQueueId="q-maker"
          activeQueueName="SOL Maker"
          initialValues={mockDemoCase.values}
        />
      );

      // Section 1 is expanded: its chevron is ▼ and its fields are visible
      expect(screen.getByTestId("section-chevron-sec-1")).toHaveTextContent("▼");
      expect(screen.getByTestId("section-fields-sec-1")).toBeInTheDocument();

      // Section 2 is collapsed by default: its chevron is ▶ and its fields are not rendered
      expect(screen.getByTestId("section-chevron-sec-2")).toHaveTextContent("▶");
      expect(screen.queryByTestId("section-fields-sec-2")).not.toBeInTheDocument();

      // Clicking Section 2 header expands it
      const sec2Header = screen.getByTestId("section-header-sec-2");
      fireEvent.click(sec2Header);

      expect(screen.getByTestId("section-chevron-sec-2")).toHaveTextContent("▼");
      expect(screen.getByTestId("section-fields-sec-2")).toBeInTheDocument();

      // Clicking Section 1 header collapses it without affecting form values
      const sec1Header = screen.getByTestId("section-header-sec-1");
      fireEvent.click(sec1Header);

      expect(screen.getByTestId("section-chevron-sec-1")).toHaveTextContent("▶");
      expect(screen.queryByTestId("section-fields-sec-1")).not.toBeInTheDocument();
    });

    it("renders RHS lower panel with Documents and Case History tabs", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // Tabs exist
      const docTab = screen.getByTestId("tab-documents");
      const histTab = screen.getByTestId("tab-case-history");
      expect(docTab).toBeInTheDocument();
      expect(histTab).toBeInTheDocument();

      // Document list is visible by default
      expect(screen.getByTestId("document-list-container")).toBeInTheDocument();
      expect(screen.queryByTestId("case-history-table")).not.toBeInTheDocument();

      // Clicking Case History tab switches to Case History table
      fireEvent.click(histTab);
      expect(screen.getByTestId("case-history-table")).toBeInTheDocument();
      expect(screen.queryByTestId("document-list-container")).not.toBeInTheDocument();

      // Realistic history entries are rendered
      expect(screen.getByText("Case Created")).toBeInTheDocument();
      expect(screen.getByText("Documents Uploaded")).toBeInTheDocument();
      expect(screen.getByText("Assigned to Queue")).toBeInTheDocument();

      // Switch back to Documents tab
      fireEvent.click(docTab);
      expect(screen.getByTestId("document-list-container")).toBeInTheDocument();
      expect(screen.queryByTestId("case-history-table")).not.toBeInTheDocument();
    });
  });

  describe("Search Read-Only Case View Mode", () => {
    it("renders all fields as read-only and disables Save when opened in read-only mode", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
          isReadOnly={true}
        />
      );

      // Read-only indicator is visible
      expect(screen.getByTestId("readonly-mode-indicator")).toBeInTheDocument();

      // Save button is disabled
      const saveBtn = screen.getByRole("button", { name: "Save" });
      expect(saveBtn).toBeDisabled();

      // Send button is disabled
      const sendBtn = screen.getByRole("button", { name: "Send" });
      expect(sendBtn).toBeDisabled();

      // All fields are read-only regardless of queue rules
      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toBeDisabled();
      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      expect(loanAmountInput).toBeDisabled();

      // Read-only badges are rendered
      expect(screen.getByTestId("readonly-badge-firstName")).toBeInTheDocument();
      expect(screen.getByTestId("readonly-badge-loanAmount")).toBeInTheDocument();

      // Documents and Case History remain visible
      expect(screen.getByTestId("tab-documents")).toBeInTheDocument();
      expect(screen.getByTestId("tab-case-history")).toBeInTheDocument();
    });
  });

  describe("Runtime Property Validation Engine", () => {
    const validatedProperties: SolutionPropertyRow[] = [
      {
        id: "prop-email",
        solutionId: "sol-1",
        localSymbolicName: "emailAddress",
        generatedTechnicalName: "PLA_EMAIL",
        label: "Email Address",
        storedDataType: "TEXT",
        formatPreset: "NONE",
        choiceListId: null,
        cardinality: "SINGLE",
        defaultValue: "",
        helpText: "Applicant official email",
        isSensitive: false,
        defaultControlType: "TEXT_INPUT",
        validationRules: {
          regexPreset: "EMAIL_BASIC",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prop-phone",
        solutionId: "sol-1",
        localSymbolicName: "mobileNumber",
        generatedTechnicalName: "PLA_MOBILE",
        label: "Mobile Number",
        storedDataType: "TEXT",
        formatPreset: "NONE",
        choiceListId: null,
        cardinality: "SINGLE",
        defaultValue: "",
        helpText: "10-digit mobile number",
        isSensitive: false,
        defaultControlType: "TEXT_INPUT",
        validationRules: {
          regexPreset: "INDIAN_MOBILE",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prop-amount",
        solutionId: "sol-1",
        localSymbolicName: "requestedAmount",
        generatedTechnicalName: "PLA_REQ_AMOUNT",
        label: "Requested Amount",
        storedDataType: "NUMBER",
        formatPreset: "NONE",
        choiceListId: null,
        cardinality: "SINGLE",
        defaultValue: "50000",
        helpText: "Min 10,000, Max 500,000",
        isSensitive: false,
        defaultControlType: "NUMBER_INPUT",
        validationRules: {
          minimumValue: 10000,
          maximumValue: 500000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const validatedFormAggregate: FormAggregate = {
      form: {
        id: "form-val-add",
        solutionId: "sol-1",
        formType: "ADD_CASE",
        formKey: "PLA_ADD_CASE",
        key: "PLA_ADD_CASE",
        name: "Validated Add Form",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tabs: [{ id: "tab-v1", formId: "form-val-add", key: "T1", title: "Details", displayOrder: 1, createdAt: new Date(), updatedAt: new Date() }],
      sections: [{ id: "sec-v1", formId: "form-val-add", tabId: "tab-v1", key: "S1", title: "Contact", displayOrder: 1, createdAt: new Date(), updatedAt: new Date() }],
      fields: [
        {
          id: "f-email",
          solutionId: "sol-1",
          formId: "form-val-add",
          sectionId: "sec-v1",
          propertyId: "prop-email",
          controlType: "TEXT_INPUT",
          isVisible: true,
          isEnabled: true,
          isEditable: true,
          isRequired: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "f-phone",
          solutionId: "sol-1",
          formId: "form-val-add",
          sectionId: "sec-v1",
          propertyId: "prop-phone",
          controlType: "TEXT_INPUT",
          isVisible: true,
          isEnabled: true,
          isEditable: true,
          isRequired: false,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "f-amount",
          solutionId: "sol-1",
          formId: "form-val-add",
          sectionId: "sec-v1",
          propertyId: "prop-amount",
          controlType: "NUMBER_INPUT",
          isVisible: true,
          isEnabled: true,
          isEditable: true,
          isRequired: true,
          displayOrder: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      queueRules: [],
    };

    it("evaluates email, mobile regex presets and numeric constraints in Add Case", () => {
      render(
        <CreateCaseContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          formAggregate={validatedFormAggregate}
          properties={validatedProperties}
        />
      );

      const emailInput = screen.getByLabelText(/Email Address/i);
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      const amountInput = screen.getByLabelText(/Requested Amount/i);

      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      expect(screen.getByTestId("field-error-emailAddress")).toHaveTextContent(/does not match the required pattern/i);

      // Fix email
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      expect(screen.queryByTestId("field-error-emailAddress")).not.toBeInTheDocument();

      // Enter invalid mobile (less than 10 digits or invalid prefix)
      fireEvent.change(phoneInput, { target: { value: "12345" } });
      expect(screen.getByTestId("field-error-mobileNumber")).toHaveTextContent(/does not match the required pattern/i);

      // Fix mobile
      fireEvent.change(phoneInput, { target: { value: "9876543210" } });
      expect(screen.queryByTestId("field-error-mobileNumber")).not.toBeInTheDocument();

      // Enter amount below minimum
      fireEvent.change(amountInput, { target: { value: "5000" } });
      expect(screen.getByTestId("field-error-requestedAmount")).toHaveTextContent(/greater than or equal to 10000/i);

      // Enter amount above maximum
      fireEvent.change(amountInput, { target: { value: "900000" } });
      expect(screen.getByTestId("field-error-requestedAmount")).toHaveTextContent(/less than or equal to 500000/i);
    });

    it("evaluates validation rules in editable WID processing fields", () => {
      const widCase: DemoCaseData = {
        ...mockDemoCase,
        values: {
          emailAddress: "good@example.com",
          mobileNumber: "9876543210",
          requestedAmount: "50000",
        },
      };

      render(
        <CaseViewRuntimeForm
          formAggregate={validatedFormAggregate}
          properties={validatedProperties}
          activeQueueId="q-maker"
          activeQueueName="SOL Maker"
          initialValues={widCase.values}
        />
      );

      const emailInput = screen.getByLabelText(/Email Address/i);

      // Edit email to invalid format
      fireEvent.change(emailInput, { target: { value: "not-an-email" } });
      expect(screen.getByTestId("field-error-emailAddress")).toHaveTextContent(/does not match the required pattern/i);

      // Clear email (which is required)
      fireEvent.change(emailInput, { target: { value: "" } });
      expect(screen.getByTestId("field-error-emailAddress")).toHaveTextContent(/This field is mandatory/i);
    });
  });

  describe("Locked Outer WID Workspace Vertical Geometry & Proportions", () => {
    it("locks outer workspace geometry and RHS proportions across section collapse/expand and tabs", () => {
      render(
        <WidProcessingContainer
          solution={{ id: "sol-1", name: "Personal Loan Application", solutionPrefix: "PLA" }}
          wid="WID-2026-01042"
          initialCase={mockDemoCase}
          formAggregate={mockCaseViewFormAggregate}
          properties={mockProperties}
          initialQueueId="q-maker"
          initialQueueName="SOL Maker"
          availableQueues={mockAvailableQueues}
        />
      );

      // 1. Outer Workspace and Grid
      const container = screen.getByTestId("wid-processing-container");
      expect(container).toHaveClass("wid-workspace");
      expect(container.style.height).toBe("100%");
      expect(container.style.overflow).toBe("hidden");

      const toolbar = screen.getByTestId("wid-toolbar");
      expect(toolbar).toHaveClass("wid-toolbar");

      const grid = screen.getByTestId("wid-workspace-grid");
      expect(grid).toHaveClass("wid-workspace-grid");
      expect(grid.style.gridTemplateColumns).toContain("42%");

      const viewerCol = screen.getByTestId("wid-viewer-column");
      expect(viewerCol).toHaveClass("wid-viewer-panel");
      expect(viewerCol.style.height).toBe("100%");
      expect(viewerCol.style.overflow).toBe("hidden");

      // 2. RHS Grid: Form ~58% / Support ~42%
      const rhsCol = screen.getByTestId("wid-rhs-column");
      expect(rhsCol).toHaveClass("wid-right-panel");
      expect(rhsCol.style.display).toBe("grid");
      expect(rhsCol.style.gridTemplateRows).toContain("58%");
      expect(rhsCol.style.gridTemplateRows).toContain("42%");
      expect(rhsCol.style.height).toBe("100%");
      expect(rhsCol.style.overflow).toBe("hidden");

      // 3. Form Region
      const formWrapper = screen.getByTestId("wid-case-form-wrapper");
      expect(formWrapper).toHaveClass("case-form-region");
      expect(formWrapper.style.height).toBe("100%");
      expect(formWrapper.style.overflow).toBe("hidden");

      // 4. Support Region
      const lowerPanel = screen.getByTestId("wid-rhs-lower-panel");
      expect(lowerPanel).toHaveClass("case-support-region");
      expect(lowerPanel.style.height).toBe("100%");
      expect(lowerPanel.style.overflow).toBe("hidden");

      const tabContent = screen.getByTestId("wid-lower-tab-content");
      expect(tabContent).toHaveClass("documents-history-content");
      expect(tabContent.style.height).toBe("100%");
      expect(tabContent.style.overflow).toBe("hidden");

      // 5. Scenario: Collapsing a section does NOT change outer or RHS geometry
      const headerPersonal = screen.getByTestId("section-header-sec-1");
      fireEvent.click(headerPersonal); // collapse personal section

      // Grid, viewer, form, and lower panel retain their locked structure and classes
      expect(grid.style.overflow).toBe("hidden");
      expect(rhsCol.style.gridTemplateRows).toContain("58%");
      expect(rhsCol.style.gridTemplateRows).toContain("42%");
      expect(lowerPanel.style.height).toBe("100%");

      // 6. Scenario: Switching Documents <-> Case History preserves lower region height & internal scroll
      const historyTab = screen.getByTestId("tab-case-history");
      fireEvent.click(historyTab);

      expect(screen.getByTestId("case-history-container")).toBeInTheDocument();
      expect(lowerPanel.style.height).toBe("100%");
      expect(rhsCol.style.gridTemplateRows).toContain("42%");

      const docsTab = screen.getByTestId("tab-documents");
      fireEvent.click(docsTab);

      expect(screen.getByTestId("document-list-container")).toBeInTheDocument();
      expect(screen.getByTestId("document-list-scrollable").style.overflowY).toBe("auto");
    });
  });
});

