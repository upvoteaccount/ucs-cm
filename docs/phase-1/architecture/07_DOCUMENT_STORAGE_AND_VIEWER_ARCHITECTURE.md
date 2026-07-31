# 07. Document Storage and Viewer Architecture

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Capabilities Overview

This document specifies the document repository architecture, file upload security pipeline, `StorageService` driver abstractions, and the in-app Document Viewer component for UCS CM Phase 1.

---

## 2. Storage Architecture & Driver Abstraction

Binary document files are decoupled from PostgreSQL. PostgreSQL stores document metadata (file size, MIME type, upload timestamp, case linkage), while binary payloads are managed by an abstract `StorageService` driver.

```text
+-----------------------------------------------------------------------------------------------+
|                                      Document Module Service                                  |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
|                                  StorageService Interface                                     |
|  - writeStream(storageKey: string, stream: Readable): Promise<void>                           |
|  - readStream(storageKey: string): Promise<Readable>                                          |
|  - delete(storageKey: string): Promise<void>                                                  |
+-----------------------------------------------------------------------------------------------+
                                               |
                       +-----------------------+-----------------------+
                       |                                               |
                       v                                               v
+----------------------------------------------+   +--------------------------------------------+
|        LocalFilesystemStorageDriver          |   |            S3MinIOStorageDriver            |
| - Storage Path: /var/ucs-cm/storage/         |   | - Bucket: ucs-cm-documents                 |
| - Key structure: {orgId}/{solId}/{caseId}/...|   | - Endpoint: http://minio.internal:9000     |
+----------------------------------------------+   +--------------------------------------------+
```

---

## 3. Storage Key Generation & Path Obfuscation

To prevent direct URL access or path traversal attacks (Section 12.5), raw filenames are never used on disk. Storage keys are cryptographically generated UUID strings:

```text
Storage Key Format:
{organisationId}/{solutionId}/{caseId}/{documentId}.bin
```

---

## 4. Secure File Upload Pipeline

```text
Browser Client                     Next.js API Handler                     StorageService Driver
  |                                        |                                         |
  |--- 1. POST Multipart File ------------>|                                         |
  |    (File up to 25 MB)                  |--- 2. Stream Ingest                    |
  |                                        |    (Inspect Magic Bytes Header)         |
  |                                        |    - Verify File Signature              |
  |                                        |    - Verify Extension & Allowed MIME    |
  |                                        |                                         |
  |                                        |--- 3. writeStream(storageKey, stream) ->|
  |                                        |                                         |
  |                                        |<-- 4. Stream Storage Complete ----------|
  |                                        |                                         |
  |                                        |--- 5. INSERT INTO document_metadata     |
  |                                        |       (PostgreSQL Record)               |
  |                                        |                                         |
  |<-- 6. HTTP 201 Created (Metadata) -----|                                         |
```

---

## 5. In-App Document Viewer Architecture

Product Lead Decision #6 restricts the Phase 1 Document Viewer to PDF, PNG, JPG, and JPEG files with capabilities limited to: **viewing, zoom, page navigation, fit-to-screen, full-screen expansion, and file download**.

### UI Viewer Layout Model
The viewer renders in a responsive side-by-side workspace next to the Document Grid:

```text
+-----------------------------------------------------------------------------------------------+
| Case Workspace Header: CDD-KYC-000104                                                         |
+---------------------------------------+-------------------------------------------------------+
| Document Grid                         | Document Viewer Component (PDF / Image)               |
| +-----------------------------------+ | [ Zoom In ] [ Zoom Out ] [ Page 1 / 4 ] [ Fullscreen ]|
| | Doc Name | Type | Size | Actions  | | +---------------------------------------------------+ |
| +-----------------------------------+ | |                                                   | |
| | ID_Proof | PDF  | 1.2M | [View]   | | |           PDF / Image Canvas Render               | |
| | Address  | PNG  | 800K | [View]   | | |                 (PDF.js Canvas)                 | |
| +-----------------------------------+ | |                                                   | |
+---------------------------------------+-------------------------------------------------------+
```

---

## 6. Architectural Decisions

### Choice 7.1: StorageService Driver Implementation Scope
* **Decision**: Implement a mandatory `StorageService` interface with a mandatory **Secure Local Filesystem Driver** (`LocalFilesystemStorageDriver`) for Phase 1. Interface compatibility for S3/MinIO (`S3MinIOStorageDriver`) is defined in the architecture, but full driver implementation and testing are treated as stretch scope to avoid delaying the Phase 1 vertical slice.
* **Alternatives Considered**: Direct S3-only storage, DB ByteA blob storage.
* **Rationale**:
  1. Product Lead Decision #5 & Requirement 5 specify that local FS driver is mandatory for Phase 1 Linux deployment.
  2. Local FS requires zero external container runtime dependencies, reducing operational complexity for Phase 1.
  3. S3/MinIO interface compatibility ensures future expansion without risking Phase 1 delivery dates.
* **Phase 1 Impact**: Simplified single-node deployment; storage backend can be toggled via `STORAGE_DRIVER=local` environment variable.
* **Future Implications**: Multi-region enterprise cloud deployments seamlessly switch to S3/MinIO without altering core domain code.
* **Risks**: Local FS storage requires persistent Docker volume mounts and host disk space management.
* **Mitigations**: Strict file permissions (`0700`) on internal storage folders and host disk space monitoring guidelines.
* **Product Approval Required**: Approved (Product Lead Direction #5).
