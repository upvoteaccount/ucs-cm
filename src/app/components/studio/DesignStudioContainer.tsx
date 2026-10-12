"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "./StudioShell";
import { OverviewSection } from "./OverviewSection";
import { DataSection } from "./DataSection";
import { FormDesigner, FormDesignerHandle } from "./FormDesigner";
import { FormsLanding } from "./FormsLanding";
import { QueueManager, QueueManagerHandle } from "./QueueManager";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { PropertyEditorHandle } from "./UnifiedPropertyEditor";
import { Alert, Button, Toast } from "@/app/components/ui";

import {
  apiFetchSolution,
  apiUpdateSolution,
  apiFetchProperties,
  apiCreateProperty,
  apiUpdateProperty,
  apiDeleteProperty,
  apiFetchRegexPresets,
  apiFetchChoiceLists,
  apiCreateChoiceList,
  apiUpdateChoiceList,
  apiDeleteChoiceList,
  apiCreateChoiceOption,
  apiUpdateChoiceOptionLabel,
  apiDeactivateChoiceOption,
  apiReactivateChoiceOption,
  apiReorderChoiceOptions,
  apiFetchForms,
  apiFetchForm,
  apiFetchQueues,
  apiSaveFormAggregate,
  apiCreateTab,
  apiUpdateTab,
  apiDeleteTab,
  apiReorderTabs,
  apiCreateSection,
  apiUpdateSection,
  apiDeleteSection,
  apiMoveSection,
  apiReorderSections,
  apiAddFieldReference,
  apiUpdateFieldReference,
  apiDeleteFieldReference,
  apiMoveFieldReference,
  apiReorderFieldReferences,
  StudioApiError,
} from "./studio-api.client";

export interface DesignStudioContainerProps {
  solutionId: string;
  initialSolution?: any;
}

