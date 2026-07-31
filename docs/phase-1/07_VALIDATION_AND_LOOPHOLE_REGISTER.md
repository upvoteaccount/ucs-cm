# UCS CM Phase 1
## Validation and Loophole Register

**Document Status:** Approved Product Specification

| ID | Risk | Prevention |
|---|---|---|
| VAL-001 | Incomplete publish | Blocking validator |
| VAL-002 | Duplicate keys | Unique constraints |
| VAL-003 | Draft runtime use | PUBLISHED-only guard |
| VAL-004 | Published edit | Immutable snapshot |
| VAL-005 | Unknown property | Backend allow-list |
| VAL-006 | Read-only field changed | Step editability guard |
| VAL-007 | Required field omitted | Backend validator |
| VAL-008 | Invalid dropdown | Option validation |
| VAL-009 | Direct status change | Workflow-only status |
| VAL-010 | Ineligible task claim | Queue-role guard |
| VAL-011 | Simultaneous claim | NOWAIT lock; one 409 |
| VAL-012 | Duplicate completion | Status/version/lock checks |
| VAL-013 | Stale update | Optimistic version conflict |
| VAL-014 | Send Back without reason | Mandatory reason |
| VAL-015 | Closed case edit | Closed-state guard |
| VAL-016 | Cross-organisation access | Scoped repositories |
| VAL-017 | Direct document access | Authorised stream endpoint |
| VAL-018 | Spoofed file | MIME and magic-byte checks |
| VAL-019 | Oversized file | Stream size limit |
| VAL-020 | Storage/DB partial failure | Cleanup and no false success |
| VAL-021 | Permanent document deletion | Soft delete |
| VAL-022 | Audit mutation | Repository restriction and DB trigger |
| VAL-023 | Sensitive audit exposure | Metadata-driven masking |
| VAL-024 | Deactivated session | Per-request session validation |
| VAL-025 | Solution Designer runtime leak | Separate grant |
| VAL-026 | Silent supervisor change | Reason and audit |
| VAL-027 | Case number collision | Scoped unique generator |
| VAL-028 | Unsupported snapshot | Version-aware reader |
| VAL-029 | Regex abuse | Restricted patterns and limits |
| VAL-030 | File I/O in task transaction | Architectural boundary |
