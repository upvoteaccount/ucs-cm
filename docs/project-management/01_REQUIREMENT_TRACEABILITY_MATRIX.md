# Requirement Traceability Matrix (RTM)

| Requirement ID | Category | Summary | Mapped Architecture / Component | Verification / Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-FOUNDATION-01** | Architecture | Next.js Standalone Monolith | `next.config.mjs`, Dockerfile | Container runtime build | Verified (INC-01) |
| **REQ-AUTH-01** | Security | Database Sessions & Sliding Window | `src/modules/auth/auth.service.ts` | `auth.test.ts` | Verified (INC-02) |
| **REQ-AUTH-02** | Security | HTTP-Only SameSite Cookie Management | `src/app/api/auth/session/route.ts` | `logout.test.ts` | Verified (INC-02) |
| **REQ-ORG-01** | Isolation | Multi-Tenant Organisation Scoping | `src/shared/tenant-repository.ts` | `auth.test.ts` | Verified (INC-02) |
| **REQ-AUDIT-01** | Compliance | Append-Only Database Audit Trigger | `drizzle/0001_puzzling_turbo.sql` | `auth.test.ts` | Verified (INC-02) |
| **REQ-META-01** | Metadata | 10 Mandatory Property Types | `src/modules/solution/` | INC-03 Test Suite | In Progress |
