import { DemoCaseData, DemoWorkItem, DemoSearchCriteria } from "./types";
import { DEMO_CASES } from "./cases";
import { getResolvedDemoDocuments } from "./documents";

// In-memory runtime state for demo session mutations
const runtimeCases: Record<string, DemoCaseData> = { ...DEMO_CASES };

export function normalizeQueueString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesQueue(itemQueueKey: string, itemQueueName: string, query: string): boolean {
  const normQuery = normalizeQueueString(query);
  const normKey = normalizeQueueString(itemQueueKey);
  const normName = normalizeQueueString(itemQueueName);

  return (
    normKey === normQuery ||
    normName === normQuery ||
    normKey.includes(normQuery) ||
    normQuery.includes(normKey) ||
    normName.includes(normQuery) ||
    normQuery.includes(normName)
  );
}

export function getDemoQueueCounts(solutionPrefix: string = "PLA"): Record<string, number> {
  const counts: Record<string, number> = {
    [`${solutionPrefix}_SOL_MAKER`]: 3,
    [`${solutionPrefix}_SOL_CHECKER`]: 2,
    [`${solutionPrefix}_TFC_COMP`]: 4,
    [`${solutionPrefix}_TFC_AUTH`]: 1,
    "SOL Maker": 3,
    "SOL Checker": 2,
    "TFC Comp": 4,
    "TFC Auth": 1,
  };
  return counts;
}

export function getFallbackDemoQueues(solutionPrefix: string = "PLA") {
  return [
    {
      id: "demo-queue-sol-maker",
      queueKey: `${solutionPrefix}_SOL_MAKER`,
      name: "SOL Maker",
      description: "First-level underwriting and document verification queue",
      count: 3,
    },
    {
      id: "demo-queue-sol-checker",
      queueKey: `${solutionPrefix}_SOL_CHECKER`,
      name: "SOL Checker",
      description: "Second-level credit sanction and verification queue",
      count: 2,
    },
    {
      id: "demo-queue-tfc-comp",
      queueKey: `${solutionPrefix}_TFC_COMP`,
      name: "TFC Comp",
      description: "Trade and Finance compliance verification queue",
      count: 4,
    },
    {
      id: "demo-queue-tfc-auth",
      queueKey: `${solutionPrefix}_TFC_AUTH`,
      name: "TFC Auth",
      description: "Disbursement and authorization queue",
      count: 1,
    },
  ];
}

export function getDemoWorkItemsForQueue(queueIdentifier: string, queueName?: string): DemoWorkItem[] {
  const allItems: DemoWorkItem[] = Object.entries(runtimeCases).map(([wid, caseData]) => ({
    wid,
    caseId: caseData.caseId,
    customerName: caseData.customerName,
    status: caseData.status,
    receivedDate: caseData.receivedDate,
    queueKey: caseData.assignedQueueKey,
    queueName: caseData.assignedQueueName,
  }));

  const matched = allItems.filter((item) => {
    if (matchesQueue(item.queueKey, item.queueName, queueIdentifier)) return true;
    if (queueName && matchesQueue(item.queueKey, item.queueName, queueName)) return true;
    return false;
  });

  if (matched.length > 0) {
    return matched;
  }

  // If queue has no exact matches, generate 2 realistic demo items for it
  const cleanName = queueName || queueIdentifier;
  return [
    {
      wid: `WID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      caseId: `PLA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: "Anand Rathi",
      receivedDate: "Today, 10:15 AM",
      queueKey: queueIdentifier,
      queueName: cleanName,
    },
    {
      wid: `WID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      caseId: `PLA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: "Sneha Kapur",
      receivedDate: "Yesterday, 03:20 PM",
      queueKey: queueIdentifier,
      queueName: cleanName,
    },
  ];
}

