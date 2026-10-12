import { DemoWorkItem } from "./types";
import { DEMO_CASES } from "./cases";

export const DEMO_WORK_ITEMS: DemoWorkItem[] = Object.entries(DEMO_CASES).map(
  ([wid, caseData]) => ({
    wid,
    caseId: caseData.caseId,
    customerName: caseData.customerName,
    status: caseData.status,
    receivedDate: caseData.receivedDate,
    queueKey: caseData.assignedQueueKey,
    queueName: caseData.assignedQueueName,
  })
);

