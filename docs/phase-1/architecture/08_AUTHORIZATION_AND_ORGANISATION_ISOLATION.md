# 08. Authorization and Organisation Isolation

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Security Boundaries

This document defines the multi-tenant organisation isolation model, Role-Based Access Control (RBAC), and queue permission enforcement for UCS CM Phase 1.

### Mandatory Isolation Principle
**Every tenant-owned configuration, runtime, security, document and audit record must be directly organisation-scoped or inherit an enforceable organisation boundary through a mandatory parent relationship.**

---

## 2. Multi-Tenant Organisation Boundary Model

Even though Phase 1 operates with a single organisation during demonstration, every record in the system MUST be directly organisation-scoped (`organisation_id`) or inherit an enforceable organisation boundary through its parent relationship (e.g. `tasks` via `case.organisation_id` and explicit `organisation_id` on the task record).

```text
                               +---------------------------------------+
                               |     Authenticated Session User        |
                               | (user_id: U1, organisation_id: Org_A) |
                               +---------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
| Central API Middleware: Organisation Isolation Guard                                              |
|                                                                                                   |
|  - Intercepts incoming API request                                                                |
|  - Compares session.organisation_id against target record.organisation_id                         |
|  - Appends `WHERE organisation_id = session.organisation_id` to ALL DB queries                   |
+---------------------------------------------------------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v                                                     v
         [ Match: Request Proceeds ]                           [ Mismatch: HTTP 403 Forbidden ]
         (Access granted within tenant)                        (Logged as AUDIT_ACCESS_DENIED)
```

---

## 3. Two-Tier Role Architecture

Platform Roles and Solution Roles are strictly separated concepts (Section 10.5, Section 17):

```text
                                    +-----------------------------------+
                                    |         User Account              |
                                    +-----------------------------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                                                     |
                   v                                                                     v
+------------------------------------+                                 +------------------------------------+
|       Platform Roles               |                                 |        Solution Roles              |
|  (System-Wide Scope)               |                                 |   (Solution-Specific Scope)        |
+------------------------------------+                                 +------------------------------------+
| - PLATFORM_ADMIN                   |                                 | - COMPLIANCE_OFFICER               |
| - SOLUTION_DESIGNER                |                                 | - CASE_WORKER                      |
| - RUNTIME_USER                     |                                 | - SUPERVISOR                       |
+------------------------------------+                                 +------------------------------------+
| Controls access to:                |                                 | Controls access to:                |
| - Admin Console (/admin)           |                                 | - Solution Work Queues             |
| - Design Studio (/studio)          |                                 | - Task Claiming & Execution        |
| - Runtime Portal (/portal)         |                                 | - Specific Form Field Editability  |
+------------------------------------+                                 +------------------------------------+
```

---

## 4. Work Queue Authorization Flow

```text
                               +---------------------------------------+
                               |       Runtime User Claims Task        |
                               |  (userId: U1, targetTaskId: T1)       |
                               +---------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
| Task Execution Guard (Backend Enforcer)                                                           |
|                                                                                                   |
|  1. Fetch Task T1 -> Queue Key (e.g. "INITIAL_REVIEW_Q")                                          |
|  2. Fetch Published Solution Version Snapshot                                                     |
|  3. Lookup Queue "INITIAL_REVIEW_Q" -> allowedRoles (e.g. ["COMPLIANCE_OFFICER"])                 |
|  4. Fetch User U1's assigned Solution Roles for this Solution                                     |
|  5. Evaluate: Does User U1 have at least one allowed Role?                                        |
+---------------------------------------------------------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v                                                     v
                   [ YES ]                                                 [ NO ]
      Proceed with Task Claiming Transaction                  Return HTTP 403 Access Denied
```

---

## 5. Architectural Decisions

### Choice 8.1: Strict Backend RBAC Guards vs. Frontend Disablement
* **Decision**: All authorization rules (Organisation isolation, Platform Roles, Solution Roles, Queue Access, Step-level field editability) are validated strictly in Node.js backend handlers. Frontend disablement is treated purely as UX guidance (Section 11.5, Section 24).
* **Alternatives Considered**: Frontend-only route guards.
* **Rationale**:
  1. Frontend disablement can be easily bypassed via browser developer tools or cURL requests.
  2. Enforces the approved backend authorisation controls (Section 23).
* **Phase 1 Impact**: Substantially reduces vulnerability to backend API tampering by preventing client-side UI overrides from bypassing authorization rules.
* **Future Implications**: Easy addition of granular custom security attributes in future phases.
* **Risks**: Developers might forget to attach backend authorization wrappers to new API endpoints.
* **Mitigations**: Enforce a mandatory higher-order helper (`withAuthGuard(handler)`) for every API route handler.
* **Product Approval Required**: Approved (Baseline Security Requirement).
