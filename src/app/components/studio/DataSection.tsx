"use client";

import { useState, useRef } from "react";
import { PropertyList } from "./PropertyList";
import { UnifiedPropertyEditor, PropertyEditorHandle } from "./UnifiedPropertyEditor";
import { ChoiceListList } from "./ChoiceListList";
import { ChoiceListEditor } from "./ChoiceListEditor";
import { UnsavedChangesModal } from "./UnsavedChangesModal";

export interface DataSectionProps {
  solutionId: string;
  solutionPrefix: string;
  expectedRevision: number;
  properties: any[];
  choiceLists: any[];
  regexPresets: any[];
  isLoading?: boolean;
  onSaveProperty: (payload: any) => Promise<void>;
  onDeleteProperty: (propertyId: string, expectedRevision: number) => Promise<void>;
  onSaveChoiceList?: (payload: any) => Promise<any>;
  onDeleteChoiceList?: (choiceListId: string, expectedRevision: number) => Promise<void>;
  onAddChoiceOption?: (choiceListId: string, payload: { key: string; label: string }) => Promise<void>;
  onUpdateChoiceOptionLabel?: (choiceListId: string, optionId: string, label: string) => Promise<void>;
  onDeactivateChoiceOption?: (choiceListId: string, optionId: string) => Promise<void>;
  onReactivateChoiceOption?: (choiceListId: string, optionId: string) => Promise<void>;
  onReorderChoiceOptions?: (choiceListId: string, optionIds: string[]) => Promise<void>;
  activeSubtab?: "properties" | "choiceLists";
  setActiveSubtab?: (sub: "properties" | "choiceLists") => void;
  selectedPropertyId?: string | null;
  setSelectedPropertyId?: (pid: string | null) => void;
  selectedChoiceListId?: string | null;
  setSelectedChoiceListId?: (clid: string | null) => void;
  isPropertyEditorDirty?: boolean;
  setIsPropertyEditorDirty?: (dirty: boolean) => void;
  isChoiceListEditorDirty?: boolean;
  setIsChoiceListEditorDirty?: (dirty: boolean) => void;
  propertyRefProp?: React.RefObject<PropertyEditorHandle | null>;
  isSessionExpired?: boolean;
}

