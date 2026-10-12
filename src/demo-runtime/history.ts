import { DemoCaseHistoryEntry } from "./types";

/**
 * Returns isolated demo case history entries for a given WID.
 * Uses realistic operational history rows without inventing unnecessary workflow transitions.
 */
export function getDemoCaseHistory(wid: string): DemoCaseHistoryEntry[] {
  return [
    {
      id: `hist-${wid}-01`,
      timestamp: "Today, 09:10 AM",
      action: "Case Created",
      actor: "Customer (Portal)",
      details: "Initial personal loan application submitted via customer self-service portal.",
    },
    {
      id: `hist-${wid}-02`,
      timestamp: "Today, 09:12 AM",
      action: "Documents Uploaded",
      actor: "Customer (Portal)",
      details: "Identity verification documents uploaded: Aadhaar Card, PAN Card, Income Proof.",
    },
    {
      id: `hist-${wid}-03`,
      timestamp: "Today, 09:15 AM",
      action: "Assigned to Queue",
      actor: "System Router",
      details: "Work item routed to SOL Maker queue for KYC and initial underwriting verification.",
    },
    {
      id: `hist-${wid}-04`,
      timestamp: "Today, 10:05 AM",
      action: "Opened for Processing",
      actor: "Loan Officer (Operator)",
      details: "Application opened in processing workspace for document inspection.",
    },
  ];
}