export function DesignStudioContainer({
  solutionId,
  initialSolution = null,
}: DesignStudioContainerProps) {
  // Toast Notification State
  const [toastMessage, setToastMessage] = useState("");
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };
  // Navigation State (URL-backed with safe fallbacks)
  const [activeSection, setActiveSection] = useState<"overview" | "data" | "queues" | "forms">("overview");
  const [activeSubtab, setActiveSubtab] = useState<"properties" | "choiceLists">("properties");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedChoiceListId, setSelectedChoiceListId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Forms State
  const [forms, setForms] = useState<any[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Aggregate Data States
  const [solution, setSolution] = useState<any>(initialSolution);
  const expectedRevision = solution?.revision || 1;
  const [properties, setProperties] = useState<any[]>([]);
  const [choiceLists, setChoiceLists] = useState<any[]>([]);
  const [regexPresets, setRegexPresets] = useState<any[]>([]);
  const [formAggregate, setFormAggregate] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);

  // Status, Error & Session States
  const [isLoading, setIsLoading] = useState(true);
  const [isRevisionConflict, setIsRevisionConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ title: string; message: string; code?: string } | null>(null);
  const [sessionExpiredError, setSessionExpiredError] = useState<string | null>(null);

  // Dirty State Tracking & Navigation Protection
  const [isOverviewDirty, setIsOverviewDirty] = useState(false);
  const [isPropertyEditorDirty, setIsPropertyEditorDirty] = useState(false);
  const [isChoiceListEditorDirty, setIsChoiceListEditorDirty] = useState(false);
  const [isFieldInspectorDirty, setIsFieldInspectorDirty] = useState(false);
  const [isQueueManagerDirty, setIsQueueManagerDirty] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const isDirty =
    isOverviewDirty ||
    isPropertyEditorDirty ||
    isChoiceListEditorDirty ||
    isFieldInspectorDirty ||
    isQueueManagerDirty ||
    isFormDirty;

  const [pendingSectionChange, setPendingSectionChange] = useState<"overview" | "data" | "queues" | "forms" | null>(null);
  const [pendingQueueSelection, setPendingQueueSelection] = useState<string | null>(null);

  // URL Sync Helper
  const syncUrlParams = useCallback(
    (params: {
      section?: "overview" | "data" | "queues" | "forms";
      subtab?: "properties" | "choiceLists";
      propertyId?: string | null;
      choiceListId?: string | null;
      tabId?: string | null;
      sectionId?: string | null;
      fieldId?: string | null;
      formId?: string | null;
    }) => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);

      if (params.section !== undefined) url.searchParams.set("section", params.section);
      if (params.subtab !== undefined) url.searchParams.set("subtab", params.subtab);
      if (params.propertyId !== undefined) {
        if (params.propertyId) url.searchParams.set("propertyId", params.propertyId);
        else url.searchParams.delete("propertyId");
      }
      if (params.choiceListId !== undefined) {
        if (params.choiceListId) url.searchParams.set("choiceListId", params.choiceListId);
        else url.searchParams.delete("choiceListId");
      }
      if (params.tabId !== undefined) {
        if (params.tabId) url.searchParams.set("tabId", params.tabId);
        else url.searchParams.delete("tabId");
      }
      if (params.sectionId !== undefined) {
        if (params.sectionId) url.searchParams.set("sectionId", params.sectionId);
        else url.searchParams.delete("sectionId");
      }
      if (params.fieldId !== undefined) {
        if (params.fieldId) url.searchParams.set("fieldId", params.fieldId);
        else url.searchParams.delete("fieldId");
      }
      if (params.formId !== undefined) {
        if (params.formId) url.searchParams.set("formId", params.formId);
        else url.searchParams.delete("formId");
      }

      window.history.pushState(null, "", url.toString());
    },
    []
  );

  // Parse Initial URL State & Handle PopState (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const searchParams = new URLSearchParams(window.location.search);

      const sec = searchParams.get("section");
      if (sec === "overview" || sec === "data" || sec === "queues" || sec === "forms") {
        setActiveSection(sec);
      } else if (sec === "form") {
        setActiveSection("forms");
      } else {
        setActiveSection("overview");
      }

      const sub = searchParams.get("subtab");
      if (sub === "properties" || sub === "choiceLists") {
        setActiveSubtab(sub);
      }

      setSelectedPropertyId(searchParams.get("propertyId"));
      setSelectedChoiceListId(searchParams.get("choiceListId"));
      setSelectedTabId(searchParams.get("tabId"));
      setSelectedSectionId(searchParams.get("sectionId"));
      setSelectedFieldId(searchParams.get("fieldId"));
      setActiveFormId(searchParams.get("formId"));
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Central Load Function
  const loadStudioData = useCallback(async () => {
    setIsLoading(true);
    setErrorState(null);
    setSessionExpiredError(null);
    setIsRevisionConflict(false);
    setConflictMessage(null);

    try {
      const [solRes, propsRes, clRes, presetsRes, formsRes, queuesRes] = await Promise.all([
        apiFetchSolution(solutionId),
        apiFetchProperties(solutionId),
        apiFetchChoiceLists(solutionId),
        apiFetchRegexPresets(),
        apiFetchForms(solutionId),
        apiFetchQueues(solutionId).catch(() => ({ queues: [] })),
      ]);

      setSolution(solRes.solution);
      setProperties(propsRes.properties);
      setChoiceLists(clRes.choiceLists);
      setRegexPresets(presetsRes.presets);
      setQueues(queuesRes.queues || []);
      const loadedForms = formsRes.forms || [];
      setForms(loadedForms);

      // If activeFormId is specified in URL, load it
      const currentUrlFormId = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("formId")
        : null;
      const targetFormId = activeFormId || currentUrlFormId;

      if (targetFormId) {
        try {
          const formRes = await apiFetchForm(solutionId, targetFormId);
          setFormAggregate(formRes);
          setActiveFormId(targetFormId);
        } catch {
          // If specified form cannot be loaded, clear active form
          setActiveFormId(null);
          setFormAggregate(null);
        }
      } else {
        setFormAggregate(null);
      }

      setIsOverviewDirty(false);
      setIsPropertyEditorDirty(false);
      setIsChoiceListEditorDirty(false);
      setIsFieldInspectorDirty(false);

      setStatusAnnouncement("Design Studio data loaded successfully.");
    } catch (err: any) {
      if (err instanceof StudioApiError) {
        if (err.status === 401) {
          setSessionExpiredError("Your session has expired. Please log in again to continue.");
        } else if (err.status === 403) {
          setErrorState({
            title: "Access Forbidden (HTTP 403)",
            message: "You do not have permission to view or edit this Solution in Design Studio.",
            code: "FORBIDDEN",
          });
        } else if (err.status === 404) {
          setErrorState({
            title: "Solution Not Found (HTTP 404)",
            message: "The requested Solution does not exist or has been deleted.",
            code: "NOT_FOUND",
          });
        } else {
          setErrorState({
            title: "Error Loading Studio",
            message: err.message || "Failed to load Solution studio data.",
            code: "SERVER_ERROR",
          });
        }
      } else {
        setErrorState({
          title: "Unexpected Error",
          message: err?.message || "An error occurred while initializing Design Studio.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [solutionId, activeFormId]);

  const handleConfigureForm = async (targetFormId: string) => {
    setIsLoading(true);
    try {
      const [formRes, queuesRes] = await Promise.all([
        apiFetchForm(solutionId, targetFormId),
        apiFetchQueues(solutionId).catch(() => ({ queues: [] })),
      ]);
      setFormAggregate(formRes);
      if (queuesRes?.queues) {
        setQueues(queuesRes.queues);
      }
      setActiveFormId(targetFormId);
      setSelectedFieldId(null);
      setSelectedSectionId(null);
      const initialTabId = formRes.tabs?.[0]?.id || null;
      setSelectedTabId(initialTabId);
      syncUrlParams({
        formId: targetFormId,
        fieldId: null,
        sectionId: null,
        tabId: initialTabId,
      });
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToFormsLanding = () => {
    setActiveFormId(null);
    setSelectedFieldId(null);
    setSelectedSectionId(null);
    syncUrlParams({ formId: null, fieldId: null, sectionId: null });
  };

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await loadStudioData();
      }
    };
    void init();
    return () => {
      ignore = true;
    };
  }, [loadStudioData]);

  // Window Unload Protection for Unsaved Edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Section Change Handler with Dirty Protection
  const handleSectionChange = (targetSection: "overview" | "data" | "queues" | "forms") => {
    if (targetSection === activeSection) return;
    if (isDirty) {
      setPendingSectionChange(targetSection);
    } else {
      if (targetSection === "data") {
        setSelectedPropertyId(null);
        setSelectedChoiceListId(null);
        setActiveSubtab("properties");
      }
      if (targetSection === "forms") {
        apiFetchQueues(solutionId)
          .then((res) => {
            if (res.queues) setQueues(res.queues);
          })
          .catch(() => {});
      }
      setActiveSection(targetSection);
      syncUrlParams({
        section: targetSection,
        subtab: targetSection === "data" ? "properties" : undefined,
        propertyId: targetSection === "data" ? null : undefined,
        choiceListId: targetSection === "data" ? null : undefined,
      });
    }
  };

  const handleRevisionUpdate = (newRevision: number) => {
    if (solution) {
      setSolution((prev: any) => ({ ...prev, revision: newRevision }));
    }
    setIsRevisionConflict(false);
    setConflictMessage(null);
  };

  const handleApiError = (err: any) => {
    if (err?.status === 401 || err?.code === "UNAUTHENTICATED") {
      setSessionExpiredError("Your session has expired. Please log in again to continue.");
    } else if (
      err?.code === "REVISION_CONFLICT" ||
      err?.message?.toLowerCase().includes("revision conflict")
    ) {
      setIsRevisionConflict(true);
      setConflictMessage(err.message || "The Solution was modified concurrently by another process.");
    }
    throw err;
  };

  // --- Solution Patch ---
  const handleSaveSolution = async (payload: { name: string; description: string | null; expectedRevision: number }) => {
    try {
      const res = await apiUpdateSolution(solutionId, payload);
      setSolution(res.solution);
      setIsOverviewDirty(false);
      setStatusAnnouncement("Solution overview updated.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  // --- Property Actions ---
  const handleSaveProperty = async (payload: any) => {
    try {
      const isUpdate = !!payload.id;
      if (payload.id) {
        const res = await apiUpdateProperty(solutionId, payload.id, payload);
        handleRevisionUpdate(res.solutionRevision);
        setSelectedPropertyId(payload.id);
      } else {
        const res = await apiCreateProperty(solutionId, payload);
        handleRevisionUpdate(res.solutionRevision);
        if (res.property?.id) {
          setSelectedPropertyId(res.property.id);
          syncUrlParams({ propertyId: res.property.id });
        }
      }
      const propsRes = await apiFetchProperties(solutionId);
      setProperties(propsRes.properties);
      setIsPropertyEditorDirty(false);
      const msg = isUpdate ? "Property updated successfully." : "Property saved successfully.";
      showToast(msg);
      setStatusAnnouncement(msg);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeleteProperty = async (propertyId: string, expectedRevision: number) => {
    try {
      const res = await apiDeleteProperty(solutionId, propertyId, expectedRevision);
      handleRevisionUpdate(res.solutionRevision);

      const propsRes = await apiFetchProperties(solutionId);
      setProperties(propsRes.properties);

      if (selectedPropertyId === propertyId) {
        const remainingProps = propsRes.properties;
        const nextSelected = remainingProps.length > 0 ? remainingProps[0].id : null;
        setSelectedPropertyId(nextSelected);
        syncUrlParams({ propertyId: nextSelected });
      }

      showToast("Property deleted successfully.");
      setStatusAnnouncement("Property deleted.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  // --- Centralized Choice Mutation Coordinator ---
  const latestRevisionRef = useRef<number>(expectedRevision);
  useEffect(() => {
    latestRevisionRef.current = expectedRevision;
  }, [expectedRevision]);

  const executeChoiceMutation = async <T,>(
    mutationFn: (currentRev: number) => Promise<any>
  ): Promise<T> => {
    const currentRev = latestRevisionRef.current;
    const res = await mutationFn(currentRev);
    if (res?.solutionRevision) {
      handleRevisionUpdate(res.solutionRevision);
      latestRevisionRef.current = res.solutionRevision;
    }
    const clRes = await apiFetchChoiceLists(solutionId);
    setChoiceLists(clRes.choiceLists);
    return res as T;
  };

  // --- Choice List Actions ---
  const handleSaveChoiceList = async (payload: any) => {
    try {
      let createdChoiceListId: string | null = null;
      let currentRev = latestRevisionRef.current;

      if (payload.id) {
        const res = await executeChoiceMutation<{ choiceList: any; solutionRevision: number }>((rev) =>
          apiUpdateChoiceList(solutionId, payload.id, {
            expectedRevision: rev,
            name: payload.name,
            description: payload.description || null,
          })
        );
        createdChoiceListId = res.choiceList.id;
        setSelectedChoiceListId(res.choiceList.id);
        currentRev = latestRevisionRef.current;
      } else {
        const createPayload = {
          expectedRevision: currentRev,
          key: payload.key || payload.name.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_"),
          name: payload.name.trim(),
          description: payload.description || null,
        };
        const res = await executeChoiceMutation<{ choiceList: any; solutionRevision: number }>((rev) =>
          apiCreateChoiceList(solutionId, { ...createPayload, expectedRevision: rev })
        );
        currentRev = latestRevisionRef.current;
        if (res.choiceList?.id) {
          createdChoiceListId = res.choiceList.id;
          setSelectedChoiceListId(res.choiceList.id);
          syncUrlParams({ choiceListId: res.choiceList.id });
        }

        if (res.choiceList?.id && payload.options && Array.isArray(payload.options)) {
          for (let i = 0; i < payload.options.length; i++) {
            const opt = payload.options[i];
            if (opt.label && opt.label.trim()) {
              const rawKey = opt.key || opt.label.trim();
              let cleanKey = rawKey.toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
              if (!cleanKey || /^[0-9]/.test(cleanKey)) {
                cleanKey = `opt_${cleanKey || "val"}`;
              }

              try {
                await executeChoiceMutation((rev) =>
                  apiCreateChoiceOption(solutionId, res.choiceList.id, {
                    expectedRevision: rev,
                    key: cleanKey,
                    label: opt.label.trim(),
                  })
                );
                currentRev = latestRevisionRef.current;
              } catch (optErr: any) {
                throw new Error(`Failed creating option "${opt.label.trim()}": ${optErr?.message || "Invalid option"}`);
              }
            }
          }
        }
      }

      setIsChoiceListEditorDirty(false);
      showToast("Reusable choices saved successfully.");
      setStatusAnnouncement("Choice list saved.");
      return { choiceList: { id: createdChoiceListId }, solutionRevision: currentRev };
    } catch (err: any) {
      handleApiError(err);
      throw err;
    }
  };

  const handleAddChoiceOption = async (choiceListId: string, payload: { key: string; label: string }) => {
    try {
      await executeChoiceMutation((rev) =>
        apiCreateChoiceOption(solutionId, choiceListId, {
          expectedRevision: rev,
          key: payload.key,
          label: payload.label,
        })
      );
      showToast("Choice option added.");
      setStatusAnnouncement("Choice option added.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleUpdateChoiceOptionLabel = async (choiceListId: string, optionId: string, label: string) => {
    try {
      await executeChoiceMutation((rev) =>
        apiUpdateChoiceOptionLabel(solutionId, choiceListId, optionId, {
          expectedRevision: rev,
          label,
        })
      );
      showToast("Choice option renamed.");
      setStatusAnnouncement("Choice option renamed.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeactivateChoiceOption = async (choiceListId: string, optionId: string) => {
    try {
      await executeChoiceMutation((rev) =>
        apiDeactivateChoiceOption(solutionId, choiceListId, optionId, {
          expectedRevision: rev,
        })
      );
      showToast("Choice option deactivated.");
      setStatusAnnouncement("Choice option deactivated.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleReactivateChoiceOption = async (choiceListId: string, optionId: string) => {
    try {
      await executeChoiceMutation((rev) =>
        apiReactivateChoiceOption(solutionId, choiceListId, optionId, {
          expectedRevision: rev,
        })
      );
      showToast("Choice option reactivated.");
      setStatusAnnouncement("Choice option reactivated.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeleteChoiceList = async (choiceListId: string) => {
    try {
      await executeChoiceMutation((rev) => apiDeleteChoiceList(solutionId, choiceListId, rev));
      showToast("Choice Set deleted successfully.");
      setStatusAnnouncement("Choice set deleted.");
    } catch (err: any) {
      handleApiError(err);
      throw err;
    }
  };

  const handleReorderChoiceOptions = async (choiceListId: string, optionIds: string[]) => {
    try {
      await executeChoiceMutation((rev) =>
        apiReorderChoiceOptions(solutionId, choiceListId, {
          expectedRevision: rev,
          optionIds,
        })
      );
      showToast("Options reordered.");
      setStatusAnnouncement("Options reordered.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  // --- Canonical Whole-Form Aggregate Save Action ---
  const handleSaveFormDraft = async (draft: { tabs: any[]; sections: any[]; fields: any[]; queueRules?: any[] }) => {
    const fid = activeFormId || formAggregate?.form?.id || (forms.length > 0 ? forms[0].id : null);
    if (!fid) throw new Error("No form selected");

    try {
      const res = await apiSaveFormAggregate(solutionId, fid, {
        expectedRevision: solution?.revision || 1,
        tabs: draft.tabs,
        sections: draft.sections,
        fields: draft.fields,
        queueRules: draft.queueRules,
      });
      setFormAggregate(res.formAggregate);
      handleRevisionUpdate(res.solutionRevision);
      setIsFormDirty(false);
      setIsFieldInspectorDirty(false);
      showToast("Form layout saved successfully.");
      setStatusAnnouncement("Form layout saved.");
      return res.formAggregate;
    } catch (err: any) {
      handleApiError(err);
      throw err;
    }
  };

  // --- Form Action Target Helper ---
  const getTargetFormId = () => {
    const fid = activeFormId || formAggregate?.form?.id || (forms.length > 0 ? forms[0].id : null);
    if (!fid) throw new Error("No form selected");
    return fid;
  };

  // --- Form Tab Actions ---
  const handleCreateTab = async (payload: { title: string; expectedRevision: number }) => {
    try {
      const fid = getTargetFormId();
      const res = await apiCreateTab(solutionId, fid, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (res.tab?.id) {
        setSelectedTabId(res.tab.id);
        syncUrlParams({ tabId: res.tab.id });
      }
      setStatusAnnouncement("Tab created.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleUpdateTab = async (tabId: string, payload: { title?: string; expectedRevision: number }) => {
    try {
      const fid = getTargetFormId();
      const res = await apiUpdateTab(solutionId, fid, tabId, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeleteTab = async (tabId: string, expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiDeleteTab(solutionId, fid, tabId, expectedRevision);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (selectedTabId === tabId) {
        const remainingTabs = formRes.tabs;
        const nextSelected = remainingTabs.length > 0 ? remainingTabs[0].id : null;
        setSelectedTabId(nextSelected);
        syncUrlParams({ tabId: nextSelected });
      }
      setStatusAnnouncement("Tab deleted.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleReorderTabs = async (tabIds: string[], expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiReorderTabs(solutionId, fid, { tabIds, expectedRevision });
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  // --- Form Section Actions ---
  const handleCreateSection = async (tabId: string, payload: { title: string; expectedRevision: number }) => {
    try {
      const fid = getTargetFormId();
      const res = await apiCreateSection(solutionId, fid, tabId, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (res.section?.id) {
        setSelectedSectionId(res.section.id);
        syncUrlParams({ sectionId: res.section.id });
      }
      setStatusAnnouncement("Section created.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleUpdateSection = async (sectionId: string, payload: { title?: string; expectedRevision: number }) => {
    try {
      const fid = getTargetFormId();
      const res = await apiUpdateSection(solutionId, fid, sectionId, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeleteSection = async (sectionId: string, expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiDeleteSection(solutionId, fid, sectionId, expectedRevision);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
        syncUrlParams({ sectionId: null });
      }
      setStatusAnnouncement("Section deleted.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleMoveSection = async (sectionId: string, targetTabId: string, expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiMoveSection(solutionId, fid, sectionId, { targetTabId, expectedRevision });
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      setStatusAnnouncement("Section moved.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleReorderSections = async (tabId: string, sectionIds: string[], expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiReorderSections(solutionId, fid, { tabId, sectionIds, expectedRevision });
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  // --- Form Field Actions ---
  const handleAddField = async (sectionId: string, payload: any) => {
    try {
      const fid = getTargetFormId();
      const res = await apiAddFieldReference(solutionId, fid, sectionId, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (res.fieldReference?.id) {
        setSelectedFieldId(res.fieldReference.id);
        syncUrlParams({ fieldId: res.fieldReference.id });
      }
      setStatusAnnouncement("Field reference added.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleUpdateField = async (fieldReferenceId: string, payload: any) => {
    try {
      const fid = getTargetFormId();
      const res = await apiUpdateFieldReference(solutionId, fid, fieldReferenceId, payload);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      setSelectedFieldId(fieldReferenceId);
      setIsFieldInspectorDirty(false);
      setStatusAnnouncement("Field reference updated.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDeleteField = async (fieldReferenceId: string, expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiDeleteFieldReference(solutionId, fid, fieldReferenceId, expectedRevision);
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      if (selectedFieldId === fieldReferenceId) {
        setSelectedFieldId(null);
        syncUrlParams({ fieldId: null });
      }
      setStatusAnnouncement("Field reference removed.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleMoveField = async (fieldReferenceId: string, targetSectionId: string, expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiMoveFieldReference(solutionId, fid, fieldReferenceId, { targetSectionId, expectedRevision });
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
      setStatusAnnouncement("Field reference moved.");
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleReorderFields = async (sectionId: string, fieldReferenceIds: string[], expectedRevision: number) => {
    try {
      const fid = getTargetFormId();
      const res = await apiReorderFieldReferences(solutionId, fid, { sectionId, fieldReferenceIds, expectedRevision });
      handleRevisionUpdate(res.solutionRevision);
      const formRes = await apiFetchForm(solutionId, fid);
      setFormAggregate(formRes);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const router = useRouter();
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  const handleBackToSolutions = () => {
    if (isDirty) {
      setPendingNavigationUrl("/studio/solutions");
    } else {
      router.push("/studio/solutions");
    }
  };

  const propertyRef = useRef<PropertyEditorHandle>(null);
  const queueRef = useRef<QueueManagerHandle>(null);
  const formDesignerRef = useRef<FormDesignerHandle>(null);

  return (
    <StudioShell
      solution={solution}
      isLoading={isLoading}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      statusAnnouncement={statusAnnouncement}
      isRevisionConflict={isRevisionConflict}
      conflictMessage={conflictMessage}
      onReloadConflict={loadStudioData}
      onBackToSolutions={handleBackToSolutions}
      errorState={errorState}
      isDirty={isDirty}
    >
      {/* Session Expiry Error Banner */}
      {sessionExpiredError && (
        <div style={{ maxWidth: "1040px", margin: "0 auto var(--space-4) auto", width: "100%" }}>
          <Alert variant="error">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span>{sessionExpiredError}</span>
              <a href="/login" style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}>
                  Log In
                </Button>
              </a>
            </div>
          </Alert>
        </div>
      )}

      {/* Unsaved Edits Modal for Section Switching */}
      {pendingSectionChange && (
        <UnsavedChangesModal
          isOpen={true}
          onSave={async () => {
            if (isPropertyEditorDirty && propertyRef.current) {
              const success = await propertyRef.current.submitSave();
              if (!success) return;
            }
            if (isQueueManagerDirty && queueRef.current) {
              const success = await queueRef.current.submitSave();
              if (!success) return;
            }
            if ((isFieldInspectorDirty || isFormDirty) && formDesignerRef.current) {
              const success = await formDesignerRef.current.submitSave();
              if (!success) return;
            }
            setIsOverviewDirty(false);
            setIsPropertyEditorDirty(false);
            setIsChoiceListEditorDirty(false);
            setIsFieldInspectorDirty(false);
            setIsFormDirty(false);
            setIsQueueManagerDirty(false);

            const target = pendingSectionChange;
            if (target === "data") {
              setSelectedPropertyId(null);
              setSelectedChoiceListId(null);
              setActiveSubtab("properties");
            }
            if (target === "forms") {
              apiFetchQueues(solutionId)
                .then((res) => {
                  if (res.queues) setQueues(res.queues);
                })
                .catch(() => {});
            }
            setPendingSectionChange(null);
            if (target) {
              setActiveSection(target);
              syncUrlParams({
                section: target,
                subtab: target === "data" ? "properties" : undefined,
                propertyId: target === "data" ? null : undefined,
                choiceListId: target === "data" ? null : undefined,
              });
            }
          }}
          onDiscard={() => {
            if (isPropertyEditorDirty && propertyRef.current) {
              propertyRef.current.discard();
            }
            if (isQueueManagerDirty && queueRef.current) {
              queueRef.current.discard();
            }
            if ((isFieldInspectorDirty || isFormDirty) && formDesignerRef.current) {
              formDesignerRef.current.discard();
            }
            setIsOverviewDirty(false);
            setIsPropertyEditorDirty(false);
            setIsChoiceListEditorDirty(false);
            setIsFieldInspectorDirty(false);
            setIsFormDirty(false);
            setIsQueueManagerDirty(false);

            const target = pendingSectionChange;
            if (target === "data") {
              setSelectedPropertyId(null);
              setSelectedChoiceListId(null);
              setActiveSubtab("properties");
            }
            if (target === "forms") {
              apiFetchQueues(solutionId)
                .then((res) => {
                  if (res.queues) setQueues(res.queues);
                })
                .catch(() => {});
            }
            setPendingSectionChange(null);
            if (target) {
              setActiveSection(target);
              syncUrlParams({
                section: target,
                subtab: target === "data" ? "properties" : undefined,
                propertyId: target === "data" ? null : undefined,
                choiceListId: target === "data" ? null : undefined,
              });
            }
          }}
          onCancel={() => setPendingSectionChange(null)}
        />
      )}

      {/* Unsaved Edits Modal for Route Navigation */}
      {pendingNavigationUrl && (
        <UnsavedChangesModal
          isOpen={true}
          onSave={async () => {
            if (isPropertyEditorDirty && propertyRef.current) {
              const success = await propertyRef.current.submitSave();
              if (!success) return;
            }
            if (isQueueManagerDirty && queueRef.current) {
              const success = await queueRef.current.submitSave();
              if (!success) return;
            }
            if ((isFieldInspectorDirty || isFormDirty) && formDesignerRef.current) {
              const success = await formDesignerRef.current.submitSave();
              if (!success) return;
            }
            setIsOverviewDirty(false);
            setIsPropertyEditorDirty(false);
            setIsChoiceListEditorDirty(false);
            setIsFieldInspectorDirty(false);
            setIsFormDirty(false);
            setIsQueueManagerDirty(false);

            const target = pendingNavigationUrl;
            setPendingNavigationUrl(null);
            router.push(target);
          }}
          onDiscard={() => {
            if (isPropertyEditorDirty && propertyRef.current) {
              propertyRef.current.discard();
            }
            if (isQueueManagerDirty && queueRef.current) {
              queueRef.current.discard();
            }
            if ((isFieldInspectorDirty || isFormDirty) && formDesignerRef.current) {
              formDesignerRef.current.discard();
            }
            setIsOverviewDirty(false);
            setIsPropertyEditorDirty(false);
            setIsChoiceListEditorDirty(false);
            setIsFieldInspectorDirty(false);
            setIsFormDirty(false);
            setIsQueueManagerDirty(false);

            const target = pendingNavigationUrl;
            setPendingNavigationUrl(null);
            router.push(target);
          }}
          onCancel={() => setPendingNavigationUrl(null)}
        />
      )}

      {/* Unsaved Edits Modal for Queue A -> Queue B Switch */}
      {pendingQueueSelection && (
        <UnsavedChangesModal
          isOpen={true}
          onSave={async () => {
            if (isQueueManagerDirty && queueRef.current) {
              const success = await queueRef.current.submitSave();
              if (!success) return;
            }
            setIsQueueManagerDirty(false);
            const targetQueueId = pendingQueueSelection;
            setPendingQueueSelection(null);
            if (queueRef.current && targetQueueId) {
              queueRef.current.selectQueue(targetQueueId);
            }
          }}
          onDiscard={() => {
            if (isQueueManagerDirty && queueRef.current) {
              queueRef.current.discard();
            }
            setIsQueueManagerDirty(false);
            const targetQueueId = pendingQueueSelection;
            setPendingQueueSelection(null);
            if (queueRef.current && targetQueueId) {
              queueRef.current.selectQueue(targetQueueId);
            }
          }}
          onCancel={() => setPendingQueueSelection(null)}
        />
      )}

      {/* Active Section Rendering */}
      {activeSection === "overview" && (
        <OverviewSection
          solution={solution}
          isLoading={isLoading}
          onSaveSolution={handleSaveSolution}
          isDirty={isOverviewDirty}
          setIsDirty={setIsOverviewDirty}
          onReloadSolution={loadStudioData}
        />
      )}

      {activeSection === "data" && (
        <DataSection
          solutionId={solutionId}
          solutionPrefix={solution?.solutionPrefix || solution?.prefix || ""}
          properties={properties}
          choiceLists={choiceLists}
          regexPresets={regexPresets}
          expectedRevision={solution?.revision || 1}
          isLoading={isLoading}
          onSaveProperty={handleSaveProperty}
          onDeleteProperty={handleDeleteProperty}
          onSaveChoiceList={handleSaveChoiceList}
          onDeleteChoiceList={handleDeleteChoiceList}
          onAddChoiceOption={handleAddChoiceOption}
          onUpdateChoiceOptionLabel={handleUpdateChoiceOptionLabel}
          onDeactivateChoiceOption={handleDeactivateChoiceOption}
          onReactivateChoiceOption={handleReactivateChoiceOption}
          onReorderChoiceOptions={handleReorderChoiceOptions}
          activeSubtab={activeSubtab}
          setActiveSubtab={(sub) => {
            setActiveSubtab(sub);
            syncUrlParams({ subtab: sub });
          }}
          selectedPropertyId={selectedPropertyId}
          setSelectedPropertyId={(pid) => {
            setSelectedPropertyId(pid);
            syncUrlParams({ propertyId: pid });
          }}
          selectedChoiceListId={selectedChoiceListId}
          setSelectedChoiceListId={(clid) => {
            setSelectedChoiceListId(clid);
            syncUrlParams({ choiceListId: clid });
          }}
          isPropertyEditorDirty={isPropertyEditorDirty}
          setIsPropertyEditorDirty={setIsPropertyEditorDirty}
          isChoiceListEditorDirty={isChoiceListEditorDirty}
          setIsChoiceListEditorDirty={setIsChoiceListEditorDirty}
          propertyRefProp={propertyRef}
          isSessionExpired={Boolean(sessionExpiredError)}
        />
      )}

      {activeSection === "forms" && (
        activeFormId === null ? (
          <FormsLanding
            forms={forms}
            onConfigureForm={handleConfigureForm}
            isLoading={isLoading}
            onReload={loadStudioData}
          />
        ) : (
          <FormDesigner
            ref={formDesignerRef}
            solutionId={solutionId}
            expectedRevision={solution?.revision || 1}
            formAggregate={formAggregate}
            properties={properties}
            choiceLists={choiceLists}
            queues={queues}
            isLoading={isLoading}
            onBackToLanding={handleBackToFormsLanding}
            onSwitchForm={handleConfigureForm}
            allForms={forms}
            onCreateTab={handleCreateTab}
            onUpdateTab={handleUpdateTab}
            onDeleteTab={handleDeleteTab}
            onReorderTabs={handleReorderTabs}
            onCreateSection={handleCreateSection}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onMoveSection={handleMoveSection}
            onReorderSections={handleReorderSections}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onMoveField={handleMoveField}
            onReorderFields={handleReorderFields}
            onOpenPropertyEditor={(propertyId) => {
              setActiveSection("data");
              setActiveSubtab("properties");
              setSelectedPropertyId(propertyId);
              syncUrlParams({ section: "data", subtab: "properties", propertyId });
            }}
            selectedTabId={selectedTabId}
            setSelectedTabId={(tid) => {
              setSelectedTabId(tid);
              syncUrlParams({ tabId: tid });
            }}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={(sid) => {
              setSelectedSectionId(sid);
              syncUrlParams({ sectionId: sid });
            }}
            selectedFieldId={selectedFieldId}
            setSelectedFieldId={(fid) => {
              setSelectedFieldId(fid);
              syncUrlParams({ fieldId: fid });
            }}
            isFieldInspectorDirty={isFieldInspectorDirty}
            setIsFieldInspectorDirty={setIsFieldInspectorDirty}
            onSaveForm={handleSaveFormDraft}
            isFormDirty={isFormDirty}
            setIsFormDirty={setIsFormDirty}
            isSessionExpired={Boolean(sessionExpiredError)}
          />
        )
      )}

      {activeSection === "queues" && (
        <QueueManager
          ref={queueRef}
          solutionId={solutionId}
          solutionRevision={solution?.revision || 1}
          onRevisionUpdate={handleRevisionUpdate}
          onApiError={handleApiError}
          isDirty={isQueueManagerDirty}
          setIsDirty={setIsQueueManagerDirty}
          onQueuesUpdated={(updatedQueues) => setQueues(updatedQueues)}
          onSelectQueueRequest={(targetQueueId) => {
            if (isQueueManagerDirty) {
              setPendingQueueSelection(targetQueueId);
            } else {
              queueRef.current?.selectQueue(targetQueueId);
            }
          }}
        />
      )}

      <Toast
        message={toastMessage}
        isOpen={isToastOpen}
        onClose={() => setIsToastOpen(false)}
      />
    </StudioShell>
  );
}
