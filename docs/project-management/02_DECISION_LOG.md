# Architecture & Product Decision Log

| Decision ID | Summary | Rationale | Impact / Scope | Date |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Forward-Only Migration Strategy | Retain committed `0000_init.sql` and `0001_puzzling_turbo.sql` to avoid rewriting Git migration history. | Database schema evolution | 2026-07-31 |
| **ADR-002** | PostgreSQL Append-Only Audit Trigger | Native PL/pgSQL trigger prevents application-level `UPDATE` and `DELETE` queries on `audit_events`. | Audit compliance & immutability | 2026-07-31 |
| **ADR-003** | 30-Minute Sliding Session Window | Balance session security with write-throttled database activity updates (>60s threshold). | Auth & Session lifecycle | 2026-07-31 |
| **ADR-004** | Production Host Port Isolation | Production PostgreSQL container exposes zero host ports, accessible exclusively via internal bridge network. | Production Network Security | 2026-07-31 |
| **ADR-005** | Ten Mandatory Property Types | Fixed property type subset for Phase 1. Grid/Repeating Table classified as stretch scope. | Design Studio metadata model | 2026-07-31 |
| **ADR-006** | Temporal Deferral & Boundary Preservation | Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved. | Workflow Architecture | 2026-07-31 |
| **ADR-007** | Solution Direct Ownership & Elimination of Case Type Layer in Phase 1 | Solution entity directly owns Data Dictionary properties, Choice Lists, and Form layout; Case Type layer eliminated for Phase 1. | Design Studio aggregate model | 2026-08-06 |
| **ADR-008** | Separation of Core Stored Data Types from Form Controls & Solution Choice Lists | Core stored types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`) separated from form UI controls; Email/Phone format presets; solution-owned reusable Choice Lists. | Solution Data Dictionary | 2026-08-06 |
| **ADR-009** | Deferral of Publishing Engine & Active Studio Areas | Solution publishing engine deferred to later authorised publishing increment; INC-03 Studio navigation active for Overview, Data, and Form areas only. | Design Studio scope | 2026-08-06 |
| **ADR-010** | Role-Aware Studio Access Guard & Neutral Landing Navigation | Access to `/studio/solutions` restricted to `PLATFORM_ADMIN` and `SOLUTION_DESIGNER`; direct access by runtime-only users results in server-side denial with existing approved forbidden experience (`/forbidden`); post-login `/landing` evaluates roles, leaving runtime-only users on neutral destination `/landing`. | Studio security & navigation | 2026-08-06 |
