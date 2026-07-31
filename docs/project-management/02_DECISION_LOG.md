# Architecture & Product Decision Log

| Decision ID | Summary | Rationale | Impact / Scope | Date |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Forward-Only Migration Strategy | Retain committed `0000_init.sql` and `0001_puzzling_turbo.sql` to avoid rewriting Git migration history. | Database schema evolution | 2026-07-31 |
| **ADR-002** | PostgreSQL Append-Only Audit Trigger | Native PL/pgSQL trigger prevents application-level `UPDATE` and `DELETE` queries on `audit_events`. | Audit compliance & immutability | 2026-07-31 |
| **ADR-003** | 30-Minute Sliding Session Window | Balance session security with write-throttled database activity updates (>60s threshold). | Auth & Session lifecycle | 2026-07-31 |
| **ADR-004** | Production Host Port Isolation | Production PostgreSQL container exposes zero host ports, accessible exclusively via internal bridge network. | Production Network Security | 2026-07-31 |
| **ADR-005** | Ten Mandatory Property Types | Fixed property type subset for Phase 1. Grid/Repeating Table classified as stretch scope. | Design Studio metadata model | 2026-07-31 |
| **ADR-006** | Temporal Deferral & Boundary Preservation | Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved. | Workflow Architecture | 2026-07-31 |
