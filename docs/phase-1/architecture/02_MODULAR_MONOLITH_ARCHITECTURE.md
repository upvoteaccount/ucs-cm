# 02. Modular Monolith Architecture

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Core Architectural Principles

This document specifies the internal module decomposition for UCS CM Phase 1. The system is designed as a **Modular Monolith** in TypeScript/Next.js (Node standalone mode).

### Key Architectural Rules
1. **Strict Logical Isolation**: Modules must communicate via explicit internal service interfaces (`src/modules/<module-name>/service.ts`). Direct cross-module database access is prohibited.
2. **Industry Neutrality**: Generic modules (`cases`, `workflows`, `forms`) must remain completely free of domain-specific (BFSI/Healthcare) code or hardcoded schemas.
3. **No Circular Dependencies**: Dependencies flow strictly downward from API/UI layers into Domain Service modules, which in turn access Infrastructure abstractions.

---

## 2. Directory Layout & Module Structure

```text
src/
├── app/                        # Next.js App Router (UI Pages & API Route Handlers)
│   ├── (admin)/                # Administration Console routes
│   ├── (studio)/               # Design Studio routes
│   ├── (portal)/               # Runtime Portal routes
│   └── api/                    # System API Endpoints
├── modules/                    # Core Modular Monolith Domain Logic
│   ├── auth/                   # Authentication & Session Management
│   ├── organisation/           # Organisation Boundaries & Multi-tenancy Isolation
│   ├── solution/               # Design Studio Solutions & Versioning
│   ├── schema/                 # Configurable Properties & Form Schemas
│   ├── publishing/             # Solution Validation & Immutability Publishing
│   ├── workflow/               # FSM Engine, Workflow Steps, Queue Definitions
│   ├── case/                   # Runtime Case Instance Management & Execution
│   ├── task/                   # Queue-based Task Claiming, Locking & Execution
│   ├── document/               # Metadata, StorageService Driver, Document Viewer
│   ├── comment/                # Case/Task Comments & Audit Links
│   ├── audit/                  # Append-Only Case & Platform Audit Logger
│   └── dashboard/              # Calculated Metrics (My Work, Due Soon, Overdue)
├── shared/                     # Cross-Cutting Core Utilities
│   ├── errors/                 # Standard Application Errors
│   ├── validation/             # Zod Primitive Validators
│   └── rbac/                   # Permission Enforcers & Guards
└── infrastructure/             # External Drivers & Database Access
    ├── db/                     # Prisma/Drizzle ORM Client & Schema Definitions
    └── storage/                # StorageService Drivers (Local FS & S3/MinIO)
```

---

## 3. Detailed Module Boundaries

```text
+-------------------------------------------------------------------------------------------------------+
|                                        PRESENTATION LAYER (Next.js)                                   |
|   +--------------------------+   +-------------------------------+   +-----------------------------+  |
|   | Design Studio (/studio)  |   |  Runtime Portal (/portal)     |   | Admin Console (/admin)      |  |
|   +--------------------------+   +-------------------------------+   +-----------------------------+  |
+------------------------------------------------|------------------------------------------------------+
                                                 |
+------------------------------------------------v------------------------------------------------------+
|                                    DOMAIN MODULES LAYER (src/modules)                                 |
|                                                                                                       |
|  +------------------------+   +------------------------+   +------------------------------------+     |
|  |    Solution Module     |-->|    Schema Module       |-->|    Publishing Module               |     |
|  |  (Drafts & Solutions)  |   | (Properties & Forms)   |   | (Validation & Immutable Snapshots) |     |
|  +------------------------+   +------------------------+   +------------------------------------+     |
|                                                                              |                        |
|                                                                              v                        |
|  +------------------------+   +------------------------+   +------------------------------------+     |
|  |     Workflow Module    |   |      Case Module       |<--|    Runtime Case Instances          |     |
|  |  (FSM Engine & Queues) |   | (State & Properties)   |   |    & Version Snapshots             |     |
|  +------------------------+   +------------------------+   +------------------------------------+     |
|              ^                            ^                                  |                        |
|              |                            |                                  v                        |
|  +------------------------+               |                +------------------------------------+     |
|  |      Task Module       |---------------+----------------|          Document Module           |     |
|  | (Queue Locks & Claims) |                                |  (Metadata & Storage Abstraction)  |     |
|  +------------------------+                                +------------------------------------+     |
|              |                                                               |                        |
|              +------------------------------+--------------------------------+                        |
|                                             v                                                         |
|                               +---------------------------+                                           |
|                               |       Audit Module        |                                           |
|                               |   (Append-Only Loggers)   |                                           |
|                               +---------------------------+                                           |
+---------------------------------------------|---------------------------------------------------------+
                                              v
+-------------------------------------------------------------------------------------------------------+
|                                    INFRASTRUCTURE LAYER (src/infrastructure)                          |
|         +------------------------------------+         +------------------------------------+         |
|         | PostgreSQL DB (Prisma / Drizzle)   |         | StorageService (Local FS / MinIO)  |         |
|         +------------------------------------+         +------------------------------------+         |
+-------------------------------------------------------------------------------------------------------+
```

---

## 4. Cross-Module Communication Protocols

1. **In-Memory Service Calls**: Modules interact strictly via exported service methods (e.g., `CaseService.createCase()`). Direct database querying across module boundaries is rejected during code review.
2. **Transactional Event Dispatching (Synchronous)**: When a state-changing business action occurs (e.g., Task Completion), the `TaskModule` executes its logic, invokes `WorkflowFSMModule.transition()`, and calls `AuditModule.logCaseEvent()` within the **same PostgreSQL database transaction**.
3. **No Background Event Bus in Phase 1**: Decoupled asynchronous event buses (RabbitMQ, Kafka, Redis Pub/Sub) are excluded. All Phase 1 side effects occur synchronously inside transactional DB units.

---

## 5. Architectural Decisions

### Choice 2.1: Next.js Standalone Node Server as Modular Monolith Container
* **Decision**: Host the modular monolith inside Next.js configured in `output: 'standalone'` mode.
* **Alternatives Considered**: 
  1. Separate Nest.js backend API server and Next.js frontend application.
  2. Microservices divided by domain module.
* **Rationale**: Eliminates deployment complexity and CORS management while preserving strict module directory boundaries (`src/modules/*`).
* **Phase 1 Impact**: Fast development velocity, single build artifact, single container deployment.
* **Future Implications**: Any module inside `src/modules/*` can be extracted into an independent microservice in Phase 2 with zero changes to domain core logic.
* **Risks**: Developers may accidentally import backend modules into frontend client components.
* **Mitigations**: Enforce ESLint rules (`import/no-restricted-paths`) restricting imports from `src/modules/*` into client components.
* **Product Approval Required**: Approved (Decision Point #4).
