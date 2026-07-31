# Requirement Traceability Matrix (RTM)

| Requirement ID | Category | Summary | Mapped Architecture / Component | Verification / Test Reference | Mapped Increment | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-FOUND-01** | Foundation | Next.js Standalone Monolith | `next.config.mjs`, Dockerfile | Container runtime build | INC-01 | Verified |
| **REQ-AUTH-01** | Security | Database Sessions & Sliding Window | `src/modules/auth/auth.service.ts` | `auth.test.ts` | INC-02 | Verified |
| **REQ-AUTH-02** | Security | HTTP-Only SameSite Cookie Management | `src/app/api/auth/session/route.ts` | `logout.test.ts` | INC-02 | Verified |
| **REQ-ORG-01** | Isolation | Multi-Tenant Organisation Scoping | `src/shared/tenant-repository.ts` | `auth.test.ts` | INC-02 | Verified |
| **REQ-AUDIT-01** | Compliance | Append-Only Database Audit Trigger | `drizzle/0001_puzzling_turbo.sql` | `auth.test.ts` | INC-02 | Verified |
| **REQ-META-01** | Metadata | Solution, Case Type, 10 Property Types & Forms | `src/modules/solution/` | INC-03 Test Suite | INC-03 | In Progress |
| **REQ-WORKFLOW-01**| Workflow | Solution Roles, Queues & FSM Transition Rules | `src/modules/workflow/` | INC-04 Test Suite | INC-04 | Not Started |
| **REQ-PUB-01** | Publishing | Validation Rules, Release Publishing & Snapshots | `src/modules/publishing/` | INC-05 Test Suite | INC-05 | Not Started |
| **REQ-RUNTIME-01** | Runtime | Runtime Case Creation & Dynamic Forms | `src/modules/case/` | INC-06 Test Suite | INC-06 | Not Started |
| **REQ-TASK-01** | Tasks | Task Queues, Claiming, Locking & My Work | `src/modules/task/` | INC-07 Test Suite | INC-07 | Not Started |
| **REQ-EXEC-01** | Workflow | FSM Progression, Send-Back, Approve & Reject | `src/modules/workflow/` | INC-08 Test Suite | INC-08 | Not Started |
| **REQ-DOC-01** | Documents | Storage Driver, Document Lineage & Grid Scope | `src/modules/document/` | INC-09 Test Suite | INC-09 | Not Started |
| **REQ-SEARCH-01** | Ops | Search Indexing, Audit UI, Comments & SLA | `src/modules/ops/` | INC-10 Test Suite | INC-10 | Not Started |
| **REQ-BFSI-01** | Solution | BFSI KYC Reference Solution Verification | `docs/phase-1/01_BFSI...` | INC-11 Test Suite | INC-11 | Not Started |
| **REQ-HEALTH-01** | Solution | Healthcare Portability & Final Hardening | `src/modules/` | INC-12 Test Suite | INC-12 | Not Started |
