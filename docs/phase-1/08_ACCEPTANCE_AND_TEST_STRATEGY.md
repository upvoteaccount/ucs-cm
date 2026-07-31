# UCS CM Phase 1
## Acceptance and Test Strategy

**Document Status:** Approved Product Specification

## Test Layers
Unit, domain service, PostgreSQL integration, API, UI component, end-to-end browser, security/permission, deployment smoke.

## Build Gates
Lint, type-check, unit tests, integration tests, migration verification, container build, startup smoke test.

## End-to-End Approved Path
Create users, configure solution/case type/properties/form/roles/queues/workflow/document types, validate, publish, create case, upload documents, claim and complete tasks, approve final decision, close case, verify audit, search, and read-only closure.

## Send-Back Path
Compliance sends back with reason, new earlier-step task created, completed history preserved, correction made, flow resumes, audit shows both passes.

## Rejection Path
Reject with reason, terminal rejected status, no active task, standard edits blocked, audit complete.

## Concurrency
Two claim attempts: one success, one HTTP 409, one claimant, one claim audit event, no duplicate completion.

## Security
Test unauthenticated, deactivated, cross-organisation, wrong queue, non-claimant completion, unauthorised document, and audited Supervisor actions.

## Healthcare Portability
Configure Patient Grievance Management with different metadata, roles, queues, documents, and sequential workflow without source-code changes.

## Exit Criteria
All mandatory requirements pass, critical loopholes tested, no unresolved critical/high security defects, BFSI and healthcare flows pass, audit integrity passes, Docker deployment succeeds, docs/demo complete, and all approvers sign off.
