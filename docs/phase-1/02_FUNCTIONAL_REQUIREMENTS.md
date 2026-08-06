# UCS CM Phase 1
## Detailed Functional Requirements

**Document Status:** Approved Product Specification

## Authentication
- Database-backed sessions with secure HTTP-only cookies.
- Configurable inactivity timeout via `SESSION_INACTIVITY_TIMEOUT_MINUTES=30` (server-enforced).
- Deactivation revokes access on next protected request.
- Failed logins return generic errors and masked audit events.

## Organisation Isolation & Tenant Security
- Trusted active-organisation context from authenticated session is authoritative. Request-body organisation IDs must never be trusted as authority.
- Global entity lookups followed by tenant checks are prohibited; active organisation filters must be embedded directly in initial query criteria.
- Requests targeting foreign-organisation resources return 404 Not Found without disclosing record existence.

## Design Studio
- **Solutions Home**: Access at `/studio/solutions`. Renders page heading and explanatory header text describing the solution portfolio, listing solutions belonging strictly to the user's trusted active organisation. Each solution row/card displays Solution Name, Solution Prefix / Key, Status (`Draft`), Last Updated timestamp, and an **Open** action trigger. Supports dedicated UI states: loading indicator during fetch, empty state with "Create Solution" trigger when zero solutions exist, and safe error state with recovery guidance if fetching fails.
- **Create Solution**: Modal/screen requiring Solution Name, Description, and editable suggested Solution Prefix. Prefix is auto-suggested from Solution Name, normalized to uppercase, validated for active-organisation uniqueness, and serves as the primary prefix for generated technical property names (while also available for case numbering formatting). Solution `key` is unified with or deterministically derived from `solution_prefix`.
- **Approved Property Identity Contract**:
  - **Local Symbolic Name**: Lowercase `snake_case` identifier entered by user (e.g. `customer_name`).
  - **Solution Prefix**: Uppercase prefix owned by Solution aggregate (e.g. `CDD`).
  - **Generated Read-Only Technical Property Name**: Automatically constructed as `<PREFIX>_<LOCAL_SYMBOLIC_NAME>` (e.g. `CDD_customer_name`), containing exactly one underscore separator.
  - **Rules**: Must start with an alphabetic character, contain only alphanumeric and underscore characters, enforce maximum length of 64 characters, reject reserved names and unsupported characters, and enforce uniqueness within the Solution aggregate.
  - **Mutability**: Local symbolic name and data type are mutable ONLY while the property remains draft and unused within the solution layout.
