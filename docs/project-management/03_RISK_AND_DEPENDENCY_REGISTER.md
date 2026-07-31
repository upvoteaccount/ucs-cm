# Risk and Dependency Register

| Risk / Dependency ID | Category | Description | Mitigation Strategy | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-001** | Data Isolation | Accidental cross-tenant data leakage in API routes | Require explicit trusted organisation context from session; test non-disclosure 404 responses | Architecture Team | Mitigated |
| **RISK-002** | Performance | Excessive database write load during session activity updates | Enforce 60-second activity update throttling in `validateSession` | Core Dev Team | Mitigated |
| **DEP-001** | Database | PostgreSQL 16 server dependency | Docker containerization with internal networking | DevOps | Active |
| **DEP-002** | Storage | Local filesystem driver abstraction for Phase 1 document storage | Standardized `StorageService` interface with S3 stretch compatibility contract | Core Dev Team | Active |
