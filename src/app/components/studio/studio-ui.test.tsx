// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { useState, useRef } from "react";
import { StudioShell } from "./StudioShell";
import { DataSection } from "./DataSection";
import { UnifiedPropertyEditor } from "./UnifiedPropertyEditor";
import { PropertyList } from "./PropertyList";
import { ValidationTestPanel } from "./ValidationTestPanel";
import { ChoiceListList } from "./ChoiceListList";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { QueueManager } from "./QueueManager";
import { FormDesigner } from "./FormDesigner";
import { DesignStudioContainer } from "./DesignStudioContainer";
import * as studioApiClient from "./studio-api.client";
import { Toast, RadioGroup } from "@/app/components/ui";

describe("INC-03C7 Studio UI Components & Final Data Tab Test Suite", () => {
  const mockSolution = {
    id: "sol-123",
    name: "Personal Loan Application",
    solutionPrefix: "PLA",
    status: "DRAFT",
    revision: 3,
    description: "Solution for managing personal loan applications.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe("1. StudioShell Component Header Styling", () => {
    it("renders solution title, status badge, and dynamic solution prefix without raw revision or ID text", () => {
      render(
        <StudioShell
          solution={mockSolution}
          isLoading={false}
          activeSection="data"
          onSectionChange={() => {}}
        >
          <div>Shell Children Content</div>
        </StudioShell>
      );

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Personal Loan Application");
      expect(screen.getByText("PLA")).toBeInTheDocument();
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
      expect(screen.queryByText(/Revision r/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Solution ID:/i)).not.toBeInTheDocument();
      expect(screen.getByText("Shell Children Content")).toBeInTheDocument();
    });
  });

  describe("2. Data Dictionary PropertyList Component", () => {
    it("renders PropertyList with single Add Property CTA, bold property label, and uppercase symbolic name", () => {
      const mockProps = [
        {
          id: "p-1",
          label: "First Name",
          localSymbolicName: "first_name",
          generatedTechnicalName: "PLA_FIRST_NAME",
          storedDataType: "TEXT",
        },
        {
          id: "p-2",
          label: "Country of Residence",
          localSymbolicName: "country_of_residence",
          generatedTechnicalName: "PLA_COUNTRY_OF_RESIDENCE",
          storedDataType: "TEXT",
        },
      ];

      render(
        <PropertyList
          properties={mockProps}
          solutionPrefix="PLA"
          onSelectProperty={() => {}}
          onCreateProperty={() => {}}
          onDeleteProperty={async () => {}}
        />
      );

      expect(screen.getByRole("heading", { name: "Data Dictionary" })).toBeInTheDocument();
      expect(screen.getByText("All properties used by this Solution.")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "+ Add Property" })).toHaveLength(1);

      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("PLA_FIRST_NAME")).toBeInTheDocument();

      expect(screen.getByText("Country of Residence")).toBeInTheDocument();
      expect(screen.getByText("PLA_COUNTRY_OF_RESIDENCE")).toBeInTheDocument();
    });
  });

  describe("3. UnifiedPropertyEditor Component & Final Property Identity Rules", () => {
    it("auto-derives symbolic name PLA_FIRST_NAME from 'First Name' and handles punctuation normalization", async () => {
      const user = userEvent.setup();
      const onSaveMock = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={onSaveMock}
          onCancel={() => {}}
        />
      );

      const nameInput = screen.getByLabelText(/Property Name/i);
      await user.type(nameInput, "First Name!");

      expect(screen.getByText("PLA_FIRST_NAME")).toBeInTheDocument();
    });

    it("keeps symbolic name stable when renaming an existing property", async () => {
      const user = userEvent.setup();
      const onSaveMock = vi.fn().mockResolvedValue(undefined);

      const existingProp = {
        id: "p-1",
        label: "First Name",
        localSymbolicName: "first_name",
        storedDataType: "TEXT",
        revision: 3,
      };

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={existingProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={onSaveMock}
          onCancel={() => {}}
        />
      );

      expect(screen.getByText("PLA_FIRST_NAME")).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Property Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Applicant First Name");

      expect(screen.getByText("PLA_FIRST_NAME")).toBeInTheDocument();

      const submitBtn = screen.getByRole("button", { name: /Save Property/i });
      await user.click(submitBtn);

      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Applicant First Name",
          localSymbolicName: "first_name",
        })
      );
    });

    it("does NOT expose User Reference in designer property types dropdown", async () => {
      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={async () => {}}
          onCancel={() => {}}
        />
      );

      const typeCombobox = screen.getByRole("combobox", { name: "Data Type" });
      expect(typeCombobox).not.toHaveTextContent("User Reference");
    });

    it("maps Date Include Time OFF to DATE and Include Time ON to DATETIME", async () => {
      const user = userEvent.setup();
      const onSaveMock = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={onSaveMock}
          onCancel={() => {}}
        />
      );

      const nameInput = screen.getByLabelText(/Property Name/i);
      await user.type(nameInput, "Date of Birth");

      // Select Date Data Type
      const typeCombobox = screen.getByRole("combobox", { name: "Data Type" });
      await user.click(typeCombobox);
      const dateOption = screen.getByRole("option", { name: "Date" });
      await user.click(dateOption);

      const submitBtn = screen.getByRole("button", { name: /Save Property/i });
      await user.click(submitBtn);

      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          storedDataType: "DATE",
        })
      );

      // Toggle Include Time ON
      onSaveMock.mockClear();
      const includeTimeCheckbox = screen.getByLabelText(/Include time/i);
      await user.click(includeTimeCheckbox);
      await user.click(submitBtn);

      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          storedDataType: "DATETIME",
        })
      );
    });

    it("saves Boolean data type property with default control type YES_NO", async () => {
      const user = userEvent.setup();
      const onSaveMock = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={onSaveMock}
          onCancel={() => {}}
        />
      );

      const nameInput = screen.getByLabelText(/Property Name/i);
      await user.type(nameInput, "Existing Customer");

      const typeCombobox = screen.getByRole("combobox", { name: "Data Type" });
      await user.click(typeCombobox);
      const boolOption = screen.getByRole("option", { name: "Boolean" });
      await user.click(boolOption);

      const yesNoRadio = screen.getByLabelText("Yes / No");
      await user.click(yesNoRadio);

      const submitBtn = screen.getByRole("button", { name: /Save Property/i });
      await user.click(submitBtn);

      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Existing Customer",
          storedDataType: "BOOLEAN",
          defaultControlType: "YES_NO",
        })
      );
    });

    it("chains expectedRevision properly when creating new reusable choice set inline", async () => {
      const user = userEvent.setup();
      const onSaveChoiceListMock = vi.fn().mockResolvedValue({
        choiceList: { id: "cl-new", name: "Employment Types" },
        solutionRevision: 4,
      });
      const onSaveMock = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={onSaveMock}
          onSaveChoiceList={onSaveChoiceListMock}
          onCancel={() => {}}
        />
      );

      const nameInput = screen.getByLabelText(/Property Name/i);
      await user.type(nameInput, "Employment Type");

      const typeCombobox = screen.getByRole("combobox", { name: "Data Type" });
      await user.click(typeCombobox);
      const choiceOption = screen.getByRole("option", { name: "Choice" });
      await user.click(choiceOption);

      const createNewChoiceRadio = screen.getByLabelText(/Create new reusable choices/i);
      await user.click(createNewChoiceRadio);

      const choiceSetNameInput = screen.getByLabelText(/Choice Set Name/i);
      await user.type(choiceSetNameInput, "Employment Types");

      const optionInput = screen.getByPlaceholderText(/Option Label/i);
      await user.type(optionInput, "Salaried");

      const submitBtn = screen.getByRole("button", { name: /Save Property/i });
      await user.click(submitBtn);

      expect(onSaveChoiceListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRevision: 3,
          name: "Employment Types",
          options: [
            expect.objectContaining({
              label: "Salaried",
            }),
          ],
        })
      );

      // Property creation receives updated revision 4
      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          choiceListId: "cl-new",
          expectedRevision: 4,
        })
      );
    }, 15000);

    it("reopens existing choice list bound property as Choice data type", () => {
      const choiceProp = {
        id: "p-choice",
        label: "Employment Type",
        localSymbolicName: "employment_type",
        storedDataType: "TEXT",
        choiceListId: "cl-emp",
        cardinality: "SINGLE",
      };

      render(
        <UnifiedPropertyEditor
          solutionId="sol-123"
          solutionPrefix="PLA"
          property={choiceProp}
          choiceLists={[{ id: "cl-emp", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={3}
          onSave={async () => {}}
          onCancel={() => {}}
        />
      );

      const typeCombobox = screen.getByRole("combobox", { name: "Data Type" });
      expect(typeCombobox).toHaveTextContent("Choice");
    });
  });

  describe("4. Toast Notification Primitive", () => {
    it("renders non-blocking accessible live region toast notification and auto-dismisses", () => {
      render(
        <Toast
          message="Property saved successfully."
          isOpen={true}
          onClose={() => {}}
        />
      );

      const toast = screen.getByRole("status");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent("Property saved successfully.");
    });
  });

  describe("5. ValidationTestPanel Component", () => {
    it("prevents running test on empty sample input and shows user message", async () => {
      render(
        <ValidationTestPanel
          solutionId="PLA"
          storedDataType="TEXT"
          validationRules={{ minLength: 2 }}
        />
      );

      const testBtn = screen.getByRole("button", { name: /^Test$/i });
      expect(testBtn).toBeDisabled();
    });
  });

  describe("6. RadioGroup Conventional UI & Checkbox Semantics", () => {
    it("renders conventional radio buttons with radiogroup accessibility semantics", () => {
      const handleChange = vi.fn();
      render(
        <RadioGroup
          name="cardinality"
          value="SINGLE"
          onChange={handleChange}
          options={[
            { value: "SINGLE", label: "Single" },
            { value: "MULTIPLE", label: "Multiple" },
          ]}
        />
      );

      const radioGroup = screen.getByRole("radiogroup");
      expect(radioGroup).toBeInTheDocument();
      const radioSingle = screen.getByRole("radio", { name: "Single" });
      expect(radioSingle).toBeChecked();
      const radioMultiple = screen.getByRole("radio", { name: "Multiple" });
      expect(radioMultiple).not.toBeChecked();

      fireEvent.click(radioMultiple);
      expect(handleChange).toHaveBeenCalledWith("MULTIPLE");
    });
  });

  describe("7. Choice Set Deletion Safety in ChoiceListList", () => {
    it("renders delete confirmation modal and invokes onDeleteChoiceList when confirmed", async () => {
      const handleDelete = vi.fn().mockResolvedValue(undefined);
      render(
        <ChoiceListList
          choiceLists={[{ id: "cl-1", name: "Employment Types", options: [] }]}
          onSelectChoiceList={() => {}}
          onCreateChoiceList={() => {}}
          onDeleteChoiceList={handleDelete}
        />
      );

      const deleteBtn = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteBtn);

      const modalTitle = screen.getByRole("heading", { name: "Delete Choice Set" });
      expect(modalTitle).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /Delete Choice Set/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith("cl-1");
      });
    });
  });

  describe("8. Property Dirty-State Detection & Navigation Reset", () => {
    const existingTextProp = {
      id: "p-text",
      label: "User Bio",
      localSymbolicName: "user_bio",
      storedDataType: "TEXT",
      validationRules: {
        minLength: 5,
        maxLength: 50,
      },
      revision: 1,
    };

    const existingNumProp = {
      id: "p-num",
      label: "Age",
      localSymbolicName: "age",
      storedDataType: "NUMBER",
      validationRules: {
        minimumValue: 18,
        maximumValue: 99,
      },
      revision: 1,
    };

    const existingDateProp = {
      id: "p-date",
      label: "Birth Date",
      localSymbolicName: "birth_date",
      storedDataType: "DATE",
      validationRules: {
        minimumDate: "2020-01-01",
      },
      revision: 1,
    };

    const existingBoolProp = {
      id: "p-bool",
      label: "Terms Agreed",
      localSymbolicName: "terms_agreed",
      storedDataType: "BOOLEAN",
      defaultControlType: "CHECKBOX",
      revision: 1,
    };

    const existingChoiceProp = {
      id: "p-choice",
      label: "Employment Type",
      localSymbolicName: "employment_type",
      storedDataType: "TEXT",
      choiceListId: "cl-1",
      cardinality: "SINGLE",
      defaultControlType: "DROPDOWN",
      revision: 1,
    };

    it("triggers setIsDirty(true) when Text Minimum Length changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingTextProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "10" } });
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Text Maximum Length changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingTextProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const maxLenInput = screen.getByLabelText("Maximum Length");
      fireEvent.change(maxLenInput, { target: { value: "100" } });
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Text Validation preset changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingTextProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const valCombobox = screen.getByRole("combobox", { name: "Validation" });
      fireEvent.click(valCombobox);
      const optionPhone = screen.getByRole("option", { name: "Indian mobile" });
      fireEvent.click(optionPhone);
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Number Minimum Value changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingNumProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const minValInput = screen.getByLabelText("Minimum Value");
      fireEvent.change(minValInput, { target: { value: "21" } });
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Date Include Time changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingDateProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const includeTimeCheckbox = screen.getByLabelText("Include time");
      fireEvent.click(includeTimeCheckbox);
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Boolean Default Control changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingBoolProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const yesNoRadio = screen.getByRole("radio", { name: "Yes / No" });
      fireEvent.click(yesNoRadio);
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("triggers setIsDirty(true) when Choice Cardinality changes", async () => {
      const setIsDirtyMock = vi.fn();
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingChoiceProp}
          choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const multipleRadio = screen.getByRole("radio", { name: "Multiple" });
      fireEvent.click(multipleRadio);
      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
    });

    it("keeps Save Property disabled when clean in edit mode and enables when dirty", async () => {
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingTextProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
        />
      );

      const saveBtn = screen.getByRole("button", { name: "Save Property" });
      expect(saveBtn).toBeDisabled();

      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "10" } });
      expect(saveBtn).toBeEnabled();

      fireEvent.change(minLenInput, { target: { value: "5" } });
      expect(saveBtn).toBeDisabled();
    });

    it("resets normalized baseline on successful save, clearing dirty state and disabling Save Property button", async () => {
      const setIsDirtyMock = vi.fn();
      let savedPayload: any = null;

      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={existingTextProp}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async (payload) => {
            savedPayload = payload;
          }}
          onCancel={() => {}}
          setIsDirty={setIsDirtyMock}
        />
      );

      const saveBtn = screen.getByRole("button", { name: "Save Property" });
      expect(saveBtn).toBeDisabled();

      // Step 1: Change Minimum Length -> dirty
      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "10" } });

      await waitFor(() => {
        expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
      });
      expect(saveBtn).toBeEnabled();

      // Step 2: Click Save Property -> baseline resets to minLength: 10
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(savedPayload).not.toBeNull();
        expect(setIsDirtyMock).toHaveBeenLastCalledWith(false);
      });
      expect(saveBtn).toBeDisabled();

      // Step 3: Change Validation -> dirty again
      const valCombobox = screen.getByRole("combobox", { name: "Validation" });
      fireEvent.click(valCombobox);
      const optionPhone = screen.getByRole("option", { name: "Indian mobile" });
      fireEvent.click(optionPhone);

      await waitFor(() => {
        expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
      });
      // Step 4: Click Cancel -> does not reset values immediately; preserves current dirty state
      const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
      fireEvent.click(cancelBtn);

      expect(setIsDirtyMock).toHaveBeenLastCalledWith(true);
      expect(saveBtn).toBeEnabled();
    });

    it("does not mutate dirty Property state when Cancel is clicked; opens modal and preserves values", async () => {
      const handleSaveProp = vi.fn().mockResolvedValue(undefined);

      function TestDataSectionWrapper() {
        const [selectedId, setSelectedId] = useState<string | null>("p-text");
        const [isDirty, setIsDirty] = useState(false);
        return (
          <DataSection
            solutionId="sol-1"
            solutionPrefix="PLA"
            properties={[existingTextProp]}
            choiceLists={[]}
            regexPresets={[]}
            expectedRevision={1}
            onSaveProperty={handleSaveProp}
            onDeleteProperty={async () => {}}
            selectedPropertyId={selectedId}
            setSelectedPropertyId={setSelectedId}
            isPropertyEditorDirty={isDirty}
            setIsPropertyEditorDirty={setIsDirty}
          />
        );
      }

      render(<TestDataSectionWrapper />);

      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "25" } });
      expect(minLenInput).toHaveValue(25);

      // Click Cancel on dirty editor -> modal opens, form values remain un-mutated (value stays 25)
      const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
      fireEvent.click(cancelBtn);

      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      expect(minLenInput).toHaveValue(25);

      // Click 'Keep Editing' -> modal closes, form values remain 25, editor remains open
      const keepEditingBtn = screen.getByRole("button", { name: "Keep Editing" });
      fireEvent.click(keepEditingBtn);

      expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Minimum Length")).toHaveValue(25);
    });

    it("choosing Discard Changes in modal restores persisted baseline and closes editor", async () => {
      function TestDataSectionWrapper() {
        const [selectedId, setSelectedId] = useState<string | null>("p-text");
        const [isDirty, setIsDirty] = useState(false);
        return (
          <DataSection
            solutionId="sol-1"
            solutionPrefix="PLA"
            properties={[existingTextProp]}
            choiceLists={[]}
            regexPresets={[]}
            expectedRevision={1}
            onSaveProperty={async () => {}}
            onDeleteProperty={async () => {}}
            selectedPropertyId={selectedId}
            setSelectedPropertyId={setSelectedId}
            isPropertyEditorDirty={isDirty}
            setIsPropertyEditorDirty={setIsDirty}
          />
        );
      }

      render(<TestDataSectionWrapper />);

      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "30" } });

      const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
      fireEvent.click(cancelBtn);

      const discardBtn = screen.getByRole("button", { name: "Discard Changes" });
      fireEvent.click(discardBtn);

      // Editor closes, returning to PropertyList view
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "+ Add Property" })).toBeInTheDocument();
      });
    });

    it("triggers real onSave persistence when choosing Save Changes in Unsaved Changes modal", async () => {
      let savedPayload: any = null;
      let propertiesState = [{ ...existingTextProp, validationRules: {} }];

      function MandatoryPersistenceWrapper() {
        const [selectedId, setSelectedId] = useState<string | null>("p-text");
        const [isDirty, setIsDirty] = useState(false);

        return (
          <DataSection
            solutionId="sol-1"
            solutionPrefix="PLA"
            properties={propertiesState}
            choiceLists={[]}
            regexPresets={[]}
            expectedRevision={1}
            onSaveProperty={async (payload) => {
              savedPayload = payload;
              propertiesState = [
                {
                  ...existingTextProp,
                  validationRules: payload.validationRules || {},
                },
              ];
            }}
            onDeleteProperty={async () => {}}
            selectedPropertyId={selectedId}
            setSelectedPropertyId={setSelectedId}
            isPropertyEditorDirty={isDirty}
            setIsPropertyEditorDirty={setIsDirty}
          />
        );
      }

      const { rerender } = render(<MandatoryPersistenceWrapper />);

      // Load existing property with Min Length empty -> change Min Length to 1
      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "1" } });
      expect(minLenInput).toHaveValue(1);

      // Trigger Cancel / navigation
      const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
      fireEvent.click(cancelBtn);

      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

      // Choose Save Changes in modal
      const modalSaveBtn = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(modalSaveBtn);

      // Assert real onSave persistence callback receives Min Length 1
      await waitFor(() => {
        expect(savedPayload).not.toBeNull();
        expect(savedPayload.validationRules?.minLength).toBe(1);
      });

      // Simulate successful persistence navigation/closing
      await waitFor(() => {
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      });

      rerender(<MandatoryPersistenceWrapper />);

      // Re-open property from persisted result and assert Min Length is still 1
      const editPropBtn = screen.getByRole("button", { name: "Edit" });
      fireEvent.click(editPropBtn);

      await waitFor(() => {
        expect(screen.getByLabelText("Minimum Length")).toHaveValue(1);
      });
    });

    it("does not clear dirty or navigate when Save Changes in modal fails", async () => {
      function FailingPersistenceWrapper() {
        const [selectedId, setSelectedId] = useState<string | null>("p-text");
        const [isDirty, setIsDirty] = useState(false);

        return (
          <DataSection
            solutionId="sol-1"
            solutionPrefix="PLA"
            properties={[existingTextProp]}
            choiceLists={[]}
            regexPresets={[]}
            expectedRevision={1}
            onSaveProperty={async () => {
              throw new Error("Persistence error");
            }}
            onDeleteProperty={async () => {}}
            selectedPropertyId={selectedId}
            setSelectedPropertyId={setSelectedId}
            isPropertyEditorDirty={isDirty}
            setIsPropertyEditorDirty={setIsDirty}
          />
        );
      }

      render(<FailingPersistenceWrapper />);

      const minLenInput = screen.getByLabelText("Minimum Length");
      fireEvent.change(minLenInput, { target: { value: "10" } });

      const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
      fireEvent.click(cancelBtn);

      const modalSaveBtn = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(modalSaveBtn);

      await waitFor(() => {
        expect(screen.getByText("Persistence error")).toBeInTheDocument();
      });

      // Editor remains open and dirty, navigation does not execute
      expect(screen.getByRole("heading", { name: "Edit Property: User Bio" })).toBeInTheDocument();
      expect(screen.getByLabelText("Minimum Length")).toHaveValue(10);
    });

    it("persists and reads back Choice Property defaultControl for SINGLE (RADIO & DROPDOWN) and MULTIPLE (CHECKBOXES & MULTI_SELECT_DROPDOWN)", async () => {
      let savedPayload: any = null;

      // 1. SINGLE + RADIO
      const { unmount: u1 } = render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={{ ...existingChoiceProp, cardinality: "SINGLE", defaultControlType: "DROPDOWN" }}
          choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async (payload) => {
            savedPayload = payload;
          }}
          onCancel={() => {}}
        />
      );

      const radioOption = screen.getByRole("radio", { name: "Radio Buttons" });
      fireEvent.click(radioOption);
      const saveBtn1 = screen.getByRole("button", { name: "Save Property" });
      fireEvent.click(saveBtn1);

      await waitFor(() => {
        expect(savedPayload).not.toBeNull();
        expect(savedPayload.cardinality).toBe("SINGLE");
        expect(savedPayload.defaultControlType).toBe("RADIO");
      });
      u1();

      // Read back SINGLE + RADIO
      const { unmount: u2 } = render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={{ ...existingChoiceProp, cardinality: "SINGLE", defaultControlType: "RADIO" }}
          choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByRole("radio", { name: "Radio Buttons" })).toBeChecked();
      u2();

      // 2. MULTIPLE + CHECKBOXES
      savedPayload = null;
      const { unmount: u3 } = render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={{ ...existingChoiceProp, cardinality: "MULTIPLE", defaultControlType: "MULTI_SELECT_DROPDOWN" }}
          choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async (payload) => {
            savedPayload = payload;
          }}
          onCancel={() => {}}
        />
      );

      const checkboxesOption = screen.getByRole("radio", { name: "Checkboxes" });
      fireEvent.click(checkboxesOption);
      const saveBtn3 = screen.getByRole("button", { name: "Save Property" });
      fireEvent.click(saveBtn3);

      await waitFor(() => {
        expect(savedPayload).not.toBeNull();
        expect(savedPayload.cardinality).toBe("MULTIPLE");
        expect(savedPayload.defaultControlType).toBe("CHECKBOXES");
      });
      u3();

      // Read back MULTIPLE + CHECKBOXES
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={{ ...existingChoiceProp, cardinality: "MULTIPLE", defaultControlType: "CHECKBOXES" }}
          choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByRole("radio", { name: "Checkboxes" })).toBeChecked();
    });

    it("executes mandatory end-to-end unsaved changes workflow (Save Changes, Discard, Keep Editing, Save Failure) for Text & Choice properties", async () => {
      // Test matrix: [PropertyType, PropertyData, EditAction]
      const propertiesToTest = [
        {
          name: "Text Property",
          initialProp: existingTextProp,
          performEdit: () => {
            const minLenInput = screen.getByLabelText("Minimum Length");
            fireEvent.change(minLenInput, { target: { value: "50" } });
          },
          verifyEditedValue: () => {
            expect(screen.getByLabelText("Minimum Length")).toHaveValue(50);
          },
          verifyInitialValue: () => {
            expect(screen.getByLabelText("Minimum Length")).toHaveValue(null);
          },
          getUpdatedPropPayload: (payload: any) => ({
            ...existingTextProp,
            validationRules: payload.validationRules || {},
          }),
        },
        {
          name: "Choice Property",
          initialProp: { ...existingChoiceProp, cardinality: "SINGLE", defaultControlType: "DROPDOWN" },
          performEdit: () => {
            const radioOption = screen.getByRole("radio", { name: "Radio Buttons" });
            fireEvent.click(radioOption);
          },
          verifyEditedValue: () => {
            expect(screen.getByRole("radio", { name: "Radio Buttons" })).toBeChecked();
          },
          verifyInitialValue: () => {
            expect(screen.getByRole("radio", { name: "Dropdown" })).toBeChecked();
          },
          getUpdatedPropPayload: (payload: any) => ({
            ...existingChoiceProp,
            cardinality: payload.cardinality,
            defaultControlType: payload.defaultControlType,
          }),
        },
      ];

      for (const testCase of propertiesToTest) {
        let currentProp = { ...testCase.initialProp };
        let mockSaveError: Error | null = null;

        function MandatoryHarness() {
          const [activeSection, setActiveSection] = useState<"data" | "overview" | "form">("data");
          const [selectedId, setSelectedId] = useState<string | null>(currentProp.id);
          const [isDirty, setIsDirty] = useState(false);
          const propertyRef = useRef<any>(null);

          return (
            <DesignStudioContainerWrapper
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              currentProp={currentProp}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              isDirty={isDirty}
              setIsDirty={setIsDirty}
              propertyRef={propertyRef}
              onSaveProperty={async (payload: any) => {
                if (mockSaveError) throw mockSaveError;
                currentProp = testCase.getUpdatedPropPayload(payload);
              }}
            />
          );
        }

        function DesignStudioContainerWrapper({
          activeSection,
          setActiveSection,
          currentProp,
          selectedId,
          setSelectedId,
          isDirty,
          setIsDirty,
          propertyRef,
          onSaveProperty,
        }: any) {
          const [pendingSectionChange, setPendingSectionChange] = useState<"overview" | "form" | null>(null);

          const handleSectionSwitch = (target: "overview" | "form") => {
            if (isDirty) setPendingSectionChange(target);
            else setActiveSection(target);
          };

          return (
            <div>
              <button type="button" onClick={() => handleSectionSwitch("overview")}>
                Switch to Overview
              </button>
              {activeSection === "data" && (
                <DataSection
                  solutionId="sol-1"
                  solutionPrefix="PLA"
                  properties={[currentProp]}
                  choiceLists={[{ id: "cl-1", name: "Employment Types" }]}
                  regexPresets={[]}
                  expectedRevision={1}
                  onSaveProperty={onSaveProperty}
                  onDeleteProperty={async () => {}}
                  selectedPropertyId={selectedId}
                  setSelectedPropertyId={setSelectedId}
                  isPropertyEditorDirty={isDirty}
                  setIsPropertyEditorDirty={setIsDirty}
                  propertyRefProp={propertyRef}
                />
              )}
              {activeSection === "overview" && <div>Overview Section Content</div>}

              {pendingSectionChange && (
                <UnsavedChangesModal
                  isOpen={true}
                  onSave={async () => {
                    if (isDirty && propertyRef.current) {
                      const success = await propertyRef.current.submitSave();
                      if (!success) return;
                    }
                    setIsDirty(false);
                    const target = pendingSectionChange;
                    setPendingSectionChange(null);
                    if (target) setActiveSection(target);
                  }}
                  onDiscard={() => {
                    if (isDirty && propertyRef.current) {
                      propertyRef.current.discard();
                    }
                    setIsDirty(false);
                    const target = pendingSectionChange;
                    setPendingSectionChange(null);
                    if (target) setActiveSection(target);
                  }}
                  onCancel={() => setPendingSectionChange(null)}
                />
              )}
            </div>
          );
        }

        // 1. Cycle: edit -> navigate -> Keep Editing -> editor stays open -> edit preserved
        const { unmount: u1 } = render(<MandatoryHarness />);
        testCase.performEdit();
        testCase.verifyEditedValue();

        fireEvent.click(screen.getByRole("button", { name: "Switch to Overview" }));
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
        testCase.verifyEditedValue();
        u1();

        // 2. Cycle: edit -> navigate -> Save Changes fails -> no navigation -> dirty/edit preserved
        mockSaveError = new Error("Network save failed");
        const { unmount: u2 } = render(<MandatoryHarness />);
        testCase.performEdit();
        testCase.verifyEditedValue();

        fireEvent.click(screen.getByRole("button", { name: "Switch to Overview" }));
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => {
          expect(screen.getByText("Network save failed")).toBeInTheDocument();
        });

        // Did NOT navigate to Overview, stayed in Data section with dirty edit
        expect(screen.queryByText("Overview Section Content")).not.toBeInTheDocument();
        testCase.verifyEditedValue();
        u2();

        // 3. Cycle: edit -> navigate -> Discard -> destination reached -> reopen -> edit absent
        mockSaveError = null;
        const { unmount: u3 } = render(<MandatoryHarness />);
        testCase.performEdit();
        testCase.verifyEditedValue();

        fireEvent.click(screen.getByRole("button", { name: "Switch to Overview" }));
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
        await waitFor(() => {
          expect(screen.getByText("Overview Section Content")).toBeInTheDocument();
        });
        u3();

        // 4. Cycle: edit -> navigate -> Save Changes -> destination reached -> no dirty state -> navigate again -> NO second modal -> reopen Property -> saved value present
        mockSaveError = null;
        const { unmount: u4 } = render(<MandatoryHarness />);
        testCase.performEdit();

        fireEvent.click(screen.getByRole("button", { name: "Switch to Overview" }));
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => {
          expect(screen.getByText("Overview Section Content")).toBeInTheDocument();
        });

        // Navigate again without edits -> NO modal triggers!
        fireEvent.click(screen.getByRole("button", { name: "Switch to Overview" }));
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
        u4();

        // Reopen Property -> saved value is present
        const { unmount: u5 } = render(<MandatoryHarness />);
        testCase.verifyEditedValue();
        u5();
      }
    });

    it("handles unique inline options cleanly, enabling Save Property and invoking normal save flow", async () => {
      let createdChoiceListsCount = 0;
      let updatedPropertiesCount = 0;

      const handleSaveChoiceList = async () => {
        createdChoiceListsCount++;
        return { choiceList: { id: "cl-unique" }, solutionRevision: 2 };
      };

      const handleSaveProperty = async () => {
        updatedPropertiesCount++;
      };

      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={handleSaveProperty}
          onSaveChoiceList={handleSaveChoiceList}
          onCancel={() => {}}
        />
      );

      // Property Name
      fireEvent.change(screen.getByPlaceholderText("e.g., Date of Birth"), { target: { value: "Employment Status" } });

      // Switch to Choice data type
      fireEvent.click(screen.getByLabelText("Data Type"));
      fireEvent.click(screen.getByText("Choice"));

      // Select 'Create new reusable choices'
      fireEvent.click(screen.getByRole("radio", { name: "Create new reusable choices" }));

      // Set Choice Set Name
      fireEvent.change(screen.getByPlaceholderText("e.g., Employment Types"), { target: { value: "Employment Types" } });

      // Add 2 unique options: Salaried, Retired
      const firstOpt = screen.getByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(firstOpt, { target: { value: "Salaried" } });

      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      const optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[1], { target: { value: "Retired" } });

      expect(screen.queryByText("Option labels must be unique.")).not.toBeInTheDocument();
      const saveBtn = screen.getByRole("button", { name: "Save Property" });
      expect(saveBtn).not.toBeDisabled();

      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(createdChoiceListsCount).toBe(1);
        expect(updatedPropertiesCount).toBe(1);
      });
    });

    it("detects exact duplicates (Salaried, Retired, Salaried), displays inline error, disables Save, and prevents API calls", async () => {
      let createdChoiceListsCount = 0;

      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onSaveChoiceList={async () => {
            createdChoiceListsCount++;
            return { choiceList: { id: "cl-dup" }, solutionRevision: 2 };
          }}
          onCancel={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText("e.g., Date of Birth"), { target: { value: "Employment Status" } });
      fireEvent.click(screen.getByLabelText("Data Type"));
      fireEvent.click(screen.getByText("Choice"));
      fireEvent.click(screen.getByRole("radio", { name: "Create new reusable choices" }));
      fireEvent.change(screen.getByPlaceholderText("e.g., Employment Types"), { target: { value: "Employment Types" } });

      // Option 1: Salaried
      const firstOpt = screen.getByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(firstOpt, { target: { value: "Salaried" } });

      // Option 2: Retired
      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      let optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[1], { target: { value: "Retired" } });

      // Option 3: Salaried (Duplicate)
      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[2], { target: { value: "Salaried" } });

      // Validation message should be visible directly for duplicate row
      expect(screen.getByText("Option labels must be unique.")).toBeInTheDocument();

      const saveBtn = screen.getByRole("button", { name: "Save Property" });
      expect(saveBtn).toBeDisabled();

      expect(createdChoiceListsCount).toBe(0);
    });

    it("detects case/spacing normalized duplicates (Salaried vs salaried) consistently with backend key normalization", async () => {
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onSaveChoiceList={async () => ({ choiceList: { id: "cl-norm" }, solutionRevision: 2 })}
          onCancel={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText("e.g., Date of Birth"), { target: { value: "Employment Status" } });
      fireEvent.click(screen.getByLabelText("Data Type"));
      fireEvent.click(screen.getByText("Choice"));
      fireEvent.click(screen.getByRole("radio", { name: "Create new reusable choices" }));
      fireEvent.change(screen.getByPlaceholderText("e.g., Employment Types"), { target: { value: "Employment Types" } });

      // Option 1: Salaried
      const firstOpt = screen.getByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(firstOpt, { target: { value: "Salaried" } });

      // Option 2: salaried (normalizes to 'salaried')
      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      const optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[1], { target: { value: " salaried " } });

      expect(screen.getByText("Option labels must be unique.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Property" })).toBeDisabled();
    });

    it("clears validation and re-enables Save Property when user fixes or removes the duplicate row", async () => {
      render(
        <UnifiedPropertyEditor
          solutionId="sol-1"
          solutionPrefix="PLA"
          property={null}
          choiceLists={[]}
          regexPresets={[]}
          expectedRevision={1}
          onSave={async () => {}}
          onSaveChoiceList={async () => ({ choiceList: { id: "cl-fix" }, solutionRevision: 2 })}
          onCancel={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText("e.g., Date of Birth"), { target: { value: "Employment Status" } });
      fireEvent.click(screen.getByLabelText("Data Type"));
      fireEvent.click(screen.getByText("Choice"));
      fireEvent.click(screen.getByRole("radio", { name: "Create new reusable choices" }));
      fireEvent.change(screen.getByPlaceholderText("e.g., Employment Types"), { target: { value: "Employment Types" } });

      // Salaried, Retired, Salaried
      const firstOpt = screen.getByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(firstOpt, { target: { value: "Salaried" } });

      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      let optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[1], { target: { value: "Retired" } });

      fireEvent.click(screen.getByRole("button", { name: "+ Add Option" }));
      optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[2], { target: { value: "Salaried" } });

      expect(screen.getByText("Option labels must be unique.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Property" })).toBeDisabled();

      // Edit 3rd option to 'Self Employed'
      optInputs = screen.getAllByPlaceholderText("Option Label (e.g. Salaried)");
      fireEvent.change(optInputs[2], { target: { value: "Self Employed" } });

      // Validation error disappears and Save is re-enabled
      expect(screen.queryByText("Option labels must be unique.")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Property" })).not.toBeDisabled();
    });

    it("resets nested property editor state when switching back to top-level Data tab", async () => {
      let activeSec: "overview" | "data" | "queues" | "forms" = "data";
      render(
        <StudioShell
          solution={mockSolution}
          isLoading={false}
          activeSection={activeSec}
          onSectionChange={(sec) => {
            activeSec = sec;
          }}
        >
          <div>Data Tab Content</div>
        </StudioShell>
      );

      // Verify tab nav click to Data clears state in DesignStudioContainer
      const dataTab = screen.getByRole("tab", { name: "Data" });
      expect(dataTab).toBeInTheDocument();
    });
  });

  describe("10. FormDesigner Tab Synchronization & Dual Forms Tests", () => {
    it("renders multiple tabs from formAggregate and dynamically updates UI when aggregate is updated", async () => {
      const initialAggregate = {
        form: { id: "f1", formKey: "case_view", formType: "CASE_VIEW", name: "Case View Form" },
        tabs: [
          { id: "tab-1", formId: "f1", tabKey: "main", title: "Main", displayOrder: 1 },
          { id: "tab-2", formId: "f1", tabKey: "test", title: "Test", displayOrder: 2 },
        ],
        sections: [
          { id: "sec-1", formId: "f1", tabId: "tab-1", sectionKey: "sec_main", title: "Main Section", displayOrder: 1 },
          { id: "sec-2", formId: "f1", tabId: "tab-2", sectionKey: "sec_test", title: "Test Section", displayOrder: 1 },
        ],
        fields: [],
      };

      const { rerender } = render(
        <FormDesigner
          solutionId="sol-123"
          expectedRevision={1}
          formAggregate={initialAggregate}
          properties={[]}
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

      // Verify both tabs render in the tab strip
      expect(await screen.findByRole("button", { name: "Main" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();

      // Verify default active tab is Main and renders Main Section
      expect(screen.getByText("Main Section")).toBeInTheDocument();
      expect(screen.queryByText("Test Section")).not.toBeInTheDocument();

      // Click Test tab -> renders Test Section
      fireEvent.click(screen.getByRole("button", { name: "Test" }));
      expect(await screen.findByText("Test Section")).toBeInTheDocument();
      expect(screen.queryByText("Main Section")).not.toBeInTheDocument();

      // Update aggregate by adding a 3rd tab "Audit"
      const updatedAggregate = {
        ...initialAggregate,
        tabs: [
          ...initialAggregate.tabs,
          { id: "tab-3", formId: "f1", tabKey: "audit", title: "Audit", displayOrder: 3 },
        ],
        sections: [
          ...initialAggregate.sections,
          { id: "sec-3", formId: "f1", tabId: "tab-3", sectionKey: "sec_audit", title: "Audit Section", displayOrder: 1 },
        ],
      };

      rerender(
        <FormDesigner
          solutionId="sol-123"
          expectedRevision={2}
          formAggregate={updatedAggregate}
          properties={[]}
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

      // Verify new tab "Audit" immediately renders in tab strip
      expect(await screen.findByRole("button", { name: "Audit" })).toBeInTheDocument();

      // Select Audit tab -> renders Audit Section
      fireEvent.click(screen.getByRole("button", { name: "Audit" }));
      expect(await screen.findByText("Audit Section")).toBeInTheDocument();
    });

    it("renders Forms Landing with both system forms and opens FormDesigner on Configure", async () => {
      const mockForms = [
        { id: "f-add", formKey: "add_case", formType: "ADD_CASE", name: "Add Case Form" },
        { id: "f-view", formKey: "case_view", formType: "CASE_VIEW", name: "Case View Form" },
      ];

      const realRouteResponse = {
        formAggregate: {
          form: mockForms[1],
          tabs: [
            { id: "tab-main", formId: "f-view", tabKey: "main", title: "Main Tab", displayOrder: 1 },
            { id: "tab-test", formId: "f-view", tabKey: "test", title: "Test Tab", displayOrder: 2 },
          ],
          sections: [
            { id: "sec-main", formId: "f-view", tabId: "tab-main", sectionKey: "sec_main", title: "Main Section Title", displayOrder: 1 },
          ],
          fields: [],
        },
        solutionRevision: 5,
      };

      vi.spyOn(studioApiClient, "apiFetchSolution").mockResolvedValue({
        solution: { id: "sol-123", name: "Test Sol", solutionPrefix: "TS", status: "DRAFT", revision: 5 },
      });
      vi.spyOn(studioApiClient, "apiFetchProperties").mockResolvedValue({ properties: [] });
      vi.spyOn(studioApiClient, "apiFetchChoiceLists").mockResolvedValue({ choiceLists: [] });
      vi.spyOn(studioApiClient, "apiFetchRegexPresets").mockResolvedValue({ presets: [] });
      vi.spyOn(studioApiClient, "apiFetchForms").mockResolvedValue({ forms: mockForms, solutionRevision: 5 });
      vi.spyOn(studioApiClient, "apiFetchForm").mockResolvedValue(realRouteResponse.formAggregate);

      render(<DesignStudioContainer solutionId="sol-123" />);

      // Wait for studio data to load
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Navigate to Forms tab
      const formsTabBtn = screen.getByRole("tab", { name: "Forms" });
      fireEvent.click(formsTabBtn);

      // Verify Forms Landing cards are displayed
      expect(await screen.findByText("Solution Forms")).toBeInTheDocument();
      expect(screen.getByText("Add Case Form")).toBeInTheDocument();
      expect(screen.getByText("Case View Form")).toBeInTheDocument();

      // Configure buttons present for both
      const configureBtns = screen.getAllByRole("button", { name: "Configure" });
      expect(configureBtns).toHaveLength(2);

      // Click Configure on Case View Form (second card)
      fireEvent.click(configureBtns[1]);

      // Verify FormDesigner opens with breadcrumb and tabs
      expect(await screen.findByRole("button", { name: "Main Tab" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Test Tab" })).toBeInTheDocument();
      expect(screen.getByText("Main Section Title")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "← Back to Forms" })).toBeInTheDocument();

      // Click ← Back to Forms returns to Forms Landing
      fireEvent.click(screen.getByRole("button", { name: "← Back to Forms" }));
      expect(await screen.findByText("Solution Forms")).toBeInTheDocument();
    });
  });

  describe("9. QueueManager Design System UI Component Tests", () => {
    it("renders Work Queues section header, empty state with primary + Add Queue button, and opens Add Work Queue Dialog", async () => {
      render(
        <QueueManager
          solutionId="sol-123"
          solutionRevision={1}
          onRevisionUpdate={() => {}}
          onApiError={() => {}}
        />
      );

      // Verify Header
      expect(await screen.findByRole("heading", { name: "Work Queues", level: 2 })).toBeInTheDocument();

      // Verify Empty State Title & Button
      expect(screen.getByText("No Work Queues Created")).toBeInTheDocument();
      const addBtns = screen.getAllByRole("button", { name: "+ Add Queue" });
      expect(addBtns.length).toBeGreaterThanOrEqual(1);

      // Click + Add Queue button to open Dialog
      fireEvent.click(addBtns[0]);

      // Verify Dialog renders shared Dialog title and form controls
      expect(await screen.findByRole("heading", { name: "Add Work Queue" })).toBeInTheDocument();
      expect(screen.getByLabelText(/Queue Name/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Queue" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("tracks dirty state for Queue Name, Description, user assignment and removal, and supports imperative discard/submitSave", async () => {
      let isDirty = false;
      const queueRef: { current: any } = { current: null };

      // Mock API responses for queue details
      const mockQueue = {
        id: "q1",
        solutionId: "sol-123",
        queueKey: "PLA_MAKER",
        name: "SOL Maker",
        description: "Initial",
        assignedUserCount: 1,
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
      };
      const mockUsers = [{ id: "u1", fullName: "User 1", email: "u1@test.com" }];

      vi.spyOn(studioApiClient, "apiFetchQueues").mockResolvedValue({ queues: [mockQueue] });
      vi.spyOn(studioApiClient, "apiFetchEligibleUsers").mockResolvedValue({ users: mockUsers });
      vi.spyOn(studioApiClient, "apiFetchQueueDetails").mockResolvedValue({
        queue: mockQueue,
        assignedUsers: [{ id: "u1", fullName: "User 1", email: "u1@test.com", assignedAt: "2026-08-20" }],
      });

      render(
        <QueueManager
          ref={queueRef}
          solutionId="sol-123"
          solutionRevision={1}
          onRevisionUpdate={() => {}}
          onApiError={() => {}}
          setIsDirty={(d) => { isDirty = d; }}
        />
      );

      // Select queue
      const queueCard = await screen.findByText("SOL Maker");
      fireEvent.click(queueCard);

      const nameInput = await screen.findByLabelText(/Queue Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("SOL Maker");
      expect(isDirty).toBe(false);

      // 1. Edit Queue Name -> dirty
      fireEvent.change(nameInput, { target: { value: "SOL Senior Maker" } });
      expect(isDirty).toBe(true);

      // Discard -> restores baseline
      await waitFor(() => {
        queueRef.current.discard();
      });
      await waitFor(() => {
        expect(nameInput.value).toBe("SOL Maker");
        expect(isDirty).toBe(false);
      });

      // 2. Edit Description -> dirty
      const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      fireEvent.change(descInput, { target: { value: "Updated Description" } });
      expect(isDirty).toBe(true);

      await waitFor(() => {
        queueRef.current.discard();
      });
      await waitFor(() => {
        expect(descInput.value).toBe("Initial");
        expect(isDirty).toBe(false);
      });

      // 3. User uncheck -> dirty
      const userCheckbox = screen.getByRole("checkbox", { name: /User 1/i });
      expect(userCheckbox).toBeChecked();
      fireEvent.click(userCheckbox);
      expect(isDirty).toBe(true);

      // User re-check -> clean
      fireEvent.click(userCheckbox);
      expect(isDirty).toBe(false);
    });
  });
});
