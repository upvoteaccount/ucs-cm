/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { FormsLanding } from "./FormsLanding";
import { FormDesigner } from "./FormDesigner";
import { FieldInspector } from "./FieldInspector";
import { FieldCard } from "./FieldCard";

describe("Forms Dual System & Designer UX Specification Tests", () => {
  const mockForms = [
    {
      id: "form-add-1",
      formKey: "add_case",
      formType: "ADD_CASE",
      name: "Add Case Form",
      description: "Used to capture initial case details when creating a new case.",
    },
    {
      id: "form-view-1",
      formKey: "case_view",
      formType: "CASE_VIEW",
      name: "Case View Form",
      description: "Used to display and manage case details when working on existing cases.",
    },
  ];

  const mockAddCaseAggregate = {
    form: mockForms[0],
    tabs: [
      { id: "tab-add-1", formId: "form-add-1", tabKey: "default_tab", title: "Default Tab", displayOrder: 1 },
    ],
    sections: [],
    fields: [],
  };

  const mockCaseViewAggregate = {
    form: mockForms[1],
    tabs: [
      { id: "tab-view-1", formId: "form-view-1", tabKey: "default_tab", title: "Default Tab", displayOrder: 1 },
    ],
    sections: [],
    fields: [],
  };

  const mockProperties = [
    {
      id: "prop-1",
      label: "Customer Name",
      localSymbolicName: "CUST_NAME",
      generatedTechnicalName: "SOL_CUST_NAME",
      storedDataType: "TEXT",
      formatPreset: "NONE",
      cardinality: "SINGLE",
    },
    {
      id: "prop-2",
      label: "Customer Email",
      localSymbolicName: "CUST_EMAIL",
      generatedTechnicalName: "SOL_CUST_EMAIL",
      storedDataType: "TEXT",
      formatPreset: "EMAIL",
      cardinality: "SINGLE",
    },
  ];

  describe("1. Forms Landing Component", () => {
    it("renders both Add Case Form and Case View Form clean Studio cards with purpose text and Configure buttons", () => {
      const onConfigure = vi.fn();
      render(
        <FormsLanding
          forms={mockForms}
          onConfigureForm={onConfigure}
        />
      );

      expect(screen.getByText("Solution Forms")).toBeInTheDocument();
      expect(screen.getByText("Add Case Form")).toBeInTheDocument();
      expect(screen.getByText("Case View Form")).toBeInTheDocument();
      expect(screen.getByText("ADD_CASE")).toBeInTheDocument();
      expect(screen.getByText("CASE_VIEW")).toBeInTheDocument();
      expect(screen.getByText(mockForms[0].description!)).toBeInTheDocument();
      expect(screen.getByText(mockForms[1].description!)).toBeInTheDocument();

      const configureButtons = screen.getAllByRole("button", { name: "Configure" });
      expect(configureButtons).toHaveLength(2);

      // Clicking Configure on Add Case Form calls onConfigure with form-add-1
      fireEvent.click(configureButtons[0]);
      expect(onConfigure).toHaveBeenCalledWith("form-add-1");

      // Clicking Configure on Case View Form calls onConfigure with form-view-1
      fireEvent.click(configureButtons[1]);
      expect(onConfigure).toHaveBeenCalledWith("form-view-1");
    });
  });

  describe("2. Default Form Structure & FormDesigner Canvas", () => {
    it("starts with exactly one Default Tab and zero sections", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={mockAddCaseAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
          onCreateTab={async () => {}}
          onUpdateTab={async () => {}}
          onDeleteTab={async () => {}}
          onReorderTabs={async () => {}}
          onCreateSection={async () => {}}
          onUpdateSection={async () => {}}
          onDeleteSection={async () => {}}
          onMoveSection={async () => {}}
          onReorderSections={async () => {}}
          onAddField={async () => {}}
          onUpdateField={async () => {}}
          onDeleteField={async () => {}}
          onMoveField={async () => {}}
          onReorderFields={async () => {}}
        />
      );

      // Verifies tab strip shows "Default Tab" and NOT "Main"
      expect(screen.getByRole("button", { name: "Default Tab" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Main" })).not.toBeInTheDocument();

      // Verifies zero sections empty state
      expect(screen.getByText("No Sections in this Tab")).toBeInTheDocument();
      expect(screen.getByText("Sections (0)")).toBeInTheDocument();

      // Also verify Case View Form default structure
      const { unmount } = render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={mockCaseViewAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
          onCreateTab={async () => {}}
          onUpdateTab={async () => {}}
          onDeleteTab={async () => {}}
          onReorderTabs={async () => {}}
          onCreateSection={async () => {}}
          onUpdateSection={async () => {}}
          onDeleteSection={async () => {}}
          onMoveSection={async () => {}}
          onReorderSections={async () => {}}
          onAddField={async () => {}}
          onUpdateField={async () => {}}
          onDeleteField={async () => {}}
          onMoveField={async () => {}}
          onReorderFields={async () => {}}
        />
      );
      expect(screen.getAllByRole("button", { name: "Default Tab" })).toHaveLength(2);
      unmount();
    });
  });

  describe("3. FieldInspector Dual Form Semantics & Dirty State Guard", () => {
    it("renders all 3 independent static checkboxes on Add Case Form and allows buffering changes", async () => {
      let isDirty = false;
      const onUpdateField = vi.fn().mockResolvedValue(undefined);

      const field = {
        id: "fref-1",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        isVisible: true,
        isEditable: true,
        isRequired: false,
      };

      function TestWrapper() {
        const [isDirtyState, setIsDirtyState] = React.useState(false);
        return (
          <FieldInspector
            formType="ADD_CASE"
            field={field}
            property={mockProperties[0]}
            expectedRevision={1}
            onUpdateField={onUpdateField}
            onClose={() => {}}
            isDirty={isDirtyState}
            setIsDirty={(d) => {
              isDirty = d;
              setIsDirtyState(d);
            }}
          />
        );
      }

      render(<TestWrapper />);

      // Add Case Form has all 3 independent checkboxes
      const visibleCheckbox = screen.getByRole("checkbox", { name: /Visible/i });
      const editableCheckbox = screen.getByRole("checkbox", { name: /Editable/i });
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });

      expect(visibleCheckbox).toBeInTheDocument();
      expect(visibleCheckbox).toBeChecked();
      expect(editableCheckbox).toBeInTheDocument();
      expect(editableCheckbox).toBeChecked();
      expect(mandatoryCheckbox).toBeInTheDocument();
      expect(mandatoryCheckbox).not.toBeChecked();

      // Save button is initially disabled because not dirty
      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      expect(saveBtn).toBeDisabled();

      // Toggle mandatory -> mark dirty
      fireEvent.click(mandatoryCheckbox);
      expect(isDirty).toBe(true);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
      });
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Submit save
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(onUpdateField).toHaveBeenCalledWith("fref-1", {
          controlType: "TEXT_INPUT",
          isVisible: true,
          isEditable: true,
          isRequired: true,
          expectedRevision: 1,
        });
      });
    });

    it("displays explanatory empty state when no queues exist on Case View Form", () => {
      const field = {
        id: "fref-2",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        isRequired: false,
      };

      render(
        <FieldInspector
          formType="CASE_VIEW"
          field={field}
          property={mockProperties[0]}
          expectedRevision={1}
          onUpdateField={async () => {}}
          onClose={() => {}}
          queues={[]}
          selectedQueueId={null}
        />
      );

      // No queue checkboxes rendered, explanatory empty state shown
      expect(screen.queryByRole("checkbox", { name: /Mandatory/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: /Visible/i })).not.toBeInTheDocument();
      expect(
        screen.getByText(/No Queues exist in this Solution\. Create a Queue in the Queues tab to configure queue-specific field behaviours\./i)
      ).toBeInTheDocument();
    });

    it("renders queue context controls when queue is selected on Case View Form", () => {
      const field = {
        id: "fref-2",
        propertyId: "prop-1",
        controlType: "TEXT_INPUT",
        isRequired: false,
      };

      const mockQueues = [
        { id: "q-maker", name: "SOL Maker", queueKey: "sol_maker" },
        { id: "q-checker", name: "SOL Checker", queueKey: "sol_checker" },
      ];

      const onUpdateQueueRule = vi.fn();

      render(
        <FieldInspector
          formType="CASE_VIEW"
          field={field}
          property={mockProperties[0]}
          expectedRevision={1}
          onUpdateField={async () => {}}
          onClose={() => {}}
          queues={mockQueues}
          selectedQueueId="q-maker"
          queueRules={[]}
          onQueueRuleChange={onUpdateQueueRule}
        />
      );

      // Shows active queue context
      expect(screen.getByText("Queue Behaviour")).toBeInTheDocument();
      expect(screen.getAllByText(/SOL Maker/i).length).toBeGreaterThan(0);

      // Controls for the queue are rendered with sparse defaults (Visible, Editable, Optional)
      const visibleCheckbox = screen.getByRole("checkbox", { name: /Visible/i });
      const editableCheckbox = screen.getByRole("checkbox", { name: /Editable/i });
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });

      expect(visibleCheckbox).toBeChecked();
      expect(editableCheckbox).toBeChecked();
      expect(mandatoryCheckbox).not.toBeChecked();

      // Toggling mandatory updates the queue rule
      fireEvent.click(mandatoryCheckbox);
      expect(onUpdateQueueRule).toHaveBeenCalledWith("fref-2", "q-maker", {
        isVisible: true,
        isEditable: true,
        isRequired: true,
      });
    });
  });

  describe("4. FormDesigner Dirty Inspector Navigation Guards", () => {
    it("protects switching tabs, switching fields, and navigating back to landing when inspector is dirty", async () => {
      const onBackToLanding = vi.fn();
      let isInspectorDirty = true;

      const aggregateWithFields = {
        form: mockForms[0],
        tabs: [
          { id: "tab-1", formId: "form-add-1", tabKey: "tab_1", title: "Tab 1", displayOrder: 1 },
          { id: "tab-2", formId: "form-add-1", tabKey: "tab_2", title: "Tab 2", displayOrder: 2 },
        ],
        sections: [
          { id: "sec-1", formId: "form-add-1", tabId: "tab-1", sectionKey: "sec_1", title: "Section 1", displayOrder: 1 },
        ],
        fields: [
          { id: "f-1", formId: "form-add-1", sectionId: "sec-1", propertyId: "prop-1", controlType: "TEXT_INPUT", isRequired: false },
          { id: "f-2", formId: "form-add-1", sectionId: "sec-1", propertyId: "prop-2", controlType: "TEXT_INPUT", isRequired: false },
        ],
      };

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={aggregateWithFields}
          properties={mockProperties}
          onBackToLanding={onBackToLanding}
          selectedFieldId="f-1"
          isFieldInspectorDirty={isInspectorDirty}
          setIsFieldInspectorDirty={(d) => {
            isInspectorDirty = d;
          }}
          onCreateTab={async () => {}}
          onUpdateTab={async () => {}}
          onDeleteTab={async () => {}}
          onReorderTabs={async () => {}}
          onCreateSection={async () => {}}
          onUpdateSection={async () => {}}
          onDeleteSection={async () => {}}
          onMoveSection={async () => {}}
          onReorderSections={async () => {}}
          onAddField={async () => {}}
          onUpdateField={async () => {}}
          onDeleteField={async () => {}}
          onMoveField={async () => {}}
          onReorderFields={async () => {}}
        />
      );

      // Initially clean: clicking "← Back to Forms" directly calls onBackToLanding
      // Make a change in the field inspector (toggle Mandatory) to make the draft aggregate semantically dirty
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      fireEvent.click(mandatoryCheckbox);

      // Attempt to click "← Back to Forms" while dirty -> triggers Unsaved Changes dialog
      fireEvent.click(screen.getByRole("button", { name: "← Back to Forms" }));
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Keep Editing" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Save Changes" })).toBeInTheDocument();

      // Choosing "Keep Editing" dismisses modal and keeps onBackToLanding uncalled
      fireEvent.click(within(dialog).getByRole("button", { name: "Keep Editing" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onBackToLanding).not.toHaveBeenCalled();

      // Click "← Back to Forms" again, this time Discard Changes
      fireEvent.click(screen.getByRole("button", { name: "← Back to Forms" }));
      const dialogAgain = screen.getByRole("dialog");
      fireEvent.click(within(dialogAgain).getByRole("button", { name: "Discard Changes" }));
      expect(onBackToLanding).toHaveBeenCalled();
    });
  });

  describe("5. Whole-Form Draft Persistence & Sticky Inspector", () => {
    const initialAggregate = {
      form: mockForms[0], // Add Case Form
      tabs: [
        { id: "tab-1", formId: "form-add-1", tabKey: "tab_1", title: "Tab 1", displayOrder: 1 },
        { id: "tab-2", formId: "form-add-1", tabKey: "tab_2", title: "Tab 2", displayOrder: 2 },
      ],
      sections: [
        { id: "sec-1", formId: "form-add-1", tabId: "tab-1", sectionKey: "sec_1", title: "Section 1", displayOrder: 1 },
      ],
      fields: [
        { id: "f-1", formId: "form-add-1", sectionId: "sec-1", propertyId: "prop-1", controlType: "TEXT_INPUT", isRequired: false },
        { id: "f-2", formId: "form-add-1", sectionId: "sec-1", propertyId: "prop-2", controlType: "TEXT_INPUT", isRequired: false },
      ],
    };

    it("renders sticky inspector sidebar on right and empty state when no field is selected", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={initialAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Sticky sidebar container exists
      const stickyInspector = screen.getByTestId("sticky-field-inspector");
      expect(stickyInspector).toBeInTheDocument();

      // When no field selected, empty inspector state is rendered
      expect(screen.getByTestId("field-inspector-empty")).toBeInTheDocument();
      expect(screen.getByText("No Field Selected")).toBeInTheDocument();
    });

    it("allows freely switching fields and switching tabs within draft without modal, retaining changes", async () => {
      const onSaveForm = vi.fn().mockResolvedValue(true);
      const onBackToLanding = vi.fn();

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={initialAggregate}
          properties={mockProperties}
          onBackToLanding={onBackToLanding}
          onSaveForm={onSaveForm}
        />
      );

      // Select field 1
      fireEvent.click(screen.getAllByText("Customer Name")[0]);
      expect(screen.getByTestId("field-inspector")).toBeInTheDocument();

      // Modify field 1 (check Mandatory checkbox) -> marks draft dirty
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      expect(mandatoryCheckbox).not.toBeChecked();
      fireEvent.click(mandatoryCheckbox);
      expect(mandatoryCheckbox).toBeChecked();

      // Save button is now enabled, Discard button is visible
      expect(screen.getByRole("button", { name: "Save Changes" })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Switch to field 2 within the same form -> NO unsaved changes dialog!
      fireEvent.click(screen.getAllByText("Customer Email")[0]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Field 2 is now selected in inspector
      expect(within(screen.getByTestId("field-inspector")).getByText("Customer Email")).toBeInTheDocument();

      // Switch back to field 1 -> NO dialog, and Mandatory is STILL checked in the draft!
      fireEvent.click(screen.getAllByText("Customer Name")[0]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Mandatory/i })).toBeChecked();

      // Switch to Tab 2 within the same form -> NO unsaved changes dialog!
      fireEvent.click(screen.getByRole("button", { name: "Tab 2" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Switch back to Tab 1 -> NO dialog, field 1 still exists with mandatory checked
      fireEvent.click(screen.getByRole("button", { name: "Tab 1" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Select field 1 again and verify mandatory is still true
      fireEvent.click(screen.getAllByText("Customer Name")[0]);
      expect(screen.getByRole("checkbox", { name: /Mandatory/i })).toBeChecked();

      // Discard Changes resets draft
      fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
      expect(screen.getByRole("checkbox", { name: /Mandatory/i })).not.toBeChecked();

      // Save Changes button is disabled again
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("saves the complete draft aggregate via onSaveForm", async () => {
      const onSaveForm = vi.fn().mockResolvedValue(true);

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={initialAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
          onSaveForm={onSaveForm}
        />
      );

      // Select field 1 and check Mandatory
      fireEvent.click(screen.getAllByText("Customer Name")[0]);
      fireEvent.click(screen.getByRole("checkbox", { name: /Mandatory/i }));

      // Click Save Changes
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      });

      expect(onSaveForm).toHaveBeenCalledTimes(1);
      const savedPayload = onSaveForm.mock.calls[0][0];
      expect(savedPayload.tabs).toHaveLength(2);
      expect(savedPayload.sections).toHaveLength(1);
      expect(savedPayload.fields).toHaveLength(2);
      expect(savedPayload.fields.find((f: any) => f.id === "f-1")?.isRequired).toBe(true);
    });
  });

  describe("6. FieldCard Badge Semantics & Clean Field Placement", () => {
    const dummyProp = {
      id: "prop-aadhaar",
      label: "Aadhaar Card No.",
      localSymbolicName: "AADHAAR_NO",
      generatedTechnicalName: "SOL_AADHAAR_NO",
      storedDataType: "TEXT",
    };

    it("does not render Hidden, Disabled, or Read-only when boolean flags are undefined or null", () => {
      const fieldWithUndefined = {
        id: "f-test-1",
        sectionId: "sec-1",
        propertyId: "prop-aadhaar",
        controlType: "TEXT_INPUT",
        // isVisible, isEnabled, isEditable are undefined
      };

      const { unmount } = render(
        <FieldCard
          field={fieldWithUndefined}
          property={dummyProp}
          formType="ADD_CASE"
          isSelected={false}
          onSelect={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onMoveSection={() => {}}
          onRemove={() => {}}
          isFirst={true}
          isLast={true}
        />
      );

      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
      expect(screen.queryByText("Required")).not.toBeInTheDocument();

      unmount();

      // Also verify with explicit nulls
      const fieldWithNulls = {
        id: "f-test-2",
        sectionId: "sec-1",
        propertyId: "prop-aadhaar",
        controlType: "TEXT_INPUT",
        isVisible: null,
        isEnabled: null,
        isEditable: null,
        isRequired: null,
      };

      render(
        <FieldCard
          field={fieldWithNulls}
          property={dummyProp}
          formType="ADD_CASE"
          isSelected={false}
          onSelect={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onMoveSection={() => {}}
          onRemove={() => {}}
          isFirst={true}
          isLast={true}
        />
      );

      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
      expect(screen.queryByText("Required")).not.toBeInTheDocument();
    });

    it("renders Required badge on ADD_CASE only when isRequired === true and never renders Hidden/Disabled/Read-only", () => {
      const { rerender } = render(
        <FieldCard
          field={{
            id: "f-test-3",
            sectionId: "sec-1",
            propertyId: "prop-aadhaar",
            controlType: "TEXT_INPUT",
            isRequired: false,
            isVisible: true,
            isEnabled: true,
            isEditable: true,
          }}
          property={dummyProp}
          formType="ADD_CASE"
          isSelected={false}
          onSelect={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onMoveSection={() => {}}
          onRemove={() => {}}
          isFirst={true}
          isLast={true}
        />
      );

      expect(screen.queryByText("Required")).not.toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();

      // Toggle to isRequired: true
      rerender(
        <FieldCard
          field={{
            id: "f-test-3",
            sectionId: "sec-1",
            propertyId: "prop-aadhaar",
            controlType: "TEXT_INPUT",
            isRequired: true,
            isVisible: true,
            isEnabled: true,
            isEditable: true,
          }}
          property={dummyProp}
          formType="ADD_CASE"
          isSelected={false}
          onSelect={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onMoveSection={() => {}}
          onRemove={() => {}}
          isFirst={true}
          isLast={true}
        />
      );

      expect(screen.getByText("Required")).toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
    });

    it("suppresses all static state badges (Required, Hidden, Disabled, Read-only) on CASE_VIEW", () => {
      render(
        <FieldCard
          field={{
            id: "f-test-4",
            sectionId: "sec-1",
            propertyId: "prop-aadhaar",
            controlType: "TEXT_INPUT",
            isRequired: true,
            isVisible: false,
            isEnabled: false,
            isEditable: false,
          }}
          property={dummyProp}
          formType="CASE_VIEW"
          isSelected={false}
          onSelect={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onMoveSection={() => {}}
          onRemove={() => {}}
          isFirst={true}
          isLast={true}
        />
      );

      // In CASE_VIEW, static state badges are completely suppressed
      expect(screen.queryByText("Required")).not.toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
      // But presentation control badge is rendered
      expect(screen.getByText("TEXT_INPUT")).toBeInTheDocument();
    });

    it("proves a newly placed field from palette in FormDesigner does not show Hidden/Disabled/Read-only in ADD_CASE or CASE_VIEW", () => {
      // 1. ADD_CASE FormDesigner
      const addCaseAggregate = {
        form: mockForms[0],
        tabs: [{ id: "tab-1", formId: "form-add-1", tabKey: "tab_1", title: "Tab 1", displayOrder: 1 }],
        sections: [{ id: "sec-1", formId: "form-add-1", tabId: "tab-1", sectionKey: "sec_1", title: "Section 1", displayOrder: 1 }],
        fields: [],
      };

      const { unmount } = render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={addCaseAggregate}
          properties={[dummyProp]}
          onBackToLanding={() => {}}
        />
      );

      // Open palette and add field
      fireEvent.click(screen.getByRole("button", { name: "+ Add Field" }));
      const combobox1 = screen.getByRole("combobox", { name: /Available Properties/i });
      fireEvent.click(combobox1);
      fireEvent.click(screen.getByRole("option", { name: /Aadhaar Card No\./i }));
      fireEvent.click(screen.getByRole("button", { name: "Add Field to Form" }));

      // Field is placed on canvas
      expect(screen.getAllByText("Aadhaar Card No.")[0]).toBeInTheDocument();
      // Proves NO negative badges appear
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
      expect(screen.queryByText("Required")).not.toBeInTheDocument();

      // Inspector displays Mandatory checkbox; checking it toggles Required badge
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      fireEvent.click(mandatoryCheckbox);
      expect(screen.getByText("Required")).toBeInTheDocument();

      unmount();

      // 2. CASE_VIEW FormDesigner
      const caseViewAggregate = {
        form: mockForms[1],
        tabs: [{ id: "tab-view-1", formId: "form-view-1", tabKey: "tab_view_1", title: "View Tab", displayOrder: 1 }],
        sections: [{ id: "sec-view-1", formId: "form-view-1", tabId: "tab-view-1", sectionKey: "sec_view_1", title: "View Section", displayOrder: 1 }],
        fields: [],
      };

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={caseViewAggregate}
          properties={[dummyProp]}
          onBackToLanding={() => {}}
        />
      );

      // Open palette and add field
      fireEvent.click(screen.getByRole("button", { name: "+ Add Field" }));
      const combobox2 = screen.getByRole("combobox", { name: /Available Properties/i });
      fireEvent.click(combobox2);
      fireEvent.click(screen.getByRole("option", { name: /Aadhaar Card No\./i }));
      fireEvent.click(screen.getByRole("button", { name: "Add Field to Form" }));

      // Field is placed on canvas
      expect(screen.getAllByText("Aadhaar Card No.")[0]).toBeInTheDocument();
      // Proves NO static badges appear on CASE_VIEW
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
      expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
      expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
      expect(screen.queryByText("Required")).not.toBeInTheDocument();
    });
  });

  describe("6. Semantic Reversible Edits Dirty-State Specification in FormDesigner", () => {
    const multiTabAggregate = {
      form: mockForms[0],
      tabs: [
        { id: "tab-1", formId: "form-add-1", tabKey: "tab_1", title: "Tab 1", displayOrder: 1 },
        { id: "tab-2", formId: "form-add-1", tabKey: "tab_2", title: "Tab 2", displayOrder: 2 },
      ],
      sections: [
        { id: "sec-1", formId: "form-add-1", tabId: "tab-1", sectionKey: "sec_1", title: "Section 1", displayOrder: 1 },
        { id: "sec-2", formId: "form-add-1", tabId: "tab-2", sectionKey: "sec_2", title: "Section 2", displayOrder: 1 },
      ],
      fields: [
        {
          id: "f-1",
          formId: "form-add-1",
          sectionId: "sec-1",
          propertyId: "prop-1",
          controlType: "TEXT_INPUT",
          isRequired: false,
          displayOrder: 1,
        },
        {
          id: "f-2",
          formId: "form-add-1",
          sectionId: "sec-2",
          propertyId: "prop-2",
          controlType: "TEXT_INPUT",
          isRequired: false,
          displayOrder: 1,
        },
      ],
    };

    it("add Tab → delete same Tab returns to clean", async () => {
      const setIsFormDirty = vi.fn();
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
          setIsFormDirty={setIsFormDirty}
        />
      );

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();

      // Add a Tab
      fireEvent.click(screen.getByRole("button", { name: "+ Add Tab" }));
      fireEvent.change(screen.getByRole("textbox", { name: /Tab Title/i }), { target: { value: "New Tab" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Tab" }));
      });

      // Form becomes dirty
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();

      // Delete the newly added Tab
      fireEvent.click(screen.getByRole("button", { name: "Delete tab New Tab" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Delete Tab" }));
      });

      // Form returns to clean!
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("rename Tab → rename back returns to clean", async () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Rename Tab 1
      fireEvent.click(screen.getByRole("button", { name: "Rename tab Tab 1" }));
      const input = screen.getByRole("textbox", { name: /New Tab Title/i });
      fireEvent.change(input, { target: { value: "Tab 1 Updated" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save Title" }));
      });

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();

      // Rename back to original "Tab 1"
      fireEvent.click(screen.getByRole("button", { name: "Rename tab Tab 1 Updated" }));
      const inputBack = screen.getByRole("textbox", { name: /New Tab Title/i });
      fireEvent.change(inputBack, { target: { value: "Tab 1" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save Title" }));
      });

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("reorder Tabs → restore original order returns to clean", async () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Move Tab 1 right
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Move tab Tab 1 right" }));
      });
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Move Tab 1 left (back to position 1)
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Move tab Tab 1 left" }));
      });
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("add Section → delete same Section returns to clean", async () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Add a section
      fireEvent.click(screen.getByRole("button", { name: "+ Add Section" }));
      const sectionInput = screen.getByRole("textbox", { name: /Section Title/i });
      fireEvent.change(sectionInput, { target: { value: "New Unsaved Section" } });
      fireEvent.click(screen.getByRole("button", { name: "Add Section" }));

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Delete the unsaved section
      const deleteButtons = screen.getAllByRole("button", { name: "Delete Section" });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);
      // Confirm modal
      await act(async () => {
        const confirmDelete = screen.getAllByRole("button", { name: "Delete Section" });
        fireEvent.click(confirmDelete[confirmDelete.length - 1]);
      });

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("rename Section → rename back returns to clean", async () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Rename Section 1
      const renameButtons = screen.getAllByRole("button", { name: "Rename" });
      fireEvent.click(renameButtons[0]);
      const secInput = screen.getByDisplayValue("Section 1");
      fireEvent.change(secInput, { target: { value: "Section 1 Renamed" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
      });

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Rename back to Section 1
      const renameButtonsAfter = await screen.findAllByRole("button", { name: "Rename" });
      fireEvent.click(renameButtonsAfter[0]);
      const secInputBack = screen.getByDisplayValue("Section 1 Renamed");
      fireEvent.change(secInputBack, { target: { value: "Section 1" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
      });

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("move Section → move back returns to clean", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Move Section 1 from Tab 1 to Tab 2
      const moveSectionButtons = screen.getAllByRole("button", { name: "Move to Tab" });
      fireEvent.click(moveSectionButtons[0]);
      const selectTab = screen.getByRole("combobox", { name: /Target Tab/i });
      fireEvent.click(selectTab);
      fireEvent.click(screen.getByRole("option", { name: /Tab 2/i }));
      fireEvent.click(screen.getByRole("button", { name: "Move Section" }));

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Switch to Tab 2 and move Section 1 back to Tab 1
      fireEvent.click(screen.getByRole("button", { name: "Tab 2" }));
      // Section 1 is the second section on Tab 2
      const moveButtonsTab2 = screen.getAllByRole("button", { name: "Move to Tab" });
      fireEvent.click(moveButtonsTab2[moveButtonsTab2.length - 1]);
      const selectTabBack = screen.getByRole("combobox", { name: /Target Tab/i });
      fireEvent.click(selectTabBack);
      fireEvent.click(screen.getByRole("option", { name: /Tab 1/i }));
      fireEvent.click(screen.getByRole("button", { name: "Move Section" }));

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("add Field → remove same Field returns to clean", () => {
      const extraProp = {
        id: "prop-extra",
        label: "Extra Property",
        localSymbolicName: "EXTRA",
        generatedTechnicalName: "SOL_EXTRA",
        storedDataType: "TEXT",
        formatPreset: "NONE",
        cardinality: "SINGLE",
      };

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={[...mockProperties, extraProp]}
          onBackToLanding={() => {}}
        />
      );

      // Add Field to Section 1
      const addFieldButtons = screen.getAllByRole("button", { name: "+ Add Field" });
      fireEvent.click(addFieldButtons[0]);
      const combobox = screen.getByRole("combobox", { name: /Available Properties/i });
      fireEvent.click(combobox);
      fireEvent.click(screen.getByRole("option", { name: /Extra Property/i }));
      fireEvent.click(screen.getByRole("button", { name: "Add Field to Form" }));

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Remove the newly placed field
      fireEvent.click(screen.getByRole("button", { name: "Remove field Extra Property from form" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove Field" }));

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("move Field → move back returns to clean", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Move Customer Name from Section 1 to Section 2
      fireEvent.click(screen.getByRole("button", { name: "Move field Customer Name to another section" }));
      fireEvent.click(screen.getByText("Section 2"));

      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Move Customer Name back to Section 1
      fireEvent.click(screen.getByRole("button", { name: "Tab 2" }));
      fireEvent.click(screen.getByRole("button", { name: "Move field Customer Name to another section" }));
      fireEvent.click(screen.getByText("Section 1"));

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("reorder Field → restore original position returns to clean", () => {
      const singleSectionTwoFieldsAggregate = {
        ...multiTabAggregate,
        fields: [
          { ...multiTabAggregate.fields[0], sectionId: "sec-1", displayOrder: 1 },
          { ...multiTabAggregate.fields[1], sectionId: "sec-1", displayOrder: 2 },
        ],
      };

      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={singleSectionTwoFieldsAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Move Customer Name down
      fireEvent.click(screen.getByRole("button", { name: "Move field Customer Name down" }));
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Move Customer Name back up
      fireEvent.click(screen.getByRole("button", { name: "Move field Customer Name up" }));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("ADD_CASE Mandatory false → true → false returns to clean", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          selectedFieldId="f-1"
          onBackToLanding={() => {}}
        />
      );

      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      // Toggle Mandatory true
      fireEvent.click(mandatoryCheckbox);
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Toggle Mandatory back to false
      fireEvent.click(mandatoryCheckbox);
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("control type A → B → A returns to clean", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          selectedFieldId="f-1"
          onBackToLanding={() => {}}
        />
      );

      const controlCombobox = screen.getByRole("combobox", { name: /Control Type/i });
      fireEvent.click(controlCombobox);
      fireEvent.click(screen.getByRole("option", { name: "TEXTAREA" }));
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Switch back to TEXT_INPUT
      fireEvent.click(controlCombobox);
      fireEvent.click(screen.getByRole("option", { name: "TEXT_INPUT" }));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("selecting fields and switching tabs does not affect dirty state", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();

      // Tab 1 is active: select Customer Name
      fireEvent.click(screen.getByText("Customer Name"));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();

      // Switch to Tab 2: select Customer Email
      fireEvent.click(screen.getByRole("button", { name: "Tab 2" }));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("Customer Email"));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();

      // Switch back to Tab 1
      fireEvent.click(screen.getByRole("button", { name: "Tab 1" }));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("opening and closing dialogs does not affect dirty state", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          onBackToLanding={() => {}}
        />
      );

      // Open and cancel Add Section modal
      fireEvent.click(screen.getByRole("button", { name: "+ Add Section" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();

      // Open and cancel Add Field palette modal
      const addFieldButtons = screen.getAllByRole("button", { name: "+ Add Field" });
      fireEvent.click(addFieldButtons[0]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
    });

    it("Discard restores persisted baseline and returns to clean", () => {
      render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          selectedFieldId="f-1"
          onBackToLanding={() => {}}
        />
      );

      // Make a change
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      fireEvent.click(mandatoryCheckbox);
      expect(screen.getByRole("button", { name: "Discard Changes" })).toBeInTheDocument();

      // Click Discard Changes
      fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("Save establishes newly returned canonical aggregate as the new clean baseline", async () => {
      const onSaveForm = vi.fn().mockResolvedValue(undefined);
      const { rerender } = render(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={1}
          formAggregate={multiTabAggregate}
          properties={mockProperties}
          selectedFieldId="f-1"
          onBackToLanding={() => {}}
          onSaveForm={onSaveForm}
        />
      );

      // Make a change
      const mandatoryCheckbox = screen.getByRole("checkbox", { name: /Mandatory/i });
      fireEvent.click(mandatoryCheckbox);
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();

      // Click Save Changes
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      });
      expect(onSaveForm).toHaveBeenCalled();

      // Simulate parent supplying updated canonical aggregate with isRequired: true
      const updatedAggregate = {
        ...multiTabAggregate,
        fields: [
          { ...multiTabAggregate.fields[0], isRequired: true },
          multiTabAggregate.fields[1],
        ],
      };

      rerender(
        <FormDesigner
          solutionId="sol-1"
          expectedRevision={2}
          formAggregate={updatedAggregate}
          properties={mockProperties}
          selectedFieldId="f-1"
          onBackToLanding={() => {}}
          onSaveForm={onSaveForm}
        />
      );

      // Form is now clean against the new baseline!
      expect(screen.queryByRole("button", { name: "Discard Changes" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });
  });
});


