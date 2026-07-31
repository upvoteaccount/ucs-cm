# 09. Audit and Security Architecture

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Security Baseline

This document specifies the append-only audit logging architecture, database protection mechanisms, and core security controls for UCS CM Phase 1.

---

## 2. Dual Audit System Design

UCS CM maintains two distinct audit perspectives (Section 16):

```text
+---------------------------------------------------------------------------------------------------+
|                                     UCS CM Audit Subsystem                                        |
+---------------------------------------------------------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v                                                     v
+----------------------------------------------+   +--------------------------------------------+
|         Case Audit Timeline (Case Scope)     |   |    Platform Audit Console (Admin Scope)    |
+----------------------------------------------+   +--------------------------------------------+
| - Case Created / Status Changed              |   | - Login Success / Login Failure / Logout   |
| - Task Created / Claimed / Released / Done   |   | - User Created / Activated / Deactivated   |
| - Document Uploaded / Viewed / Deleted       |   | - Solution Created / Validated / Published |
| - Case Property Value Changes (Before/After) |   | - Unauthorized Access Attempts (HTTP 403)  |
+----------------------------------------------+   +--------------------------------------------+
```

---

## 3. Database Schema for Append-Only Audit Trail

```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id), -- NULL for system/unauthenticated events prior to org context resolution
    category VARCHAR(32) NOT NULL, -- 'CASE', 'PLATFORM', 'SECURITY', 'DOCUMENT'
    event_type VARCHAR(64) NOT NULL, -- e.g. 'TASK_CLAIMED', 'DOC_DOWNLOADED', 'LOGIN_FAILURE'
    case_id UUID REFERENCES cases(id),
    task_id UUID REFERENCES tasks(id),
    actor_type VARCHAR(32) NOT NULL DEFAULT 'AUTHENTICATED_USER', -- 'AUTHENTICATED_USER', 'ANONYMOUS', 'SYSTEM'
    actor_user_id UUID REFERENCES users(id), -- NULL for ANONYMOUS or SYSTEM events
    actor_identifier VARCHAR(128), -- Stores masked identifier (e.g. "j***@domain.com") for anonymous/invalid login attempts
    actor_ip_address VARCHAR(45),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    before_state JSONB, -- Property value snapshot before change
    after_state JSONB,  -- Property value snapshot after change
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Index for rapid Case Timeline rendering
CREATE INDEX idx_audit_case_id_ts ON audit_events(case_id, timestamp DESC);
-- Index for Platform Admin Audit Console
CREATE INDEX idx_audit_org_category_ts ON audit_events(organisation_id, category, timestamp DESC);
```

### 3.1 Privacy Masking Rules for Audit Records
To protect sensitive user data during unauthenticated or invalid access attempts:
- **Failed Login Usernames/Emails**: Masked before persistence (`j***@example.com` or `a***dmin`).
- **Sensitive Case Property Values**: Masked in `before_state` and `after_state` JSONB payloads if property definition flag `sensitive=true` is set.

---

## 4. Append-Only Protection Mechanism Comparison

Product Lead Decision #12 requires comparing database permissions, repository restrictions, and PostgreSQL triggers to ensure audit records cannot be mutated.

| Mechanism | Description | Security Level | Operational Impact |
| :--- | :--- | :--- | :--- |
| **Repository-Level Restriction** | Omit `update` and `delete` methods from `AuditRepository` in TypeScript code. | Low (Vulnerable if raw SQL or admin code is executed). | Zero DB setup overhead. |
| **Database Role Permission Restrictions** | App user DB role granted `INSERT` and `SELECT` only on `audit_events` (REVOKE `UPDATE`, `DELETE`). | **High** (Enforced natively by PostgreSQL engine). | Requires configuring dual DB roles in migration. |
| **PostgreSQL Trigger Protection** | DB trigger raises an exception on any `UPDATE` or `DELETE` attempt on `audit_events`. | **Highest** (Immutable even for database superusers unless trigger is explicitly dropped). | Small execution overhead on DB write. |

### Selected Protection Strategy
UCS CM will implement **Dual-Layer Protection**:
1. **PostgreSQL Trigger Protection**: A migration script attaches an immutable trigger to `audit_events`.
2. **Repository Restriction**: The TypeScript `AuditRepository` exposes strictly `insert()` and `read()` methods.

```sql
-- PostgreSQL Immutable Trigger Migration Script
CREATE OR REPLACE FUNCTION block_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY ERROR: audit_events records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();
```

---

## 5. Architectural Decisions

### Choice 9.1: Synchronous In-Transaction Audit Logging
* **Decision**: All audit events generated by case state changes or task transitions are written inside the primary PostgreSQL database transaction.
* **Alternatives Considered**: Async background queue logger (e.g. Pino / Winston file logger, Kafka audit topic).
* **Rationale**:
  1. Provides strong audit integrity: if a business action commits, its corresponding audit record commits within the exact same database transaction.
  2. Significantly reduces audit record loss risk during sudden server crashes or container restarts.
* **Phase 1 Impact**: Strong transactional integrity, significantly reduced audit loss risk, and complete operational auditability.
* **Future Implications**: Can add async secondary log shippers (e.g. FluentBit reading PostgreSQL WAL) in future phases without altering primary DB audit integrity.
* **Risks**: Slight write performance latency additions to transactions.
* **Mitigations**: Keep audit payload payloads compact using efficient JSONB structures.
* **Product Approval Required**: Approved (Baseline Requirement #16.3 & Decision #12).
