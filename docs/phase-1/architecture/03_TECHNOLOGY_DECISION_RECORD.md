# 03. Technology Decision Record

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Executive Summary

This document formalizes the key architectural technology choices for UCS CM Phase 1. It provides detailed comparative evaluations, rationale, phase 1 impact, future implications, risks, and mitigations for each core dependency.

---

## 2. Core Decisions Matrix

### Decision 3.1: ORM Selection — Prisma vs. Drizzle ORM

| Criterion | Prisma ORM | Drizzle ORM |
| :--- | :--- | :--- |
| **Type Safety** | Excellent (Generated Types) | Superior (TypeScript Schema is Single Source of Truth) |
| **Row-Level Locking (`FOR UPDATE`)** | Requires Raw SQL (`$queryRaw`) | Native SQL builder support (`.for('update')`) |
| **Complex PostgreSQL Transactions** | Interactive Transactions (gRPC engine overhead) | Direct SQL Transaction Wrappers |
| **Migration Control** | Declarative shadow database migrations | SQL-first, zero-magic migration files |
| **Performance Overhead** | Higher (Rust Engine Binary IPC Overhead) | Zero (Lightweight SQL Query Builder) |

* **Decision**: **Drizzle ORM** is selected as the primary ORM for UCS CM.
* **Alternatives Considered**: Prisma ORM, Kysely, Plain `pg` driver.
* **Rationale**: 
  1. UCS CM Phase 1 requires explicit, fine-grained control over PostgreSQL row locking (`SELECT ... FOR UPDATE`) to prevent race conditions during task claiming and queue locking (Product Lead Decision #5). Prisma forces raw SQL strings for row locking, defeating its type-safety benefits.
  2. Drizzle produces lightweight, predictable SQL without a hidden binary engine IPC layer.
* **Phase 1 Impact**: Clean SQL migrations, exact row locking syntax in TypeScript, lightweight container image.
* **Future Implications**: Easy to write complex, highly optimized SQL queries as dynamic search requirements grow in future phases.
* **Risks**: Slightly less automated database seeding tooling compared to Prisma Studio.
* **Mitigations**: Build dedicated custom seed scripts using Drizzle schema definitions.

---

### Decision 3.2: Provisional Runtime Property Validation Architecture — Zod AST Synthesis

| Criterion | Dynamic Zod AST Synthesis (Provisional) | JSON Schema / AJV |
| :--- | :--- | :--- |
| **Dynamic Schema Generation** | Native TypeScript composability (`z.object()`) | Requires JSON Schema Draft 7/2020-12 spec structures |
| **Developer Ergonomics** | Native TypeScript integration across client & backend | Requires separate type generation or schema compilation step |
| **Controlled Property Mapping** | Simple mapping for 10 mandatory Phase 1 types | Flexible standard but extra mapping boilerplate for custom AST |

* **Decision**: **Dynamic Zod AST Synthesis** is selected as the *provisional* architecture for runtime metadata property validation.
* **Alternatives Considered**: JSON Schema with AJV, Yup, Valibot.
* **Rationale**: Preferred for Phase 1 based on implementation simplicity, end-to-end TypeScript integration, and direct alignment with our controlled 10 mandatory property types.
* **Provisional Validation Architecture**:
  1. **Property Primitive Mapping**: Converts configured metadata types (Text, Long Text, Number, Date, Date and Time, Boolean, Dropdown, Email, Phone, User) to base Zod schemas (e.g. `z.string().email()`, `z.number()`). (Note: Grid / Repeating Table is stretch scope and excluded from mandatory primitives).
  2. **Lookup List & Options Enforcer**: Static options map to `z.enum([...options])`; reusable lookup lists resolve against the tenant's valid lookup entries.
  3. **Pattern Validation**: Regex pattern rules validate strings via `z.string().regex(new RegExp(pattern))`.
  4. **Step-Level Required & Editability Rules**: At step execution time, the backend validator intercepts the request and verifies:
     - `submittedProperties` contains ONLY keys defined in `WorkflowStep.editableProperties`.
     - `submittedProperties` includes ALL keys defined in `WorkflowStep.requiredProperties`.
  5. **Schema-Version Compatibility**: Historic published snapshot versions remain executable after platform upgrades via version-aware readers and backward-compatible schema transformers without requiring solution republication.
* **Phase 1 Impact**: Zero executable code generation from user configuration; deterministic backend validation.
* **Future Implications**: Standardized definition AST can be exported/imported cleanly as JSON.
* **Risks**: Complex dynamic Zod schema synthesis from JSON AST requires thorough unit testing.
* **Mitigations**: Comprehensive unit testing of the dynamic schema validator against all 10 mandatory Phase 1 property types prior to implementation sign-off.

---

### Decision 3.3: Session & Authentication Architecture — Database-Backed Sessions vs. Custom JWT

* **Decision**: **Database-Backed Sessions** managed via secure HTTP-only cookies.
* **Alternatives Considered**: Stateless JWTs stored in LocalStorage, Custom Signed JWT in Cookies.
* **Rationale**:
  1. Product Lead Decision #11 explicitly mandates database-backed sessions unless JWT is strictly justified.
  2. Immediate Revocation Requirement: When a Platform Administrator deactivates a user (Section 17), their access must be revoked *immediately*. Stateless JWTs cannot be revoked immediately without a centralized blacklist (which effectively turns them into stateful sessions).
  3. Security: HTTP-only, `SameSite=Lax/Strict` cookies eliminate XSS session stealing risks inherent in LocalStorage JWTs.
* **Phase 1 Impact**: Single `sessions` table in PostgreSQL. Every API request verifies session active status and user organisation binding.
* **Future Implications**: Simplifies enterprise SSO (SAML/OIDC) integration in Phase 2.
* **Risks**: Additional DB read per authenticated API request.
* **Mitigations**: Session lookup query is lightweight and heavily indexed on `session_token`. In-memory caching can be added in Phase 2 if DB load increases.

---

### Decision 3.4: Storage Driver Architecture — Local File System vs. S3/MinIO Scope

* **Decision**: Implement an abstract **`StorageService`** interface with a mandatory **Secure Local Filesystem Driver** (`LocalFilesystemStorageDriver`) for Phase 1 Linux deployment. S3-compatible interface and configuration contracts are required, while full S3/MinIO driver implementation and testing remain stretch scope.
* **Alternatives Considered**: Direct S3-only storage, DB ByteA blob storage.
* **Rationale**:
  1. Storing binaries in PostgreSQL bloats database backups and degrades DB performance.
  2. Local FS driver ensures zero external container dependencies for Phase 1 deployment, while S3 interface contract guarantees future cloud readiness without delaying the Phase 1 vertical slice.
* **Phase 1 Impact**: Simplified single-node deployment using local disk storage; clean interface contract for future S3 migration.
* **Future Implications**: Cloud migrations (AWS S3, GCP Cloud Storage) require zero application code changes—only driver implementation.
* **Risks**: Local FS storage requires persistent Docker volume mounts and host disk space monitoring.
* **Mitigations**: Strict file permissions (`0700`) on internal storage folders and host disk space monitoring guidelines.

---

### Decision 3.5: Database Transaction Timeout & Lock Governance

* **Decision**: Do not impose a universal hardcoded 5,000 ms ORM transaction timeout. Keep transactions short, use `NOWAIT` for lock acquisition where approved, and make PostgreSQL statement and lock timeouts environment-configurable (`POSTGRES_STATEMENT_TIMEOUT_MS`, `POSTGRES_LOCK_TIMEOUT_MS`).
* **Rationale**: Product Lead Decision on transaction governance: prevents unexpected query aborts while allowing fine-grained operational control in target deployment environments.

---

### Summary Table of All Technology Choices

| Layer / Concern | Selected Technology | Primary Rationale |
| :--- | :--- | :--- |
| **Language** | TypeScript 5.x | End-to-end type safety, shared schema definitions. |
| **Framework** | Next.js 14+ (App Router) | Standalone Node.js server mode, unified React rendering & API endpoints. |
| **Database** | PostgreSQL 16 | ACID compliance, JSONB dynamic properties, robust row locking (`FOR UPDATE`). |
| **ORM** | Drizzle ORM | Type-safe SQL builder, direct `FOR UPDATE` support, zero binary IPC overhead. |
| **Validation** | Zod | Dynamic schema validation without executable code generation. |
| **Authentication** | Custom Session Store | Database-backed sessions for instant user deactivation and XSS protection. |
| **Storage Driver** | Abstract `StorageService` | Local FS driver for simple Phase 1 Linux deployment; MinIO driver prepared. |
| **UI Styling** | Vanilla CSS / CSS Modules | Highly customizable styling engine without external utility framework overhead; visual styling governed by UX specification. |
