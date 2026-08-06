# UCS CM Phase 1 Delivery Tracker

| Increment | Title | Status | Target Scope | Approved Commit |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | Project Foundation | **Approved and Committed** | Next.js App Router, Docker, Drizzle, PostgreSQL baseline | `e164040e76b50baa8ca3ba339f478f203b9cba9a` |
| **INC-02** | Authentication, Organisations and Audit Foundation | **Approved and Committed** | Identity, org isolation, RBAC, canonical GET/POST/DELETE session management & remediation, append-only audit | Baseline: `150a0c672bc26cad12e825d5e90c481df6371024`<br>Remediation: `9eb5168115ae7fa99c5f7e2656355d7b0f012ff1` |
| **INC-02.5** | Shared UI Foundation and Authentication Experience | **Approved and Committed** | Minimum shared visual primitives, static login states, authenticated shell foundation, global authentication/error states, integration with committed POST, GET and DELETE session API contract, static Product Lead acceptance before integration | Baseline: `6ea63cdfe0f6e6ff70ffef419ee852ef72a8c3d9`<br>Defect Fix: `4d2efebc52119ebcf6b1b702ecae25fe5b2b2a6a` |
| **INC-03** | Solution, Case Type, Properties and Form Configuration | **Not Started, Restart Planned** | Metadata schemas, 10 property types, form configuration, Design Studio UI (Abandoned implementation preserved on branch `backup/inc-03-abandoned-implementation` at commit `6d854824e4d5fbac3a55f69c9b1fdbceaa4b47eb`) | - |
| **INC-04** | Roles, Queues and Workflow Configuration | **Not Started, Not Yet Authorised** | Solution role assignment, state machine FSM, transition rules, queues | - |
| **INC-05** | Validation, Publishing and Immutable Snapshots | **Not Started, Not Yet Authorised** | Immutable versioned snapshots, release management | - |
| **INC-06** | Runtime Case Creation and Generated Forms | **Not Started, Not Yet Authorised** | Case creation, generated forms, audit trail | - |
| **INC-07** | Task Queues, Claiming, Locking and My Work | **Not Started, Not Yet Authorised** | Task queues, user claiming, optimistic locking, worker queues | - |
| **INC-08** | Workflow Progression, Send Back, Approve and Reject | **Not Started, Not Yet Authorised** | FSM execution, transition outcomes, send back, approvals | - |
| **INC-09** | Documents, Storage, Grid and Viewer | **Not Started, Not Yet Authorised** | Document management, storage driver, lineage, grid stretch scope | - |
| **INC-10** | Search, Audit UI, Comments and SLA Dashboard | **Not Started, Not Yet Authorised** | Search indexing, audit trail viewer, comments, SLA tracking | - |
| **INC-11** | BFSI End-to-End Stabilisation | **Not Started, Not Yet Authorised** | BFSI KYC reference solution end-to-end verification | - |
| **INC-12** | Healthcare Portability and Final Hardening | **Not Started, Not Yet Authorised** | Healthcare reference solution portability validation and final hardening | - |

## INC-02.5 Completed Execution Checkpoints
The execution of INC-02.5 was strictly governed by sequential acceptance gates:
- **B1**: Minimum login primitives (`Button`, `Input`, `PasswordInput`, `FormField`, `Alert`, `SkipLink`) - `69b833c5179f63839ffd7b6fb5bc99508fde9a23`
- **B2**: Static login screen (fixture states) - `8016a2b03cf1f15d39f9f89a84cbbb9e461a4676`
- **D1**: **Login Acceptance Gate** (Approved by Product Lead)
- **C1**: Minimum shell primitives (`AppShell`, `Header`, `UserContext`, `OrganisationContext`, `RoleContext`, `Badge`, `UserMenu`, `NavigationContainer`) - `f80404d36a0a1f76985db1a51c64945c66bf4cb5`
- **C2**: Static shell and global screens (`/landing`, `/forbidden`, `/not-found`, `/error`, `/loading`) - `8edab18f6735e5ef00a0efb41217e9fe580d1921`
- **D2**: **Shell & Global States Acceptance Gate** (Approved by Product Lead)
- **E**: Authentication API contract integration (`POST`, `GET`, `DELETE` `/api/auth/session`, Server Component route protection, ID-free presentation DTOs, positive role allow-list) - `6ea63cdfe0f6e6ff70ffef419ee852ef72a8c3d9`
- **Defect Fix**: Production landing page identity cleanup - `4d2efebc52119ebcf6b1b702ecae25fe5b2b2a6a`
- **F**: Final verification, showcase audit, and baseline commit review (99/99 tests passing across 11 files; generic redirect on expiry approved; differentiated expiry notice deferred)

## Architectural & Product Control Baselines
* Product and architecture baselines are approved for Phase 1. UX and UI foundation documents may be refined through controlled change before UI implementation.
* **Migration Rule**: Forward-only migrations strictly preserving `0000_init.sql` and `0001_puzzling_turbo.sql`.
* **Workflow Boundary**: Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved.
* **Grid / Repeating Table**: Stretch scope excluded from mandatory Phase 1 deliverables.
