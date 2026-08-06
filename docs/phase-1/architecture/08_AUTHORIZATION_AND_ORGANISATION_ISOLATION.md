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

### Trusted Active-Organisation Isolation Rules
1. **Authoritative Session Context**: The user's active `organisation_id` is extracted strictly from their authenticated session. Request-body or client-supplied organisation IDs are NEVER trusted as authority.
2. **Direct SQL Query Scoping**: All database queries must embed `WHERE organisation_id = session.organisation_id` directly in initial SQL query criteria. Global entity lookups followed by post-query tenant checks are strictly prohibited.
3. **Non-Disclosure Security**: Requests targeting non-existent or foreign-tenant resources return HTTP 404 Not Found without disclosing foreign record existence. Explicit unauthorized action attempts within the tenant return HTTP 403 Forbidden and log `AUDIT_ACCESS_DENIED`.

```text
                               +---------------------------------------+
                               |     Authenticated Session User        |
                               | (user_id: U1, organisation_id: Org_A) |
                               +---------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
| Central API Middleware & Tenant Repository: Organisation Isolation Guard                          |
|                                                                                                   |
|  - Reads trusted session.organisation_id                                                          |
|  - Ignores client request-body organisation_id                                                    |
|  - Embeds `WHERE organisation_id = session.organisation_id` into initial database query           |
+---------------------------------------------------------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v                                                     v
         [ Match: Request Proceeds ]                           [ Missing/Mismatch: HTTP 404 Not Found ]
         (Access granted within tenant)                        (Foreign existence shielded)
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
| - Design Studio (/studio/solutions)|                                 | - Task Claiming & Execution        |
|   (Requires PLATFORM_ADMIN or      |                                 | - Specific Form Field Editability  |
|    SOLUTION_DESIGNER role;         |                                 |                                    |
|    runtime-only user denied with   |                                 |                                    |
|    approved forbidden experience   |                                 |                                    |
|    `/forbidden`)                   |                                 |                                    |
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
