"use client";

import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from "react";
import { Button, Input, FormField, Skeleton, Alert, Dialog, Badge } from "@/app/components/ui";
import { TabControls } from "./TabControls";
import { SectionControls } from "./SectionControls";
import { FieldCard } from "./FieldCard";
import { FieldInspector } from "./FieldInspector";
import { PropertyPaletteModal } from "./PropertyPaletteModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { getCompatibleControlTypes } from "./control-compatibility";
import { isFormAggregateDirty } from "./form-dirty";

export interface FormDesignerHandle {
  submitSave: () => Promise<boolean>;
  discard: () => void;
}

export interface FormDesignerProps {
  solutionId: string;
  expectedRevision: number;
  formAggregate: {
    form: any;
    tabs: any[];
    sections: any[];
    fields: any[];
    queueRules?: any[];
  } | null;
  properties: any[];
  choiceLists?: any[];
  queues?: Array<{ id: string; name: string; queueKey: string }>;
  isLoading?: boolean;
  onBackToLanding: () => void;
  onSwitchForm?: (formId: string) => void;
  allForms?: Array<{ id: string; name: string; formType: string; formKey: string }>;
  onSaveForm?: (draft: {
    tabs: any[];
    sections: any[];
    fields: any[];
    queueRules?: any[];
  }) => Promise<void>;
  // Granular callbacks for backward compatibility / tests:
  onCreateTab?: (payload: { title: string; expectedRevision: number }) => Promise<void>;
  onUpdateTab?: (tabId: string, payload: { title?: string; expectedRevision: number }) => Promise<void>;
  onDeleteTab?: (tabId: string, expectedRevision: number) => Promise<void>;
  onReorderTabs?: (tabIds: string[], expectedRevision: number) => Promise<void>;
  onCreateSection?: (tabId: string, payload: { title: string; expectedRevision: number }) => Promise<void>;
  onUpdateSection?: (sectionId: string, payload: { title?: string; expectedRevision: number }) => Promise<void>;
  onDeleteSection?: (sectionId: string, expectedRevision: number) => Promise<void>;
  onMoveSection?: (sectionId: string, targetTabId: string, expectedRevision: number) => Promise<void>;
  onReorderSections?: (tabId: string, sectionIds: string[], expectedRevision: number) => Promise<void>;
  onAddField?: (sectionId: string, payload: any) => Promise<void>;
  onUpdateField?: (fieldReferenceId: string, payload: any) => Promise<void>;
  onDeleteField?: (fieldReferenceId: string, expectedRevision: number) => Promise<void>;
  onMoveField?: (fieldReferenceId: string, targetSectionId: string, expectedRevision: number) => Promise<void>;
  onReorderFields?: (sectionId: string, fieldReferenceIds: string[], expectedRevision: number) => Promise<void>;
  onOpenPropertyEditor?: (propertyId: string) => void;
  selectedTabId?: string | null;
  setSelectedTabId?: (tabId: string | null) => void;
  selectedSectionId?: string | null;
  setSelectedSectionId?: (sectionId: string | null) => void;
  selectedFieldId?: string | null;
  setSelectedFieldId?: (fieldId: string | null) => void;
  isFieldInspectorDirty?: boolean;
  setIsFieldInspectorDirty?: (dirty: boolean) => void;
  isFormDirty?: boolean;
  setIsFormDirty?: (dirty: boolean) => void;
  isSessionExpired?: boolean;
}

