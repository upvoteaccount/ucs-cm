import { DemoDocument } from "./types";

export interface PrivateDocSpec {
  id: string;
  baseName: string;
  displayName: string;
  documentType: "AADHAAR" | "PAN" | "OTHER";
  defaultSize: string;
  defaultTime: string;
}

export const PRIVATE_DOC_SPECS: PrivateDocSpec[] = [
  {
    id: "doc-aadhaar-01",
    baseName: "aadhaar",
    displayName: "Aadhaar Card",
    documentType: "AADHAAR",
    defaultSize: "1.2 MB",
    defaultTime: "Today, 09:12 AM",
  },
  {
    id: "doc-pan-02",
    baseName: "pan",
    displayName: "PAN Card",
    documentType: "PAN",
    defaultSize: "840 KB",
    defaultTime: "Today, 09:14 AM",
  },
  {
    id: "doc-passport-03",
    baseName: "passport",
    displayName: "Passport",
    documentType: "OTHER",
    defaultSize: "2.1 MB",
    defaultTime: "Today, 09:15 AM",
  },
];

const SUPPORTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

/**
 * Resolves a private local document by checking if any supported format exists in public/demo-documents/private/
 * Supports aadhaar.pdf, aadhaar.jpg, aadhaar.jpeg, aadhaar.png, etc.
 * Whichever supported file actually exists is resolved.
 */
export function resolvePrivateDocument(spec: PrivateDocSpec): DemoDocument {
  if (typeof window === "undefined") {
    try {
      const fs = eval("require")("fs");
      const path = eval("require")("path");
      const privateDir = path.join(process.cwd(), "public", "demo-documents", "private");

      if (fs.existsSync(privateDir)) {
        for (const ext of SUPPORTED_EXTENSIONS) {
          const fileName = `${spec.baseName}${ext}`;
          const filePath = path.join(privateDir, fileName);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const sizeStr =
              stat.size > 1024 * 1024
                ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(stat.size / 1024)} KB`;
            return {
              id: spec.id,
              name: `${spec.displayName}${ext}`,
              type: getMimeType(ext),
              size: sizeStr || spec.defaultSize,
              pageCount: ext === ".pdf" ? 2 : 1,
              uploadedAt: spec.defaultTime,
              documentType: spec.documentType,
              fileUrl: `/demo-documents/private/${fileName}`,
              isAvailable: true,
            };
          }
        }
      }
    } catch {
      // In browser or non-Node environment
    }
  }

  // File is not present locally; return clean missing state (isAvailable: false)
  return {
    id: spec.id,
    name: `${spec.displayName}.pdf`,
    type: "application/pdf",
    size: spec.defaultSize,
    pageCount: 1,
    uploadedAt: spec.defaultTime,
    documentType: spec.documentType,
    fileUrl: "",
    isAvailable: false,
  };
}

/**
 * Resolves all demo documents, combining dynamically resolved private documents
 * with fallback office documents for viewer capability verification.
 */
export function getResolvedDemoDocuments(): DemoDocument[] {
  const privateDocs = PRIVATE_DOC_SPECS.map(resolvePrivateDocument);

  // Maintain Word and Spreadsheet demo files for adapter fallback coverage
  const sampleDocs: DemoDocument[] = [
    {
      id: "doc-emp-05",
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
      id: "doc-amort-06",
      name: "Amortization Schedule.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: "95 KB",
      pageCount: 1,
      uploadedAt: "Today, 09:20 AM",
      documentType: "EXCEL",
      fileUrl: "/demo-documents/amortization-schedule.xlsx",
      isAvailable: true,
    },
  ];

  return [...privateDocs, ...sampleDocs];
}

export const DEFAULT_DEMO_DOCUMENTS: DemoDocument[] = getResolvedDemoDocuments();
