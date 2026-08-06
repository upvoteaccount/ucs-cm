# 11. Implementation Dependency Map

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Implementation Sequence

This document defines the strict, non-circular implementation order for UCS CM Phase 1 modules. It maps logical module dependencies to ensure development proceeds through clean, testable vertical increments.

---

## 2. Global Module Dependency Graph

```text
Layer 0: Core Foundation
[ Database Schemas & Migrations ] ---> [ Shared Errors & Zod Primitives ] ---> [ StorageService Driver ]
                                                      |
                                                      v
Layer 1: Identity & Multi-Tenancy
                                       [ Auth & Session Module ]
                                                      |
                                                      v
                                      [ Organisation Isolation ]
                                                      |
                                                      v
Layer 2: Design Studio Subsystem
                                       [ Solution Aggregate Foundation ]
                                                      |
                                                      v
                                       [ Solution Data Dictionary & Form Studio ]
                                                      |
                                                      v
                                       [ Roles, Queues & Workflow ]
                                                      |
                                                      v
                                       [ Validation & Publishing ]
                                                      |
                                                      v
Layer 3: Runtime Execution Engine
                                       [ Runtime Case Execution ]
                                                      |
                                                      v
                                       [ Task Locking & Queue Claims ]
                                                      |
                                                      v
                                       [ Workflow FSM State Engine ]
                                                      |
                                                      v
Layer 4: Case Auxiliary Services
                                       [ Document Management & Viewer ]
                                                      |
                                                      v
                                       [ Case Comments & Audit Log ]
                                                      |
                                                      v
Layer 5: Portability & Verification
                                       [ BFSI KYC Exception Reference ]
                                                      |
                                                      v
                                       [ Healthcare Grievance Portability ]
```

---

## 3. Strict Phase-by-Phase Implementation Roadmap

| Sequence | Module / Increment | Prerequisites | Key Target Artifacts | Verification Milestone |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | **Foundation & DB Schema** | Baseline Architecture Review | Drizzle ORM Schema, DB Migration scripts, `.env` config. | Database boots cleanly, migrations execute idempotently. |
| **Step 2** | **Auth, Org & Audit Foundation** | Step 1 | Session Store, Auth Middleware, Org Guards, `AuditRepository` & DB Trigger. | Login/Logout flows, user activation, & initial audit events recorded. |
| **Step 3** | **Design Studio: Solution Data & Form** | Step 2 | Solution CRUD (Solutions Home with portfolio text, loading, empty, and safe error states; Create Solution with Name, Description, auto-suggested uppercase Solution Prefix), Data Dictionary (Base Types, Controls, Choice Lists, Property Identity Contract `<PREFIX>_<LOCAL_SYMBOLIC_NAME>`), Form Layout Studio (Default Tab, Sections, Unique Field References, One-Place Field Inspector with "Applies everywhere" vs "This form only" tiers), Property Deletion & Draft Mutation Guards, Optimistic Revisioning (`expectedRevision` with reload option on 409), Trusted Active Tenant Scoping (404 on foreign lookups), Role-Aware Access Guards. | Solution Designer builds draft solution, data dictionary, and form layout in UI with audit logging and access protection. |
| **Step 4** | **Design Studio: Workflow** | Step 3 | Queue & Role Configurator, Sequential Workflow Designer. | Sequential workflow steps & outcomes configured with audit logging. |
| **Step 5** | **Validation & Publishing** | Step 4 | Publishing Engine, Immutable Snapshot Compiler. | Solution validates, compiles snapshot, and records publish audit event. |
| **Step 6** | **Runtime: Case Creation** | Step 5 | Dynamic Form Generator, Case Number Sequence Generator. | Runtime user submits case against published snapshot; case creation audited. |
| **Step 7** | **Runtime: Queue & Task** | Step 6 | Task Claiming Engine, Row Locks (`FOR UPDATE`), Task Workspace. | Users claim/lock tasks from queue without conflict; claims audited. |
| **Step 8** | **Runtime: Workflow FSM** | Step 7 | `WorkflowFSMEngine`, Task Completion Handler. | Task completion advances workflow step & updates case state with audit. |
| **Step 9** | **Documents & Viewer** | Step 8 | `StorageService` Drivers, PDF/Image Viewer Canvas. | Upload, side-by-side preview, & file download work with audit records. |
| **Step 10**| **Audit UI & SLA Dashboards**| Step 9 | Consolidated Case Audit Timeline, Platform Audit Console UI, Calculated SLAs. | Complete audit history timeline renders; SLA dashboard flags work. |
| **Step 11**| **BFSI Verification** | Step 10 | Synthetic KYC Exception Seed Data Script. | Complete end-to-end BFSI business process succeeds. |
| **Step 12**| **Healthcare Verification** | Step 11 | Synthetic Healthcare Grievance Configuration Script. | Portability proven without modifying single line of code. |

---

## 4. Implementation Boundary Safeguards

1. **No Out-of-Sequence Development**: Developers must complete and verify Layer 2 (Publishing Engine) before attempting Layer 3 (Runtime Case Execution).
2. **Automated Gate Enforcement**: Each step must pass automated unit/integration tests before the project advances to the subsequent layer.
