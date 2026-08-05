# UCS CM Phase 1 Delivery Tracker

| Increment | Title | Status | Target Scope | Approved Commit |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | Project Foundation | **Approved and Committed** | Next.js App Router, Docker, Drizzle, PostgreSQL baseline | `e164040e76b50baa8ca3ba339f478f203b9cba9a` |
| **INC-02** | Authentication, Organisations and Audit Foundation | **Approved and Committed** | Identity, org isolation, RBAC, canonical GET/POST/DELETE session management & remediation, append-only audit | `150a0c672bc26cad12e825d5e90c481df6371024` |
| **INC-03** | Solution, Case Type, Properties and Form Configuration | **In Progress** | Metadata schemas, 10 property types, form configuration, Design Studio UI | *In Progress* |
| **INC-04** | Roles, Queues and Workflow Configuration | **Not Started, Not Yet Authorised** | Solution role assignment, state machine FSM, transition rules, queues | - |
| **INC-05** | Validation, Publishing and Immutable Snapshots | **Not Started, Not Yet Authorised** | Immutable versioned snapshots, release management | - |
| **INC-06** | Runtime Case Creation and Generated Forms | **Not Started, Not Yet Authorised** | Case creation, generated forms, audit trail | - |
| **INC-07** | Task Queues, Claiming, Locking and My Work | **Not Started, Not Yet Authorised** | Task queues, user claiming, optimistic locking, worker queues | - |
| **INC-08** | Workflow Progression, Send Back, Approve and Reject | **Not Started, Not Yet Authorised** | FSM execution, transition outcomes, send back, approvals | - |
| **INC-09** | Documents, Storage, Grid and Viewer | **Not Started, Not Yet Authorised** | Document management, storage driver, lineage, grid stretch scope | - |
| **INC-10** | Search, Audit UI, Comments and SLA Dashboard | **Not Started, Not Yet Authorised** | Search indexing, audit trail viewer, comments, SLA tracking | - |
| **INC-11** | BFSI End-to-End Stabilisation | **Not Started, Not Yet Authorised** | BFSI KYC reference solution end-to-end verification | - |
| **INC-12** | Healthcare Portability and Final Hardening | **Not Started, Not Yet Authorised** | Healthcare reference solution portability validation and final hardening | - |

## Architectural & Product Control Baselines
* **Product & Architecture Documentation**: Frozen and approved for Phase 1 implementation.
* **Migration Rule**: Forward-only migrations strictly preserving `0000_init.sql` and `0001_puzzling_turbo.sql`.
* **Workflow Boundary**: Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved.
* **Grid / Repeating Table**: Stretch scope excluded from mandatory Phase 1 deliverables.
