# UCS CM Phase 1 Delivery Tracker

| Increment | Title | Status | Target Scope | Approved Commit |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | Project Foundation | **Approved and Committed** | Next.js App Router, Docker, Drizzle, PostgreSQL baseline | `e164040e76b50baa8ca3ba339f478f203b9cba9a` |
| **INC-02** | Authentication, Organisations and Audit Foundation | **Approved and Committed** | Identity, org isolation, RBAC, canonical GET/POST/DELETE session management & remediation, append-only audit | Baseline: `150a0c672bc26cad12e825d5e90c481df6371024`<br>Remediation: `9eb5168115ae7fa99c5f7e2656355d7b0f012ff1` |
| **INC-02.5** | Shared UI Foundation and Authentication Experience | **Planned, Not Yet Implemented** | Minimum shared visual primitives, static login states, authenticated shell foundation, global authentication/error states, integration with committed POST, GET and DELETE session API contract, static Product Lead acceptance before integration | - |
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

## INC-02.5 Planned Execution Checkpoints
The execution of INC-02.5 is strictly governed by sequential acceptance gates:
- **B1**: Minimum login primitives (`Button`, `Input`, `PasswordInput`, `FormField`, `Alert`, `SkipLink`, etc.)
- **B2**: Static login screen (fixture states: default, filled, validation error, invalid credentials, pending, network failure, session expired notice)
- **D1**: **Login Acceptance Gate** (STOP & WAIT for Product Lead approval of static login experience)
- **C1**: Minimum shell primitives (`AppShell`, `Header`, `UserContext`, `OrganisationContext`, `RoleContext`, `Badge`, `UserMenu`, `Navigation Container`)
- **C2**: Static shell and global screens (fixture data: authenticated landing, 403 forbidden, 404 not found, 500 error, session resolution loader, logout pending state)
- **D2**: **Shell & Global States Acceptance Gate** (STOP & WAIT for Product Lead approval of static shell experience)
- **E**: Authentication API contract integration (`POST`, `GET`, `DELETE` `/api/auth/session`, route guards, redirects)
- **F**: Final verification, showcase removal, and commit review

## Architectural & Product Control Baselines
* Product and architecture baselines are approved for Phase 1. UX and UI foundation documents may be refined through controlled change before UI implementation.
* **Migration Rule**: Forward-only migrations strictly preserving `0000_init.sql` and `0001_puzzling_turbo.sql`.
* **Workflow Boundary**: Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved.
* **Grid / Repeating Table**: Stretch scope excluded from mandatory Phase 1 deliverables.