export function DataSection({
  solutionId: _solutionId,
  solutionPrefix,
  expectedRevision,
  properties,
  choiceLists,
  regexPresets,
  isLoading = false,
  onSaveProperty,
  onDeleteProperty,
  onSaveChoiceList,
  onDeleteChoiceList,
  onAddChoiceOption,
  onUpdateChoiceOptionLabel,
  onDeactivateChoiceOption,
  onReactivateChoiceOption,
  onReorderChoiceOptions,
  activeSubtab: externalSubtab,
  setActiveSubtab: externalSetSubtab,
  selectedPropertyId: externalPropertyId,
  setSelectedPropertyId: externalSetPropertyId,
  selectedChoiceListId: externalChoiceListId,
  setSelectedChoiceListId: externalSetChoiceListId,
  isPropertyEditorDirty = false,
  setIsPropertyEditorDirty,
  isChoiceListEditorDirty = false,
  setIsChoiceListEditorDirty,
  propertyRefProp,
  isSessionExpired = false,
}: DataSectionProps) {
  const [internalSubtab, setInternalSubtab] = useState<"properties" | "choiceLists">("properties");
  const subTab = externalSubtab || internalSubtab;

  const [pendingUnsavedNav, setPendingUnsavedNav] = useState<(() => void) | null>(null);

  const isDirty = isPropertyEditorDirty || isChoiceListEditorDirty;

  const executeProtectedNav = (action: () => void) => {
    if (isDirty) {
      setPendingUnsavedNav(() => action);
    } else {
      action();
    }
  };

  const setSubTab = (s: "properties" | "choiceLists") => {
    executeProtectedNav(() => {
      if (s === "choiceLists") {
        setSelectedChoiceListId(null);
        setIsCreatingChoiceList(false);
        setIsChoiceListEditorDirty?.(false);
      }
      setInternalSubtab(s);
      externalSetSubtab?.(s);
    });
  };

  const [internalPropertyId, setInternalPropertyId] = useState<string | null>(null);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const selectedPropertyId = externalPropertyId !== undefined ? externalPropertyId : internalPropertyId;
  const setSelectedPropertyId = (pid: string | null) => {
    setInternalPropertyId(pid);
    externalSetPropertyId?.(pid);
  };

  const [internalChoiceListId, setInternalChoiceListId] = useState<string | null>(null);
  const [isCreatingChoiceList, setIsCreatingChoiceList] = useState(false);
  const selectedChoiceListId = externalChoiceListId !== undefined ? externalChoiceListId : internalChoiceListId;
  const setSelectedChoiceListId = (clid: string | null) => {
    setInternalChoiceListId(clid);
    externalSetChoiceListId?.(clid);
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || null;
  const selectedChoiceList = choiceLists.find((cl) => cl.id === selectedChoiceListId) || null;

  const internalPropertyRef = useRef<PropertyEditorHandle>(null);
  const propertyRef = propertyRefProp || internalPropertyRef;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Primary Data Dictionary View */}
      {subTab === "properties" && (
        <>
          {!selectedProperty && !isCreatingProperty ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <PropertyList
                properties={properties}
                isLoading={isLoading}
                onSelectProperty={(id) => setSelectedPropertyId(id)}
                onCreateProperty={() => {
                  setSelectedPropertyId(null);
                  setIsCreatingProperty(true);
                }}
                onDeleteProperty={(id) => onDeleteProperty(id, expectedRevision)}
                isPending={isLoading || isSessionExpired}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSubTab("choiceLists")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Manage reusable choices
                </button>
              </div>
            </div>
          ) : (
            <UnifiedPropertyEditor
              ref={propertyRef}
              solutionId={_solutionId}
              solutionPrefix={solutionPrefix}
              property={selectedProperty}
              choiceLists={choiceLists}
              regexPresets={regexPresets}
              expectedRevision={expectedRevision}
              onSave={async (payload) => {
                await onSaveProperty(payload);
                setIsCreatingProperty(false);
              }}
              onSaveChoiceList={onSaveChoiceList}
              onCancel={() => {
                executeProtectedNav(() => {
                  setSelectedPropertyId(null);
                  setIsCreatingProperty(false);
                  setIsPropertyEditorDirty?.(false);
                });
              }}
              isPending={isLoading}
              isDirty={isPropertyEditorDirty}
              setIsDirty={(d) => setIsPropertyEditorDirty?.(d)}
            />
          )}
        </>
      )}

      {/* Secondary Reusable Choice Lists Management View */}
      {subTab === "choiceLists" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={() => setSubTab("properties")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              ← Back to Data Dictionary
            </button>
          </div>

          {!selectedChoiceList && !isCreatingChoiceList ? (
            <ChoiceListList
              choiceLists={choiceLists}
              isLoading={isLoading}
              onSelectChoiceList={(id) => setSelectedChoiceListId(id)}
              onCreateChoiceList={() => {
                setSelectedChoiceListId(null);
                setIsCreatingChoiceList(true);
              }}
              onDeleteChoiceList={
                onDeleteChoiceList
                  ? (id) => onDeleteChoiceList(id, expectedRevision)
                  : undefined
              }
              isPending={isLoading || isSessionExpired}
            />
          ) : (
            <ChoiceListEditor
              choiceList={selectedChoiceList}
              expectedRevision={expectedRevision}
              onSaveChoiceList={async (payload: any) => {
                if (onSaveChoiceList) await onSaveChoiceList(payload);
                setIsCreatingChoiceList(false);
              }}
              onAddOption={async (payload: { key: string; label: string }) => {
                if (selectedChoiceList && onAddChoiceOption) {
                  await onAddChoiceOption(selectedChoiceList.id, payload);
                }
              }}
              onUpdateOptionLabel={async (optId: string, label: string) => {
                if (selectedChoiceList && onUpdateChoiceOptionLabel) {
                  await onUpdateChoiceOptionLabel(selectedChoiceList.id, optId, label);
                }
              }}
              onDeactivateOption={async (optId: string) => {
                if (selectedChoiceList && onDeactivateChoiceOption) {
                  await onDeactivateChoiceOption(selectedChoiceList.id, optId);
                }
              }}
              onReactivateOption={async (optId: string) => {
                if (selectedChoiceList && onReactivateChoiceOption) {
                  await onReactivateChoiceOption(selectedChoiceList.id, optId);
                }
              }}
              onReorderOptions={async (optIds: string[]) => {
                if (selectedChoiceList && onReorderChoiceOptions) {
                  await onReorderChoiceOptions(selectedChoiceList.id, optIds);
                }
              }}
              onCancel={() => {
                executeProtectedNav(() => {
                  setSelectedChoiceListId(null);
                  setIsCreatingChoiceList(false);
                  setIsChoiceListEditorDirty?.(false);
                });
              }}
              isPending={isLoading}
              isDirty={isChoiceListEditorDirty}
              setIsDirty={(d) => setIsChoiceListEditorDirty?.(d)}
            />
          )}
        </div>
      )}

      {/* Unsaved Changes Protection Modal for Subtab/Editor Navigation */}
      {pendingUnsavedNav && (
        <UnsavedChangesModal
          isOpen={true}
          onSave={async () => {
            if (propertyRef.current) {
              const success = await propertyRef.current.submitSave();
              if (success) {
                setIsPropertyEditorDirty?.(false);
                setIsChoiceListEditorDirty?.(false);
                const action = pendingUnsavedNav;
                setPendingUnsavedNav(null);
                action();
              }
            } else {
              setIsPropertyEditorDirty?.(false);
              setIsChoiceListEditorDirty?.(false);
              const action = pendingUnsavedNav;
              setPendingUnsavedNav(null);
              action();
            }
          }}
          onDiscard={() => {
            if (propertyRef.current) {
              propertyRef.current.discard();
            }
            setIsPropertyEditorDirty?.(false);
            setIsChoiceListEditorDirty?.(false);
            const action = pendingUnsavedNav;
            setPendingUnsavedNav(null);
            action();
          }}
          onCancel={() => setPendingUnsavedNav(null)}
        />
      )}
    </div>
  );
}