export const FormDesigner = forwardRef<FormDesignerHandle, FormDesignerProps>(
  function FormDesigner(
    {
      solutionId: _solutionId,
      expectedRevision,
      formAggregate,
      properties,
      choiceLists: _choiceLists = [],
      queues = [],
      isLoading = false,
      onBackToLanding,
      onSwitchForm,
      allForms = [],
      onSaveForm,
      onCreateTab: _legacyCreateTab,
      onUpdateTab: _legacyUpdateTab,
      onDeleteTab: _legacyDeleteTab,
      onReorderTabs: _legacyReorderTabs,
      onCreateSection: _legacyCreateSection,
      onUpdateSection: _legacyUpdateSection,
      onDeleteSection: _legacyDeleteSection,
      onMoveSection: _legacyMoveSection,
      onReorderSections: _legacyReorderSections,
      onAddField: _legacyAddField,
      onUpdateField: _legacyUpdateField,
      onDeleteField: _legacyDeleteField,
      onMoveField: _legacyMoveField,
      onReorderFields: _legacyReorderFields,
      onOpenPropertyEditor,
      selectedTabId: externalTabId,
      setSelectedTabId: externalSetTabId,
      selectedSectionId: _externalSectionId,
      setSelectedSectionId: externalSetSectionId,
      selectedFieldId: externalFieldId,
      setSelectedFieldId: externalSetFieldId,
      isFieldInspectorDirty: _legacyFieldInspectorDirty,
      setIsFieldInspectorDirty,
      isFormDirty: _externalFormDirty,
      setIsFormDirty,
      isSessionExpired = false,
    },
    ref
  ) {
    const form = formAggregate?.form;

    // 1. In-memory local draft aggregate
    const [draft, setDraft] = useState({
      tabs: formAggregate?.tabs || [],
      sections: formAggregate?.sections || [],
      fields: formAggregate?.fields || [],
      queueRules: formAggregate?.queueRules || [],
    });

    const [discardKey, setDiscardKey] = useState(0);

    // Selected Queue Context (transient workspace state for CASE_VIEW)
    const [selectedQueueId, setSelectedQueueId] = useState<string | null>(() => {
      return queues.length > 0 ? queues[0].id : null;
    });

    useEffect(() => {
      if (queues.length > 0) {
        setSelectedQueueId((prev) => {
          if (prev && queues.some((q) => q.id === prev)) return prev;
          return queues[0].id;
        });
      } else {
        setSelectedQueueId(null);
      }
    }, [queues]);

    // Derived semantic dirty state: persisted vs draft aggregate
    const isDirty = useMemo(() => {
      return isFormAggregateDirty(formAggregate, draft);
    }, [formAggregate, draft]);

    // Mirror derived dirty state to parent for Studio navigation guards
    useEffect(() => {
      setIsFormDirty?.(isDirty);
      setIsFieldInspectorDirty?.(false);
    }, [isDirty, setIsFormDirty, setIsFieldInspectorDirty]);

    // Synchronize draft when formAggregate updates from parent/server
    useEffect(() => {
      if (formAggregate) {
        setDraft({
          tabs: [...formAggregate.tabs],
          sections: [...formAggregate.sections],
          fields: [...formAggregate.fields],
          queueRules: [...(formAggregate.queueRules || [])],
        });
      }
    }, [formAggregate?.form?.id, formAggregate?.tabs, formAggregate?.sections, formAggregate?.fields, formAggregate?.queueRules]);

    // Active tab state
    const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>(null);

    useEffect(() => {
      if (draft.tabs.length > 0) {
        if (!internalActiveTabId || !draft.tabs.some((t) => t.id === internalActiveTabId)) {
          setInternalActiveTabId(draft.tabs[0].id);
        }
      } else {
        setInternalActiveTabId(null);
      }
    }, [draft.tabs, internalActiveTabId]);

    const activeTabId = externalTabId && draft.tabs.some((t) => t.id === externalTabId)
      ? externalTabId
      : internalActiveTabId || draft.tabs[0]?.id || null;

    const setActiveTabId = (id: string | null) => {
      setInternalActiveTabId(id);
      externalSetTabId?.(id);
    };

    // Selected field state
    const [internalSelectedFieldId, setInternalSelectedFieldId] = useState<string | null>(null);
    const selectedFieldId = externalFieldId !== undefined ? externalFieldId : internalSelectedFieldId;
    const setSelectedFieldId = (id: string | null) => {
      setInternalSelectedFieldId(id);
      externalSetFieldId?.(id);
    };

    const setSelectedSectionId = (id: string | null) => {
      externalSetSectionId?.(id);
    };

    // Error and action pending state
    const [error, setError] = useState<string | null>(null);
    const [isConflict, setIsConflict] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal dialogs state
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [isPropertyPaletteOpen, setIsPropertyPaletteOpen] = useState(false);
    const [targetSectionForField, setTargetSectionForField] = useState<string | null>(null);
    const [fieldToDelete, setFieldToDelete] = useState<any | null>(null);
    const [fieldToMove, setFieldToMove] = useState<any | null>(null);

    // Navigation guard modal state (triggers only when leaving the Form draft)
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    // Filter elements for active tab
    const sectionsInActiveTab = draft.sections
      .filter((s) => s.tabId === activeTabId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const activeTab = draft.tabs.find((t) => t.id === activeTabId);

    // Selected field and its bound property
    const selectedField = draft.fields.find((f) => f.id === selectedFieldId) || null;
    const selectedProperty = selectedField
      ? properties.find((p) => p.id === selectedField.propertyId) || null
      : null;

    // --- Save and Discard Handlers ---

    const handleDiscard = () => {
      if (formAggregate) {
        setDraft({
          tabs: [...formAggregate.tabs],
          sections: [...formAggregate.sections],
          fields: [...formAggregate.fields],
          queueRules: [...(formAggregate.queueRules || [])],
        });
      }
      setError(null);
      setIsConflict(false);
      setDiscardKey((k) => k + 1);
      if (selectedFieldId && !formAggregate?.fields.some((f) => f.id === selectedFieldId)) {
        setSelectedFieldId(null);
      }
    };

    const handleSave = async (): Promise<boolean> => {
      setError(null);
      setIsConflict(false);
      setIsSaving(true);

      try {
        if (onSaveForm) {
          await onSaveForm(draft);
        }
        return true;
      } catch (err: any) {
        const isConflictErr =
          err?.code === "REVISION_CONFLICT" ||
          (err?.status === 409 && err?.message?.toLowerCase().includes("revision conflict"));

        if (isConflictErr) {
          setIsConflict(true);
          setError("Revision Conflict: The Solution was updated concurrently. Click Save to retry or Discard to reload.");
        } else {
          setError(err?.message || "Failed to save form layout.");
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({
      submitSave: handleSave,
      discard: handleDiscard,
    }));

    // --- Navigation Interceptors ---

    const requestLeaveForm = (onProceed: () => void) => {
      if (isDirty) {
        setPendingNavigation(() => onProceed);
      } else {
        onProceed();
      }
    };

    const handleConfirmGuardSave = async () => {
      const ok = await handleSave();
      if (ok) {
        const nav = pendingNavigation;
        setPendingNavigation(null);
        nav?.();
      }
    };

    const handleConfirmGuardDiscard = () => {
      handleDiscard();
      const nav = pendingNavigation;
      setPendingNavigation(null);
      nav?.();
    };

    const handleConfirmGuardCancel = () => {
      setPendingNavigation(null);
    };

    // --- In-Memory Draft Tab Operations ---

    const handleAddTab = (title: string) => {
      const newId = crypto.randomUUID();
      const newTab = {
        id: newId,
        formId: form?.id || "",
        tabKey: `tab_${draft.tabs.length + 1}`,
        title: title.trim(),
        displayOrder: draft.tabs.length + 1,
      };

      setDraft((prev) => ({
        ...prev,
        tabs: [...prev.tabs, newTab],
      }));

      setActiveTabId(newId);
    };

    const handleUpdateTab = (tabId: string, title: string) => {
      setDraft((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, title: title.trim() } : t)),
      }));
    };

    const handleDeleteTab = (tabId: string) => {
      const sectionsInTab = draft.sections.filter((s) => s.tabId === tabId);
      const sectionIdsToDelete = new Set(sectionsInTab.map((s) => s.id));

      setDraft((prev) => {
        const remainingTabs = prev.tabs.filter((t) => t.id !== tabId).map((t, idx) => ({ ...t, displayOrder: idx + 1 }));
        const remainingSections = prev.sections.filter((s) => s.tabId !== tabId);
        const fieldIdsToDelete = new Set(prev.fields.filter((f) => sectionIdsToDelete.has(f.sectionId)).map((f) => f.id));
        const remainingFields = prev.fields.filter((f) => !sectionIdsToDelete.has(f.sectionId));
        return {
          ...prev,
          tabs: remainingTabs,
          sections: remainingSections,
          fields: remainingFields,
          queueRules: prev.queueRules.filter((r: any) => !fieldIdsToDelete.has(r.fieldReferenceId)),
        };
      });

      if (activeTabId === tabId) {
        const remaining = draft.tabs.filter((t) => t.id !== tabId);
        setActiveTabId(remaining[0]?.id || null);
      }
    };

    const handleReorderTabs = (newTabIds: string[]) => {
      setDraft((prev) => {
        const tabMap = new Map(prev.tabs.map((t) => [t.id, t]));
        return {
          ...prev,
          tabs: newTabIds.map((id, idx) => ({ ...tabMap.get(id)!, displayOrder: idx + 1 })),
        };
      });
    };

    const handleAddSectionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSectionTitle.trim() || !activeTabId) return;

      const count = sectionsInActiveTab.length;
      const newId = crypto.randomUUID();
      const newSec = {
        id: newId,
        formId: form?.id || "",
        tabId: activeTabId,
        sectionKey: `sec_${draft.sections.length + 1}`,
        title: newSectionTitle.trim(),
        displayOrder: count + 1,
      };

      setDraft((prev) => ({
        ...prev,
        sections: [...prev.sections, newSec],
      }));

      setNewSectionTitle("");
      setIsAddSectionOpen(false);
    };

    const handleUpdateSection = (sectionId: string, title: string) => {
      setDraft((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, title: title.trim() } : s
        ),
      }));
    };

    const handleDeleteSection = (secId: string) => {
      setDraft((prev) => {
        const targetSec = prev.sections.find((s) => s.id === secId);
        const remainingSections = prev.sections.filter((s) => s.id !== secId);
        const reindexedSections = remainingSections.map((s) => {
          if (targetSec && s.tabId === targetSec.tabId) {
            const tabSections = remainingSections.filter((ts) => ts.tabId === targetSec.tabId);
            const idx = tabSections.indexOf(s);
            return { ...s, displayOrder: idx + 1 };
          }
          return s;
        });
        const fieldIdsToDelete = new Set(prev.fields.filter((f) => f.sectionId === secId).map((f) => f.id));

        return {
          ...prev,
          sections: reindexedSections,
          fields: prev.fields.filter((f) => f.sectionId !== secId),
          queueRules: prev.queueRules.filter((r: any) => !fieldIdsToDelete.has(r.fieldReferenceId)),
        };
      });

      if (selectedField && selectedField.sectionId === secId) {
        setSelectedFieldId(null);
      }
    };

    const handleMoveSection = (sectionId: string, targetTabId: string) => {
      setDraft((prev) => {
        const movedSec = prev.sections.find((s) => s.id === sectionId);
        if (!movedSec || movedSec.tabId === targetTabId) return prev;

        const otherSections = prev.sections.filter((s) => s.id !== sectionId);
        const sourceTabId = movedSec.tabId;

        const updatedSource = otherSections
          .filter((s) => s.tabId === sourceTabId)
          .map((s, idx) => ({ ...s, displayOrder: idx + 1 }));

        const targetSections = otherSections.filter((s) => s.tabId === targetTabId);
        const updatedTarget = [
          ...targetSections,
          { ...movedSec, tabId: targetTabId, displayOrder: targetSections.length + 1 },
        ].map((s, idx) => ({ ...s, displayOrder: idx + 1 }));

        const untouched = otherSections.filter(
          (s) => s.tabId !== sourceTabId && s.tabId !== targetTabId
        );

        return {
          ...prev,
          sections: [...untouched, ...updatedSource, ...updatedTarget],
        };
      });
    };

    const handleReorderSections = (tabId: string, newSecIds: string[]) => {
      setDraft((prev) => {
        const secMap = new Map(prev.sections.map((s) => [s.id, s]));
        const reordered = newSecIds.map((id, idx) => ({ ...secMap.get(id)!, displayOrder: idx + 1 }));
        const others = prev.sections.filter((s) => s.tabId !== tabId);
        return { ...prev, sections: [...others, ...reordered] };
      });
    };

    // --- In-Memory Draft Field Operations ---

    const handleAddFieldFromPalette = (property: any) => {
      if (!targetSectionForField) return;

      const count = draft.fields.filter((f) => f.sectionId === targetSectionForField).length;
      const compat = getCompatibleControlTypes(property);
      const defaultControl = property.defaultControlType || compat[0] || "TEXT_INPUT";

      const newId = crypto.randomUUID();
      const newField = {
        id: newId,
        solutionId: form?.solutionId || "",
        formId: form?.id || "",
        sectionId: targetSectionForField,
        propertyId: property.id,
        controlType: defaultControl,
        isRequired: false,
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        displayOrder: count + 1,
      };

      setDraft((prev) => ({
        ...prev,
        fields: [...prev.fields, newField],
      }));

      setSelectedFieldId(newId);
      setIsPropertyPaletteOpen(false);
      setTargetSectionForField(null);
    };

    const handleFieldChange = (
      fieldId: string,
      updates: { controlType?: string; isVisible?: boolean; isEditable?: boolean; isRequired?: boolean }
    ) => {
      setDraft((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                ...(updates.controlType !== undefined ? { controlType: updates.controlType } : {}),
                ...(updates.isVisible !== undefined ? { isVisible: updates.isVisible } : {}),
                ...(updates.isEditable !== undefined ? { isEditable: updates.isEditable } : {}),
                ...(updates.isRequired !== undefined ? { isRequired: updates.isRequired } : {}),
              }
            : f
        ),
      }));
    };

    const handleQueueRuleChange = (
      fieldReferenceId: string,
      queueId: string,
      updates: { isVisible?: boolean; isEditable?: boolean; isRequired?: boolean }
    ) => {
      setDraft((prev) => {
        const existingIndex = prev.queueRules.findIndex(
          (r: any) => r.fieldReferenceId === fieldReferenceId && r.queueId === queueId
        );
        const currentRule = existingIndex >= 0 ? prev.queueRules[existingIndex] : null;
        const isVis = updates.isVisible !== undefined ? updates.isVisible : (currentRule?.isVisible ?? true);
        const isEdit = updates.isEditable !== undefined ? updates.isEditable : (currentRule?.isEditable ?? true);
        const isReq = updates.isRequired !== undefined ? updates.isRequired : (currentRule?.isRequired ?? false);

        const isDefault = isVis === true && isEdit === true && isReq === false;

        let nextRules: any[];
        if (isDefault) {
          nextRules = prev.queueRules.filter(
            (r: any) => !(r.fieldReferenceId === fieldReferenceId && r.queueId === queueId)
          );
        } else if (existingIndex >= 0) {
          nextRules = prev.queueRules.map((r: any, idx: number) =>
            idx === existingIndex ? { ...r, isVisible: isVis, isEditable: isEdit, isRequired: isReq } : r
          );
        } else {
          nextRules = [
            ...prev.queueRules,
            { fieldReferenceId, queueId, isVisible: isVis, isEditable: isEdit, isRequired: isReq },
          ];
        }

        return {
          ...prev,
          queueRules: nextRules,
        };
      });
    };

    const handleDeleteFieldConfirm = () => {
      if (!fieldToDelete) return;

      setDraft((prev) => {
        const targetField = prev.fields.find((f) => f.id === fieldToDelete.id);
        const remainingFields = prev.fields.filter((f) => f.id !== fieldToDelete.id);
        const reindexedFields = remainingFields.map((f) => {
          if (targetField && f.sectionId === targetField.sectionId) {
            const secFields = remainingFields.filter((sf) => sf.sectionId === targetField.sectionId);
            const idx = secFields.indexOf(f);
            return { ...f, displayOrder: idx + 1 };
          }
          return f;
        });

        return {
          ...prev,
          fields: reindexedFields,
          queueRules: prev.queueRules.filter((r: any) => r.fieldReferenceId !== fieldToDelete.id),
        };
      });

      if (selectedFieldId === fieldToDelete.id) {
        setSelectedFieldId(null);
      }

      setFieldToDelete(null);
    };

    const handleMoveFieldConfirm = (targetSectionId: string) => {
      if (!fieldToMove) return;

      setDraft((prev) => {
        const movedField = prev.fields.find((f) => f.id === fieldToMove.id);
        if (!movedField || movedField.sectionId === targetSectionId) return prev;

        const otherFields = prev.fields.filter((f) => f.id !== fieldToMove.id);
        const sourceSectionId = movedField.sectionId;

        const updatedSource = otherFields
          .filter((f) => f.sectionId === sourceSectionId)
          .map((f, idx) => ({ ...f, displayOrder: idx + 1 }));

        const targetFields = otherFields.filter((f) => f.sectionId === targetSectionId);
        const updatedTarget = [
          ...targetFields,
          { ...movedField, sectionId: targetSectionId, displayOrder: targetFields.length + 1 },
        ].map((f, idx) => ({ ...f, displayOrder: idx + 1 }));

        const untouched = otherFields.filter(
          (f) => f.sectionId !== sourceSectionId && f.sectionId !== targetSectionId
        );

        return {
          ...prev,
          fields: [...untouched, ...updatedSource, ...updatedTarget],
        };
      });

      setFieldToMove(null);
    };

    const handleReorderFields = (sectionId: string, newFieldIds: string[]) => {
      setDraft((prev) => {
        const fieldMap = new Map(prev.fields.map((f) => [f.id, f]));
        const reordered = newFieldIds.map((id, idx) => ({ ...fieldMap.get(id)!, displayOrder: idx + 1 }));
        const others = prev.fields.filter((f) => f.sectionId !== sectionId);
        return { ...prev, fields: [...others, ...reordered] };
      });
    };

    if (isLoading) {
      return (
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Skeleton height="36px" width="280px" />
          <Skeleton height="48px" width="100%" />
          <Skeleton height="200px" width="100%" />
        </div>
      );
    }

    if (!form) {
      return (
        <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Form not found.</p>
          <Button variant="secondary" onClick={onBackToLanding}>
            ← Back to Forms
          </Button>
        </div>
      );
    }

    return (
      <div
        data-testid="form-designer"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Sticky Top Header with Breadcrumbs and Form Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            paddingBottom: "var(--space-3)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {/* Breadcrumb & Form Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-sm)" }}>
            <button
              type="button"
              onClick={() => requestLeaveForm(onBackToLanding)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--action-primary)",
                cursor: "pointer",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              ← Back to Forms
            </button>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)" }}>{form.name}</span>
            <Badge variant="neutral">{form.formType}</Badge>

            {/* Quick switcher between Add Case Form and Case View Form */}
            {allForms.length > 1 && onSwitchForm && (
              <div style={{ display: "flex", gap: "var(--space-1)", marginLeft: "var(--space-3)" }}>
                {allForms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      if (f.id !== form.id) {
                        requestLeaveForm(() => onSwitchForm(f.id));
                      }
                    }}
                    style={{
                      background: f.id === form.id ? "var(--action-secondary-bg)" : "transparent",
                      border: "1px solid",
                      borderColor: f.id === form.id ? "var(--action-primary)" : "var(--border-default)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 8px",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: f.id === form.id ? "bold" : "normal",
                      color: f.id === form.id ? "var(--action-primary)" : "var(--text-secondary)",
                      cursor: f.id === form.id ? "default" : "pointer",
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form Action Controls: Discard Changes & Save Changes */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {isDirty && (
              <Button
                variant="secondary"
                onClick={handleDiscard}
                disabled={isSaving || isSessionExpired}
              >
                Discard Changes
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!isDirty || isSaving || isSessionExpired}
              isPending={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" title={isConflict ? "Revision Conflict" : undefined}>
            {error}
          </Alert>
        )}

        {/* Two-Column Desktop Layout: Left Canvas + Right Sticky Inspector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 380px",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Left Column: Form Canvas (scrolls independently) */}
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >


            {/* Tab Strip */}
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
              }}
            >
              <TabControls
                tabs={draft.tabs}
                activeTabId={activeTabId}
                onSelectTab={(id) => {
                  setActiveTabId(id);
                  setSelectedSectionId(null);
                }}
                onCreateTab={async (title) => {
                  handleAddTab(title);
                }}
                onUpdateTabTitle={async (tabId, title) => {
                  handleUpdateTab(tabId, title);
                }}
                onDeleteTab={async (tabId) => {
                  handleDeleteTab(tabId);
                }}
                onReorderTabs={async (tabIds) => {
                  handleReorderTabs(tabIds);
                }}
                isPending={isSaving || isSessionExpired}
              />
            </div>

            {/* Sections in Active Tab */}
            {sectionsInActiveTab.length === 0 ? (
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  padding: "var(--space-8)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px dashed var(--border-default)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: "bold" }}>
                  Sections (0)
                </span>
                <p style={{ margin: 0, fontWeight: "var(--font-weight-medium)", color: "var(--text-primary)" }}>
                  No Sections in this Tab
                </p>
                <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", maxWidth: "340px" }}>
                  Add a section to group related fields in this tab.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNewSectionTitle("");
                    setIsAddSectionOpen(true);
                  }}
                  disabled={!activeTabId || isSessionExpired}
                >
                  + Add Section
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {sectionsInActiveTab.map((sec, sIdx) => {
                  const fieldsInSec = draft.fields
                    .filter((f) => f.sectionId === sec.id)
                    .sort((a, b) => a.displayOrder - b.displayOrder);

                  return (
                    <SectionControls
                      key={sec.id}
                      section={sec}
                      allTabs={draft.tabs}
                      currentTabId={activeTabId}
                      expectedRevision={expectedRevision}
                      onUpdateSectionTitle={async (_id, title) => {
                        handleUpdateSection(sec.id, title);
                      }}
                      onDeleteSection={async () => {
                        handleDeleteSection(sec.id);
                      }}
                      onMoveSectionToTab={async (_id, targetTabId) => {
                        handleMoveSection(sec.id, targetTabId);
                      }}
                      onMoveUp={() => {
                        const ids = sectionsInActiveTab.map((s) => s.id);
                        const idx = ids.indexOf(sec.id);
                        if (idx > 0) {
                          const next = [...ids];
                          const tmp = next[idx - 1];
                          next[idx - 1] = next[idx];
                          next[idx] = tmp;
                          handleReorderSections(activeTabId!, next);
                        }
                      }}
                      onMoveDown={() => {
                        const ids = sectionsInActiveTab.map((s) => s.id);
                        const idx = ids.indexOf(sec.id);
                        if (idx < ids.length - 1) {
                          const next = [...ids];
                          const tmp = next[idx + 1];
                          next[idx + 1] = next[idx];
                          next[idx] = tmp;
                          handleReorderSections(activeTabId!, next);
                        }
                      }}
                      isFirst={sIdx === 0}
                      isLast={sIdx === sectionsInActiveTab.length - 1}
                      isPending={isSaving || isSessionExpired}
                    >
                      {/* Fields inside Section */}
                      {fieldsInSec.length === 0 ? (
                        <div
                          style={{
                            padding: "var(--space-4)",
                            backgroundColor: "var(--bg-page)",
                            borderRadius: "var(--radius-md)",
                            border: "1px dashed var(--border-default)",
                            textAlign: "center",
                            fontSize: "var(--font-size-xs)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          No fields placed in this section yet.
                        </div>
                      ) : (
                        fieldsInSec.map((f, fIdx) => {
                          const prop = properties.find((p) => p.id === f.propertyId);
                          const isSelected = selectedFieldId === f.id;
                          const isCaseView = form?.formType === "CASE_VIEW";
                          const effectiveBehaviour =
                            isCaseView && selectedQueueId
                              ? (() => {
                                  const rule = draft.queueRules?.find(
                                    (r: any) => r.fieldReferenceId === f.id && r.queueId === selectedQueueId
                                  );
                                  return {
                                    isVisible: rule?.isVisible ?? true,
                                    isEditable: rule?.isEditable ?? true,
                                    isRequired: rule?.isRequired ?? false,
                                  };
                                })()
                              : null;

                          return (
                            <FieldCard
                              key={f.id}
                              field={f}
                              property={prop}
                              formType={form?.formType || "ADD_CASE"}
                              effectiveBehaviour={effectiveBehaviour}
                              isSelected={isSelected}
                              onSelect={() => {
                                setSelectedFieldId(f.id);
                                setSelectedSectionId(sec.id);
                              }}
                              onMoveUp={() => {
                                const ids = fieldsInSec.map((fi) => fi.id);
                                const idx = ids.indexOf(f.id);
                                if (idx > 0) {
                                  const next = [...ids];
                                  const tmp = next[idx - 1];
                                  next[idx - 1] = next[idx];
                                  next[idx] = tmp;
                                  handleReorderFields(sec.id, next);
                                }
                              }}
                              onMoveDown={() => {
                                const ids = fieldsInSec.map((fi) => fi.id);
                                const idx = ids.indexOf(f.id);
                                if (idx < ids.length - 1) {
                                  const next = [...ids];
                                  const tmp = next[idx + 1];
                                  next[idx + 1] = next[idx];
                                  next[idx] = tmp;
                                  handleReorderFields(sec.id, next);
                                }
                              }}
                              onMoveSection={() => setFieldToMove(f)}
                              onRemove={() => setFieldToDelete(f)}
                              isFirst={fIdx === 0}
                              isLast={fIdx === fieldsInSec.length - 1}
                              isPending={isSaving || isSessionExpired}
                            />
                          );
                        })
                      )}

                      <div style={{ marginTop: "var(--space-2)" }}>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setTargetSectionForField(sec.id);
                            setIsPropertyPaletteOpen(true);
                          }}
                          disabled={isSaving || isSessionExpired}
                          style={{ fontSize: "var(--font-size-xs)" }}
                        >
                          + Add Field
                        </Button>
                      </div>
                    </SectionControls>
                  );
                })}

                {/* Button to add another section */}
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "var(--space-2)" }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setNewSectionTitle("");
                      setIsAddSectionOpen(true);
                    }}
                    disabled={!activeTabId || isSessionExpired}
                  >
                    + Add Section
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Field Inspector */}
          <div
            data-testid="sticky-field-inspector"
            style={{
              position: "sticky",
              top: "var(--space-4)",
              width: "380px",
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto",
            }}
          >
            <FieldInspector
              key={`${selectedField?.id || "empty"}-${discardKey}`}
              formType={form.formType || "ADD_CASE"}
              field={selectedField}
              property={selectedProperty}
              expectedRevision={expectedRevision}
              queues={queues}
              selectedQueueId={selectedQueueId}
              onSelectedQueueChange={setSelectedQueueId}
              queueRules={draft.queueRules}
              onQueueRuleChange={handleQueueRuleChange}
              onFieldChange={handleFieldChange}
              onOpenPropertyEditor={onOpenPropertyEditor}
              onClose={() => setSelectedFieldId(null)}
              isPending={isSaving}
              isDirty={isDirty}
              isSessionExpired={isSessionExpired}
            />
          </div>
        </div>

        {/* --- Modals --- */}

        {/* Add Section Modal */}
        {isAddSectionOpen && (
          <Dialog
            isOpen={true}
            title="Add Form Section"
            description={`Create a new grouping section inside tab "${activeTab?.title}".`}
            onCancel={() => setIsAddSectionOpen(false)}
          >
            <form onSubmit={handleAddSectionSubmit}>
              <FormField id="new-sec-title" label="Section Title">
                {() => (
                  <Input
                    id="new-sec-title"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="e.g. Personal Information"
                    autoFocus
                  />
                )}
              </FormField>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <Button variant="secondary" onClick={() => setIsAddSectionOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!newSectionTitle.trim()}>
                  Add Section
                </Button>
              </div>
            </form>
          </Dialog>
        )}

        {/* Delete Field Modal */}
        {fieldToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            title="Remove Field"
            itemName={properties.find((p) => p.id === fieldToDelete.propertyId)?.label || "Field reference"}
            itemType="Field"
            actionType="remove"
            onConfirm={handleDeleteFieldConfirm}
            onCancel={() => setFieldToDelete(null)}
          />
        )}

        {/* Property Palette Modal for Adding Fields */}
        {isPropertyPaletteOpen && (
          <PropertyPaletteModal
            isOpen={true}
            sectionTitle={draft.sections.find((s) => s.id === targetSectionForField)?.title || "Section"}
            properties={properties}
            usedPropertyIds={new Set(draft.fields.map((f) => f.propertyId))}
            onAddPropertyField={async (propertyId) => {
              const prop = properties.find((p) => p.id === propertyId);
              if (prop) handleAddFieldFromPalette(prop);
            }}
            onCancel={() => {
              setIsPropertyPaletteOpen(false);
              setTargetSectionForField(null);
            }}
          />
        )}

        {/* Move Field Modal */}
        {fieldToMove && (
          <Dialog
            isOpen={true}
            title="Move Field to Section"
            description="Select a target section in this form to move the field to."
            onCancel={() => setFieldToMove(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {draft.sections
                .filter((s) => s.id !== fieldToMove.sectionId)
                .map((s) => {
                  const tab = draft.tabs.find((t) => t.id === s.tabId);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleMoveFieldConfirm(s.id)}
                      style={{
                        padding: "var(--space-3)",
                        textAlign: "left",
                        background: "var(--bg-page)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: "var(--font-weight-medium)" }}>{s.title}</div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                        Tab: {tab?.title || "Unknown"}
                      </div>
                    </button>
                  );
                })}
              {draft.sections.filter((s) => s.id !== fieldToMove.sectionId).length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-sm)" }}>
                  No other sections available to move to.
                </p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
              <Button variant="secondary" onClick={() => setFieldToMove(null)}>
                Cancel
              </Button>
            </div>
          </Dialog>
        )}

        {/* Navigation Guard Modal (Save Changes / Discard Changes / Keep Editing) */}
        {pendingNavigation && (
          <UnsavedChangesModal
            isOpen={true}
            onSave={handleConfirmGuardSave}
            onDiscard={handleConfirmGuardDiscard}
            onCancel={handleConfirmGuardCancel}
            isPending={isSaving}
          />
        )}
      </div>
    );
  }
);
