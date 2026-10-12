export interface DemoDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  pageCount: number;
  uploadedAt: string;
  verified?: boolean;
  documentType: "AADHAAR" | "PAN" | "INCOME_PROOF" | "PHOTO" | "WORD" | "EXCEL" | "OTHER";
  fileUrl: string;
  isAvailable?: boolean;
}

export interface DemoCaseData {
  caseId: string;
  customerName: string;
  status?: string;
  receivedDate: string;
  assignedQueueKey: string;
  assignedQueueName: string;
  values: Record<string, any>;
  documents: DemoDocument[];
}

export interface DemoWorkItem {
  wid: string;
  caseId: string;
  customerName: string;
  status?: string;
  receivedDate: string;
  queueKey: string;
  queueName: string;
}

export interface DemoSearchCriteria {
  caseId?: string;
  wid?: string;
  customerName?: string;
  queueKey?: string;
  receivedFrom?: string;
  receivedTo?: string;
}

export interface DemoCaseHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}
