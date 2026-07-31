# UCS CM Phase 1 Delivery Tracker

| Increment | Title | Status | Target Scope | Approved Commit |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | Project Foundation | **Approved & Committed** | Next.js App Router, Docker, Drizzle, PostgreSQL baseline | `e164040e76b50baa8ca3ba339f478f203b9cba9a` |
| **INC-02** | Auth, Org & Audit Foundation | **Approved & Committed** | Identity, org isolation, RBAC, session management, append-only audit | `150a0c672bc26cad12e825d5e90c481df6371024` |
| **INC-03** | Solution, Case Type, Properties & Form Config | **In Progress** | Metadata schemas, 10 property types, form configuration, Design Studio UI | *In Progress* |
| **INC-04** | Solution Roles & Workflow FSM | **Authorised, Not Started** | Solution role assignment, state machine FSM, transition rules, queues | - |
| **INC-05** | Immutable Publishing & Snapshot Model | **Authorised, Not Started** | Immutable versioned snapshots, release management | - |
| **INC-06** | Runtime Case Lifecycle | **Authorised, Not Started** | Case creation, state transitions, audit trail, runtime UI | - |
| **INC-07** | Document Management | **Authorised, Not Started** | Storage driver, lineage tracking, document uploads | - |
| **INC-08** | End-to-End Verification & Launch | **Authorised, Not Started** | BFSI KYC reference solution, test matrix, release checklist | - |

## Architectural & Product Control Baselines
* **Product & Architecture Documentation**: Frozen and approved for Phase 1 implementation.
* **Migration Rule**: Forward-only migrations strictly preserving `0000_init.sql` and `0001_puzzling_turbo.sql`.
* **Workflow Boundary**: `IWorkflowService` interface temporally deferred to maintain clean decoupling.
* **Grid / Repeating Table**: Stretch scope excluded from mandatory Phase 1 deliverables.
