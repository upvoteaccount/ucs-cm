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
- Users may have multiple solution roles.
- Roles grant access to one or more queues.
- Queue visibility does not grant task completion.
- Claim is mandatory before completion.
- Only the active claimant may complete.
- Supervisors may release/reassign with mandatory reason and audit.
- Field permission evaluation order: organisation, case access, workflow step, solution role, published editable/required rules.
- Document access follows case access.
- Closed cases are not editable through normal operations.
- Administrative correction, if later introduced, requires dedicated permission, reason, before/after capture, and audit.