- **Aggregate Data Ownership**: Solution directly owns Data Dictionary properties, reusable Choice Lists, and Form layouts. Choice-list selection cardinality ownership (whether single-select vs multi-select cardinality is specified on the Choice List definition or on the Property/Control binding) is recorded as UNRESOLVED and explicitly deferred to INC-03B design without structurally implying an answer.
- **Core Stored Data Types & UI Controls**: Core stored data types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`) are separated from UI form controls.
- **Boolean Semantics**: A single Boolean checkbox and Yes/No Boolean radio do NOT require or use a choice list. Checkbox-group support remains deferred pending an approved multi-choice contract.
- **Choice Lists**: Solution-owned reusable entities storing ordered options with stable option keys, labels, and active states. Choice-list keys are unique within Solution; option keys are unique within Choice List. Option deactivation preserves historical data integrity while preventing new selection.
- **Form Layout Studio**: Initial form layout starts with one default tab when provisioned, containing sections and unique field references pointing to data dictionary properties. A property may appear only once in the same form.
- **One-Place Field Inspector Split**: Selecting a form field in Form Studio exposes BOTH configuration tiers in a single inspector panel without requiring navigation back to Data area for ordinary field changes:
  - **Canonical Data Dictionary Tier ("Applies everywhere")**: Stored data type, label, format preset (`EMAIL`, `PHONE`), choice list binding, default value, help text, minimum/maximum length or range constraints, pattern/regex validation rules.
  - **Form Reference Tier ("This form only")**: Form layout placement (tab, section), display ordering sequence, static visibility (`visible`), static enablement (`enabled`), static editability (`editable`), and static required state (`required`).
- **Property Lifecycle Protection**: Data dictionary properties referenced in a form layout cannot be deleted.
- **Regex Safety**: Preset regexes (`EMAIL`, `PHONE`, Alpha, Alphanumeric) and bounded custom regex patterns require bounded length, approved syntax, unsafe-construct rejection, and controlled test execution with user feedback.
- **Deferred Capabilities**: Solution publishing engine and immutable published snapshot compilation are deferred to a later authorised publishing increment (INC-05).

## Validation and Concurrency
- Backend validation engine is authoritative.
- Blocking metadata validation errors prevent layout saving.
- **Optimistic Concurrency Control**: Every mutable metadata update request MUST supply an `expectedRevision` payload parameter. Stale updates with mismatched `expectedRevision` return HTTP 409 Conflict without automatic merge or silent overwrite, providing a clear error message and client reload option. A failed update changes NOTHING in the database and generates NO audit record or updated metadata. The exact revision boundary model (solution-level vs component-level revision counter) is explicitly recorded as an INC-03B implementation decision.

## Audit Subsystem Architecture
- Append-only repository and database trigger protection enforce immutability.
- All metadata audit records commit synchronously within the exact same database transaction as successful mutations. If a mutation transaction rolls back, no audit record is written.
- Audit records capture actor context (`actor_user_id`), active organisation context (`organisation_id`), action event type, timestamp, and compact masked payloads (`before_state`, `after_state`, `metadata`).
- Exact transactional metadata mutation event matrix: `SOLUTION_CREATED`, `SOLUTION_UPDATED`, `PROPERTY_CREATED`, `PROPERTY_UPDATED`, `PROPERTY_DELETED`, `CHOICE_LIST_CREATED`, `CHOICE_LIST_UPDATED`, `CHOICE_OPTION_CREATED`, `CHOICE_OPTION_UPDATED`, `CHOICE_OPTION_DEACTIVATED`, `FORM_TAB_CREATED`, `FORM_TAB_UPDATED`, `FORM_TAB_DELETED`, `FORM_SECTION_CREATED`, `FORM_SECTION_UPDATED`, `FORM_SECTION_DELETED`, `FORM_FIELD_ADDED`, `FORM_FIELD_REMOVED`, `FORM_FIELD_UPDATED`, `FORM_LAYOUT_REORDERED`.
- Security audit event: `AUDIT_ACCESS_DENIED` logs unauthorized HTTP 403 access attempts. `STALE_UPDATE_REJECTED` is excluded because rejected-change auditing is not an approved platform pattern.

## Runtime Cases
- Authorised users create cases from published metadata-generated forms.
- Backend validates submitted values and required active documents.
- Case number and initial task are created transactionally with audit.

## Tasks
- My Work: Claimed, Available, Due Soon, Overdue, Recently Completed.
- Eligible users claim available tasks using `FOR UPDATE NOWAIT` row locking.
- Competing claims result in one success; non-winning requests receive an immediate HTTP 409 Conflict status.
- Only claimant completes a task.
- Completion validates outcome, fields, version, permissions, required active documents, then updates case, task, next step, and audit atomically.
- Supervisors may release or reassign with reason and audit.

## Case Workspace
- Header, Case Details, Current Task, Documents, Comments, Audit Timeline.
- Step metadata controls field visibility, editability, and required state.
- Closed cases are read-only.

## Documents
- Secure upload up to 25 MB.
- Validate extension, MIME, magic bytes, size, access, and document rules.
- Document replacement creates a new document row with `replaces_document_id` and incremented `version_sequence`; the previous record becomes `SUPERSEDED` and the new record active.
- Document requirements can be enforced at creation or workflow steps; deleted or superseded documents do not satisfy requirements unless an active replacement exists.
- Grid, inline PDF/image viewer, download, replace, soft delete, audit.
- All access passes backend case authorisation.

## Comments
- Plain-text comments are append-only in Phase 1.

## Audit
- Append-only repository and database protection.
- Case timeline and Platform Audit Console.
- Sensitive values masked.

## Search and SLA
- Search by case number, type, status, dates, case creator, task claimant, configured User-type properties explicitly marked searchable, and selected properties.
- Due Soon and Overdue calculated at query time.
- No email, WebSocket, or scheduler in Phase 1.
