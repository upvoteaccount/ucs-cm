# 01. System Context and Boundaries

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Scope

This document defines the system context, external boundaries, operational actors, and explicit system interfaces for Phase 1 of UCS CM. It establishes clear architectural boundaries to prevent unauthorized scope drift while ensuring a portable, industry-neutral foundation.

---

## 2. High-Level System Context (C4 Level 1)

UCS CM operates as a self-contained, document-centric case management application. In Phase 1, all user interactions occur via web browsers. There are no external third-party integrations (e.g., enterprise SSO, external portals, or external OCR engines).

```text
                               +----------------------------------+
                               |         User Web Browser         |
                               +----------------------------------+
                                                |
                                                | HTTP/HTTPS (TLS)
                                                v
+---------------------------------------------------------------------------------------------------+
| UCS CM Phase 1 System Boundary                                                                    |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Modern Modular Monolith Application (Next.js Standalone Node Server)                          |  |
|  |                                                                                             |  |
|  |  +---------------------------+  +---------------------------+  +-------------------------+  |  |
|  |  |   Design Studio (UI/API)  |  |   Runtime Portal (UI/API) |  |   Admin Console (UI/API)|  |  |
|  |  +---------------------------+  +---------------------------+  +-------------------------+  |  |
|  |                |                              |                             |               |  |
|  |                +------------------------------+-----------------------------+               |  |
|  |                                               |                                             |  |
|  |                                               v                                             |  |
|  |  +---------------------------------------------------------------------------------------+  |  |
|  |  |                              Application Core Business Logic                          |  |  |
|  |  +---------------------------------------------------------------------------------------+  |  |
|  +-----------------------------------------------|---------------------------------------------+  |
|                                                  |                                                |
|                        +-------------------------+-------------------------+                      |
|                        |                                                   |                      |
|                        v                                                   v                      |
|       +---------------------------------+                 +----------------------------------+    |
|       |   PostgreSQL 16 Database        |                 |   StorageService Abstraction     |    |
|       |                                 |                 |   (Local FS / S3-MinIO Driver)   |    |
|       |  - Relational System Data       |                 +----------------------------------+    |
|       |  - Immutable Version Schemas    |                                                         |
|       |  - Queue/FSM Workflow Locks     |                                                         |
|       |  - Append-Only Audit Trail      |                                                         |
|       +---------------------------------+                                                         |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Operational Actors

| Actor | Description | Primary Access Interface | Phase 1 Boundaries |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | Manages organisations, users, platform roles, system settings, and inspects operational logs. | Admin Console (`/admin/*`) | Multi-tenant isolation enforced. Cannot alter business data silently. |
| **Solution Designer** | Builds, configures, validates, and publishes solutions, case types, forms, workflows, and queues. | Design Studio (`/studio/*`) | Design Studio access does NOT automatically grant runtime case access. |
| **Runtime User** | Creates cases, claims tasks from queues, updates properties, uploads/views documents, and completes work. | Runtime Portal (`/portal/*`) | Scope restricted strictly by Solution Role and Queue membership. |
| **Supervisor** | Monitors queue performance, releases locked tasks, reassigns work, and reviews case audit histories. | Runtime Portal (`/portal/*`) | Cannot bypass workflow state rules; task reassignment strictly audited. |
| **External User** | Public end-users submitting cases externally. | *Out of Scope for Phase 1* | Explicitly excluded in Phase 1 (Section 5.5). |

---

## 4. Architectural Boundaries & System Inputs/Outputs

### 4.1 System Ingress
* **Web Browser Requests**: Standard HTTP/HTTPS traffic. All API requests pass through centralized authentication and authorization middleware.
* **Document Uploads**: Multipart requests accepting binary files up to 25 MB (PDF, PNG, JPG, JPEG, DOCX, XLSX, TXT).

### 4.2 System Egress
* **HTML/JS/CSS Bundles**: React server and client components rendered by Next.js.
* **JSON APIs**: RESTful JSON responses for dynamic data fetching, form schema rendering, and task state updates.
* **Binary Streams**: Authenticated document streaming for PDF/image previews and file downloads.

### 4.3 External Integration Boundary (Phase 1 Enclosure)
* **Zero External Network Calls**: Phase 1 is fully self-contained. No external REST/gRPC calls, no external notification webhooks, no external Auth0/IdP calls.
* **Database & File Storage Isolation**: All state resides within PostgreSQL 16 and the configured local/object file storage driver.

---

## 5. Architectural Choices & Trade-offs

### Choice 1.1: Self-Contained Monolithic Ingress Boundary
* **Decision**: All application traffic routes through a single Next.js standalone Node server ingress point.
* **Alternatives Considered**: 
  1. API Gateway (e.g., Kong, Nginx reverse proxy) in front of separate frontend and backend servers.
* **Rationale**: Introduces zero unnecessary operational overhead for Phase 1 while maintaining clean internal module separation.
* **Phase 1 Impact**: Simplified local development and single-container deployment.
* **Future Implications**: Can easily place Nginx or an API gateway in front when scaling horizontally or separating microservices in future phases.
* **Risks**: High request volume on file downloads could contend with web application rendering if improperly buffered.
* **Mitigations**: Document requests will stream directly from storage drivers using Node streams rather than loading full buffers into Node memory.
* **Product Approval Required**: None (matches accepted product baseline).