export function getDemoCaseByWid(wid: string, fallbackQueueName: string = "SOL Maker"): DemoCaseData {
  if (runtimeCases[wid]) {
    runtimeCases[wid].documents = getResolvedDemoDocuments();
    return runtimeCases[wid];
  }

  // Fallback case generator for arbitrary WID
  const fallbackCase: DemoCaseData = {
    caseId: `PLA-2026-${wid.replace(/[^0-9]/g, "").slice(-4) || "0991"}`,
    customerName: "Rajesh Kumar Sharma",
    receivedDate: "Today, 09:15 AM",
    assignedQueueKey: "PLA_SOL_MAKER",
    assignedQueueName: fallbackQueueName,
    values: {
      firstName: "Rajesh",
      lastName: "Sharma",
      customerName: "Rajesh Kumar Sharma",
      loanAmount: "750000",
      loanPurpose: "Home Renovation",
      employmentType: "Salaried",
      annualIncome: "1200000",
      monthlyIncome: "100000",
      cibilScore: "785",
      panNumber: "ABCDE1234F",
      email: "rajesh.sharma@example.com",
      phoneNumber: "+91 98765 43210",
      city: "Mumbai",
      dateOfBirth: "1988-06-15",
      applicantAge: "38",
      existingLoan: "No",
      remarks: "Application documents uploaded and undergoing verification.",
      PLA_FIRST_NAME: "Rajesh",
      PLA_LAST_NAME: "Sharma",
      PLA_CUSTOMER_NAME: "Rajesh Kumar Sharma",
      PLA_LOAN_AMOUNT: "750000",
      PLA_LOAN_PURPOSE: "Home Renovation",
      PLA_EMPLOYMENT_TYPE: "Salaried",
      PLA_ANNUAL_INCOME: "1200000",
      PLA_MONTHLY_INCOME: "100000",
      PLA_CIBIL_SCORE: "785",
      PLA_PAN_NUMBER: "ABCDE1234F",
      PLA_EMAIL: "rajesh.sharma@example.com",
      PLA_PHONE_NUMBER: "+91 98765 43210",
      PLA_CITY: "Mumbai",
      PLA_DATE_OF_BIRTH: "1988-06-15",
      PLA_EXISTING_LOAN: "No",
      PLA_REMARKS: "Application documents uploaded and undergoing verification.",
    },
    documents: getResolvedDemoDocuments(),
  };

  runtimeCases[wid] = fallbackCase;
  return fallbackCase;
}

export function saveDemoCaseValues(wid: string, newValues: Record<string, any>): DemoCaseData {
  const current = getDemoCaseByWid(wid);
  const updated: DemoCaseData = {
    ...current,
    values: {
      ...current.values,
      ...newValues,
    },
  };
  runtimeCases[wid] = updated;
  return updated;
}

export function searchDemoCases(criteria: string | DemoSearchCriteria): DemoWorkItem[] {
  const allItems: DemoWorkItem[] = Object.entries(runtimeCases).map(([wid, caseData]) => ({
    wid,
    caseId: caseData.caseId,
    customerName: caseData.customerName,
    status: caseData.status,
    receivedDate: caseData.receivedDate,
    queueKey: caseData.assignedQueueKey,
    queueName: caseData.assignedQueueName,
  }));

  if (typeof criteria === "string") {
    const clean = criteria.trim().toLowerCase();
    if (!clean) return allItems;
    return allItems.filter(
      (item) =>
        item.wid.toLowerCase().includes(clean) ||
        item.caseId.toLowerCase().includes(clean) ||
        item.customerName.toLowerCase().includes(clean) ||
        item.queueName.toLowerCase().includes(clean)
    );
  }

  // Structured search criteria
  const { caseId, wid, customerName, queueKey } = criteria;
  const cCaseId = caseId?.trim().toLowerCase();
  const cWid = wid?.trim().toLowerCase();
  const cName = customerName?.trim().toLowerCase();
  const cQueue = queueKey?.trim().toLowerCase();

  return allItems.filter((item) => {
    if (cCaseId && !item.caseId.toLowerCase().includes(cCaseId)) return false;
    if (cWid && !item.wid.toLowerCase().includes(cWid)) return false;
    if (cName && !item.customerName.toLowerCase().includes(cName)) return false;
    if (cQueue && cQueue !== "all" && !matchesQueue(item.queueKey, item.queueName, cQueue)) return false;
    return true;
  });
}
