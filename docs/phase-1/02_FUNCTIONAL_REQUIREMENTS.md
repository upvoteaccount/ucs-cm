# UCS CM Phase 1
## Detailed Functional Requirements

**Document Status:** Approved Product Specification

## Authentication
- Database-backed sessions with secure HTTP-only cookies.
- Configurable inactivity timeout via `SESSION_INACTIVITY_TIMEOUT_MINUTES=30` (server-enforced).
- Deactivation revokes access on next protected request.
- Failed logins return generic errors and masked audit events.

## Organisation Isolation
- Every tenant-owned request is organisation-scoped.
- Cross-organisation access is denied without revealing record existence.

## Design Studio
- Create Draft solution with stable key.
- Exactly one case type in Phase 1 UI.
- Ten mandatory property types (Grid / Repeating Table remains stretch scope).
- Ordered form sections and fields.
- Configurable roles, queues, workflow steps, outcomes, document types.
- Published versions are immutable; subsequent changes use a new Draft.

## Validation and Publishing
- Backend validation is authoritative.
- Blocking errors prevent publication.
- Publish compiles an immutable versioned snapshot.
- Runtime cases bind to the exact published version.

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
