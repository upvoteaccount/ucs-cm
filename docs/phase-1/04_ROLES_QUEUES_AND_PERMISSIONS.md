# UCS CM Phase 1
## Roles, Queues and Permissions Matrix

**Document Status:** Approved Product Specification

## Platform Roles
- Platform Administrator
- Solution Designer
- Runtime User
- Supervisor

Solution Designer access does not grant runtime access.

## Reference Solution Roles
KYC Initiator, KYC Reviewer, Compliance Officer, Final Approver, KYC Supervisor.

## Rules
- Users are assigned to one or more work queues directly.
- Queue membership determines accessible In Baskets in Navigator and WID processing/editing rights.
- Queue visibility does not grant task completion without task claim.
- Claim is mandatory before completion/sending.
- Only the active claimant on a claimed WID may submit workflow actions.
- Supervisors may release/reassign tasks with mandatory reason and audit.
- Field permission evaluation order: base Form layout structure → queue-context field behavior rules (`visible`/`hidden`, `editable`/`read-only`, `mandatory`/`optional`).
- Document access follows queue and case access.
- Closed cases are not editable through normal operations.
- Administrative correction, if later introduced, requires dedicated permission, reason, before/after capture, and audit.
