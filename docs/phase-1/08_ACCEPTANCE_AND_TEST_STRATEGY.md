# UCS CM Phase 1
## Acceptance and Test Strategy

**Document Status:** Approved Product Specification

## Test Layers
Unit, domain service, PostgreSQL integration, API, UI component, end-to-end browser, security/permission, deployment smoke.

## Build Gates
Lint, type-check, unit tests, integration tests, migration verification, container build, startup smoke test.

## INC-03 Bounded Acceptance Gate
1. **Solutions Home & Creation**: Authorised `SOLUTION_DESIGNER` accesses `/studio/solutions`, verifies heading/portfolio text, verifies loading, empty, and safe error states. Triggers **Create Solution**, verifies auto-suggested editable uppercase prefix (`CDD`), saves draft solution, and verifies navigation into Solution Studio.
2. **Solution Data Dictionary**: Configures Data Dictionary properties enforcing the Property Identity Contract (`<PREFIX>_<LOCAL_SYMBOLIC_NAME>`, e.g. `CDD_customer_name`), core stored data types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`), format presets (`EMAIL`, `PHONE`), and single Boolean checkbox semantics (no choice list).
3. **Choice Lists**: Configures solution-owned reusable Choice Lists with stable option keys, labels, and active states. Verifies option deactivation.
4. **Form Studio & Inspector**: Configures initial Form layout (default tab, sections, unique field references). Verifies the One-Place Field Inspector panel exposing both Data Dictionary tier ("Applies everywhere") and Form Reference tier ("This form only").
5. **Guards & Concurrency**: Verifies property deletion is blocked when referenced in form layout; verifies property key/type are mutable only while draft and unused; verifies optimistic concurrency (`expectedRevision` returning HTTP 409 Conflict with clear reload message on stale update; no partial DB mutation, no automatic merge); verifies trusted active-organisation scoping (404 Not Found on foreign lookups).
6. **Security & Audit**: Verifies runtime-only users are denied access to `/studio` (rendering approved `/forbidden` experience); verifies synchronous database transaction audit logging (`SOLUTION_CREATED`, `PROPERTY_CREATED`, `CHOICE_LIST_CREATED`, `FORM_FIELD_ADDED`, etc.).
7. **Gate Completion**: Concludes cleanly with a validated, saved draft Solution application and initial draft form layout.

## End-to-End Approved Path (Phase 1 Baseline)
Create users, access Solutions Home (`/studio/solutions`), Create Solution (name, description, key, solution prefix e.g. `CDD`), configure Data Dictionary (base types, UI controls, format presets, choice lists with symbolic name contract), configure Form Studio (default tab, sections, unique field references, one-place field inspector), test property deletion blocking when referenced, draft key/type mutability rules, optimistic concurrency revisioning (`expectedRevision` with clear error message and reload option on HTTP 409 Conflict), trusted active-organisation tenant isolation (404 on foreign lookups), validate role-aware Studio access (`/studio/solutions`, `/forbidden`), publish solution in a later authorised publishing increment (INC-05), create case (`CDD-KYC-000001`), upload documents, claim and complete tasks, approve final decision, close case, verify audit, search, and read-only closure.

## Send-Back Path
Compliance sends back with reason, new earlier-step task created, completed history preserved, correction made, flow resumes, audit shows both passes.

## Rejection Path
Reject with reason, terminal rejected status, no active task, standard edits blocked, audit complete.

## Concurrency
Two claim attempts: one success, one HTTP 409, one claimant, one claim audit event, no duplicate completion.

## Security
Test unauthenticated, deactivated, cross-organisation access (prohibiting request-body org ID spoofing; 404 response on foreign lookups), Studio access by runtime-only user (rendering approved forbidden experience `/forbidden`), wrong queue, non-claimant completion, unauthorised document, and audited Supervisor actions.

## Healthcare Portability
Configure Patient Grievance Management with different metadata, roles, queues, documents, and sequential workflow without source-code changes.

## Exit Criteria
All mandatory requirements pass, critical loopholes tested, no unresolved critical/high security defects, BFSI and healthcare flows pass, audit integrity passes, Docker deployment succeeds, docs/demo complete, and all approvers sign off.
