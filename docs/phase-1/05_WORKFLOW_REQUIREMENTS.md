# UCS CM Phase 1
## Workflow Requirements

**Document Status:** Approved Product Specification

## Model
PostgreSQL-backed sequential FSM behind `IWorkflowService`. Temporal is deferred to a dedicated future phase.

## Outcome Modeling
- Outcomes must explicitly specify transition targets:
  - Normal step transitions and Send Back transitions specify `targetStepId`.
  - Terminal outcomes specify `terminalStatus` (e.g. `CLOSED_APPROVED`, `CLOSED_REJECTED`).
  - Send Back and Reject outcomes require `reasonRequired: true`.

## Publishing Validation
Reject workflows with missing/duplicate initial steps, steps without queues or outcomes, invalid targets, unreachable steps, invalid editable/required properties, missing required reason configurations for Send Back/Reject, or paths without terminal resolution.

## Task Creation
Create AVAILABLE task, configured queue, due date, current step/status, and audit.

## Claim
Validate organisation and queue access, use `FOR UPDATE NOWAIT` row locking, ensure AVAILABLE, set claimant/time/version, audit, return immediate HTTP 409 Conflict status for non-winning competing requests.

## Completion
Require CLAIMED status and active claimant, validate version/outcome/editable/required fields and required active documents, update values, complete task, create next task or close case, update status, audit, commit atomically.

## Send Back
Mandatory reason (`reasonRequired: true`), complete current task, preserve history, create new task at target earlier step (`targetStepId`), preserve case values, update status, audit source/target/reason.

## Release and Reassignment
Release returns task to AVAILABLE. Reassignment is Supervisor-only. Both are audited.

## Temporal Contingency
Higher-level modules use `IWorkflowService`; no other module may depend directly on FSM internals.
