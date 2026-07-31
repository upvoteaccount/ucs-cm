# Defect Register

| Defect ID | Severity | Description | Origin | Resolution / Fix | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | High | Migration overwrite attempt deleting `0000_init.sql` | INC-02 Review | Restored `0000_init.sql` and generated forward migration `0001_puzzling_turbo.sql` | Closed |
| **DEF-002** | Medium | Vitest foreign key cascade delete failure on `audit_events` | INC-02 Review | Refactored integration test matrix to use dynamic test suffixes without cascading FK deletes | Closed |
| **DEF-003** | Medium | Production Postgres container host port exposure | INC-02 Review | Removed host port binding from production `docker-compose.yml` | Closed |
