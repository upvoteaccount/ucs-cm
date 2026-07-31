# Risk and Dependency Register

| Risk / Dependency ID | Category | Description | Mitigation Strategy | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-001** | Data Isolation | Cross-tenant data leakage in API routes or repositories | Require explicit trusted organisation context from session; test non-disclosure 404 responses | Architecture Team | Mitigated |
| **RISK-002** | Metadata Model | Metadata schema mismatch with runtime form rendering engine | Authoritative server-side metadata validation engine; shared Zod primitives | Core Dev Team | Active |
| **RISK-003** | Database | Accidental modification or squashing of committed migration history | Enforce strict forward-only migration rule preserving `0000_init.sql` and `0001_puzzling_turbo.sql` | Core Dev Team | Mitigated |
| **RISK-004** | Concurrency | Stale metadata updates overwriting newer configuration changes | Implement optimistic concurrency revision counters (`revision`/`version`) across mutable metadata schemas | Core Dev Team | Active |
| **RISK-005** | Workflow | Configuration and runtime workflow FSM execution mismatch | Preserved `IWorkflowService` boundary; deterministic state machine transition rules | Architecture Team | Active |
| **RISK-006** | Concurrency | Concurrent task claiming race conditions in runtime worker queues | Database row-level locking (`FOR UPDATE`) during task claim operations | Core Dev Team | Active |
| **RISK-007** | Storage | Document metadata and binary blob storage state inconsistency | Multi-record database transactions pairing metadata records with filesystem blob ops | Infrastructure Team | Active |
| **RISK-008** | Quality | AI-generated false-positive tests masking underlying defects | Mandatory PostgreSQL-backed integration test execution against real database container | Quality Team | Mitigated |
| **RISK-009** | Validation | UI and backend validation rule mismatch causing silent errors | Authoritative backend validation engine evaluating rules prior to persistence | Core Dev Team | Active |
| **RISK-010** | Governance | Phase 1 scope drift expanding beyond approved architecture | Enforce strict 12-increment delivery plan and frozen baseline specifications | Product Lead | Active |
| **DEP-001** | Database | PostgreSQL 16 server dependency | Docker containerization with internal networking | DevOps | Active |
| **DEP-002** | Storage | Local filesystem driver abstraction for Phase 1 document storage | Standardized `StorageService` interface with S3 stretch compatibility contract | Core Dev Team | Active |
| **DEP-003** | Architecture | Temporal deferral and boundary preservation | Temporal is deferred to a dedicated future phase. The `IWorkflowService` boundary is implemented and preserved. | Architecture Team | Active |
