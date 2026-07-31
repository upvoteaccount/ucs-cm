# 05. Runtime Case and Task Model

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Runtime Lifecycle Overview

This document specifies the database schemas, task claiming semantics, queue locking rules, and state progression logic for runtime cases and workflow tasks in UCS CM Phase 1.

---

## 2. Core Entity Definitions & Database Models

### 2.1 Database Schema (Drizzle Syntax Reference)

```sql
-- Runtime Cases Table
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    solution_version_id UUID NOT NULL REFERENCES solution_versions(id),
    case_number VARCHAR(64) NOT NULL, -- e.g. "CDD-KYC-000104"
    status VARCHAR(32) NOT NULL DEFAULT 'NEW', -- 'NEW', 'IN_PROGRESS', 'CLOSED_APPROVED', 'CLOSED_REJECTED'
    current_step_id VARCHAR(64) NOT NULL,
    property_values JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configurable field values
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1, -- Optimistic Concurrency Control
    CONSTRAINT uq_cases_org_case_number UNIQUE (organisation_id, case_number)
);

-- Runtime Workflow Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    step_id VARCHAR(64) NOT NULL,
    task_name VARCHAR(128) NOT NULL,
    queue_key VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'CLAIMED', 'COMPLETED', 'CANCELLED'
    claimed_by_user_id UUID REFERENCES users(id),
    claimed_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by_user_id UUID REFERENCES users(id),
    outcome_selected VARCHAR(64),
    version INT NOT NULL DEFAULT 1 -- Optimistic Concurrency Control
);

### 2.2 Organisation Scoping Query Enforcement
Every runtime database query MUST be scoped to the authenticated session's `organisation_id`. This is enforced at the repository layer:
- **Case Lookups**: `WHERE organisation_id = session.organisationId AND id = $caseId`
- **Queue Task Queries**: `WHERE organisation_id = session.organisationId AND queue_key IN ($userAllowedQueues)`
- **Task Claiming/Transitions**: `WHERE organisation_id = session.organisationId AND id = $taskId`
```

---

## 3. Queue-Based Task Claiming & Locking Protocol

To prevent two users from claiming or completing the same task simultaneously, UCS CM implements strict **PostgreSQL Row-Level Locking (`FOR UPDATE`)** during claim and completion transactions.

```text
User A (Portal)                                                                    User B (Portal)
  |                                                                                  |
  |--- 1. Click "Claim Task" ------------+                                           |
  |                                       |                                          |
  |                                       v                                          |
  |                     [ POSTGRES TRANSACTION START ]                               |
  |                     SELECT * FROM tasks                                          |
  |                     WHERE organisation_id = $orgId AND id = $taskId              |
  |                     FOR UPDATE NOWAIT; -- Attempts non-blocking row lock         |
  |                                       |                                          |
  |                                       |--- 2. Click "Claim Task" (Simultaneous) --|
  |                                       |    (Rejects immediately via NOWAIT)      |
  |                                       |                                          |
  |  3. Validate Task Status == AVAILABLE |                                          |
  |  4. UPDATE tasks SET status='CLAIMED',|                                          |
  |     claimed_by_user_id = $UserA_Id    |                                          |
  |  5. COMMIT TRANSACTION;                |                                          |
  |                                       |                                          |
  |                                       v                                          |
  |                                 [ User B's Transaction Execution ]               |
  |                                 Catches Lock Failure Exception                   |
  |                                 6. Return HTTP 409 Conflict Response ----------->|
  |                                    "Task was claimed by another user."           |
```

### 3.1 Task-Claim Concurrency Strategy
* **DB Lock Mode**: `SELECT ... FOR UPDATE NOWAIT` is used to prevent competing HTTP request threads from blocking inside the database pool.
* **User-Facing Conflict Response**: If User B attempts to claim a task while User A is in the middle of claiming it (or immediately after User A succeeds), User B's request receives an immediate **HTTP 409 Conflict** status with the payload `{ error: "TASK_ALREADY_CLAIMED", message: "This task has already been claimed by another user." }`.
* **File I/O Boundary**: All storage operations (file upload streams, file system reads) and heavy operations are executed strictly **outside** the database transaction boundary.

---

## 4. Calculated Task SLA States (Due Soon & Overdue)

Product Lead Decision #3 specifies that **Due Soon** and **Overdue** states are calculated dynamically at query time rather than generated by background cron/worker processes.

### Dashboard SLA Query Logic
* **Task Due Date (`due_at`)**: Calculated when a task is created: `NOW() + step.dueDurationHours`.
* **Overdue Condition**: `status IN ('AVAILABLE', 'CLAIMED') AND due_at < NOW()`
* **Due Soon Condition**: `status IN ('AVAILABLE', 'CLAIMED') AND due_at >= NOW() AND due_at <= (NOW() + INTERVAL '24 HOURS')`

---

## 5. Architectural Decisions

### Choice 5.1: Optimistic Versioning + Row-Level Locks (`FOR UPDATE NOWAIT`)
* **Decision**: Enforce task claiming and completion using database transactions with non-blocking row-level locks (`SELECT ... FOR UPDATE NOWAIT`) and incrementing `version` integers.
* **Alternatives Considered**: 
  1. Distributed locks via Redis.
  2. Pure optimistic locking without DB row locks.
  3. Blocking `FOR UPDATE` wait queues inside PostgreSQL.
* **Rationale**:
  1. Product Lead Decision #5 explicitly forbids introducing Redis for task locking in Phase 1.
  2. Non-blocking `NOWAIT` prevents web server request threads from waiting on database row locks, returning immediate HTTP 409 conflicts to competing users.
* **Phase 1 Impact**: Substantially reduces race conditions and prevents duplicate task completions without external infrastructure.
* **Future Implications**: Scale-out friendly across multiple Next.js app instances since lock state is managed entirely by PostgreSQL.
* **Risks**: High database transaction load under extreme concurrency spikes.
* **Mitigations**: Scoping transactions strictly to minimal DB mutations; file I/O operations strictly excluded from transactions.
* **Product Approval Required**: Approved (Decision Point #5).
