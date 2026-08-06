# Increment 3: Design Studio Foundation, Solution Data and Initial Form

* **Status**: Restart Planned
* **Starting Commit Hash**: `00f8d5c`
* **Governing Product & Architecture Documents**:
  * `/docs/phase-1/00_PHASE_1_PRODUCT_BASELINE.md`
  * `/docs/phase-1/02_FUNCTIONAL_REQUIREMENTS.md`
  * `/docs/phase-1/03_UX_AND_NAVIGATION.md`
  * `/docs/phase-1/architecture/04_METADATA_AND_PUBLISHING_MODEL.md`
  * `/docs/phase-1/architecture/08_AUTHORIZATION_AND_ORGANISATION_ISOLATION.md`
* **Migration Baseline**: Preserves committed migration files `0000_init.sql` and `0001_puzzling_turbo.sql`. INC-03B will propose the forward-only migration plan from current main.
* **Explicit Scope Exclusions**:
  * Solution roles, queues, workflow steps, workflow outcomes (INC-04)
  * Solution validation publishing & immutable version snapshots (deferred to a later authorised publishing increment / INC-05)
  * Runtime case creation & generated forms execution (INC-06)
  * Task queues, claiming, locking, My Work portal (INC-07)
  * Workflow progression, send-back, approval/rejection (INC-08)
  * Document storage driver, uploads, lineage, Grid stretch scope (INC-09)
  * Search indexing, audit UI, comments, SLA dashboard (INC-10)
  * BFSI KYC reference solution end-to-end load (INC-11)
  * Healthcare reference solution portability (INC-12)
* **Approval Condition**: Formal Product Lead review and approval required before committing Increment 3 implementation.
* **Summary**: Implement the Design Studio foundation and configuration flow for managing draft Solution applications (Solutions Home with portfolio text, loading, empty, and safe error states; Create Solution with name, description, auto-suggested uppercase prefix, which directly owns Data Dictionary properties, solution-owned Choice Lists, and Form layouts). Enforces the Property Identity Contract (`<PREFIX>_<LOCAL_SYMBOLIC_NAME>`) for generated read-only technical property names, with local symbolic name entered as lowercase `snake_case` (alphabetic start, <=64 chars, reserved name/char protection, uniqueness within Solution). Core stored data types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`) are separated from UI form controls and format presets (`EMAIL`, `PHONE`). A single Boolean checkbox and Yes/No Boolean radio do not require a choice list. Choice-list selection cardinality ownership is recorded as unresolved for INC-03B design. Form layouts support default tab provision when created, sections, and unique field references configured via a One-Place Field Inspector ("Applies everywhere" vs "This form only" tiers). Referenced properties cannot be deleted from the data dictionary; local symbolic names and types remain mutable only while draft and unused within the draft solution layout. Enforces optimistic concurrency (`expectedRevision` returning HTTP 409 Conflict with clear error message and reload option on stale updates; no partial DB mutation, no automatic merge; exact revision boundary model recorded as INC-03B decision), trusted active-organisation context scoping (prohibiting request-body org ID authority, global lookup before tenant check, or foreign tenant disclosure with 404 response), role-aware Studio access control for `PLATFORM_ADMIN` and `SOLUTION_DESIGNER` landing at `/studio/solutions` (server-side denial with approved forbidden experience `/forbidden` for runtime-only users), and neutral authenticated landing navigation (`/landing`). Append-only audit events commit synchronously within the exact same database transaction as successful metadata mutations.
