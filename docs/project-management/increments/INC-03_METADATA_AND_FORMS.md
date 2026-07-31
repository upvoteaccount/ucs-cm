# Increment 3: Solution, Case Type, Properties and Form Configuration

* **Status**: In Progress
* **Starting Commit Hash**: `980d465a94808e0c95712c090407eb51005bde48`
* **Governing Product & Architecture Documents**:
  * `/docs/phase-1/00_PHASE_1_PRODUCT_BASELINE.md`
  * `/docs/phase-1/02_FUNCTIONAL_REQUIREMENTS.md`
  * `/docs/phase-1/03_UX_AND_NAVIGATION.md`
  * `/docs/phase-1/architecture/02_SOLUTION_AND_METADATA_ARCHITECTURE.md`
  * `/docs/phase-1/architecture/04_AUTHORISATION_AND_TENANT_ISOLATION_ARCHITECTURE.md`
* **Migration Baseline**: Preserves committed migration files `0000_init.sql` and `0001_puzzling_turbo.sql`. All schema additions for Increment 3 must be applied forward via `0002_*.sql`.
* **Explicit Scope Exclusions**:
  * Solution roles, queues, workflow steps, workflow outcomes (INC-04)
  * Form validation publishing & immutable version snapshots (INC-05)
  * Runtime case creation & generated forms execution (INC-06)
  * Task queues, claiming, locking, My Work portal (INC-07)
  * Workflow progression, send-back, approval/rejection (INC-08)
  * Document storage driver, uploads, lineage, Grid stretch scope (INC-09)
  * Search indexing, audit UI, comments, SLA dashboard (INC-10)
  * BFSI KYC reference solution end-to-end load (INC-11)
  * Healthcare reference solution portability (INC-12)
* **Approval Condition**: Formal Product Lead review and approval required before committing Increment 3 implementation.
* **Summary**: Implement the version-aware metadata foundation and Design Studio configuration flow for managing draft solutions, single Phase 1 case type configuration, ten mandatory property types with metadata validation, deterministic form section and field ordering, optimistic concurrency revisioning, tenant isolation, and append-only audit event tracking.
