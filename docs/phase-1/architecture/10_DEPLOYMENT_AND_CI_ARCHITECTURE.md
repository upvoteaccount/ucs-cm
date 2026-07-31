# 10. Deployment and CI Architecture

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Topology Overview

This document specifies the multi-container Docker Compose deployment topology (consisting of the standalone application container and the PostgreSQL database container), environment variable specifications, and automated CI pipeline for UCS CM Phase 1.

---

## 2. Multi-Container Docker Compose Deployment Topology

```text
                               +---------------------------------------+
                               |     Host Linux Server Ingress         |
                               |          (Port 80 / 443)              |
                               +---------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
| Multi-Container Docker Compose Environment (`docker-compose.yml`)                                 |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Container 1: `ucs-cm-app` (Application Container)                                           |  |
|  | - Image: `ucs-cm:1.0.0-phase1` (Next.js Standalone Node Server)                             |  |
|  | - Port: 3000                                                                                |  |
|  | - Environment: `STORAGE_DRIVER=local`, `STORAGE_PATH=/var/ucs-cm/storage`                  |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                     |                                 |                           |
|                  +------------------+                                 +------------------+        |
|                  |                                                                       |        |
|                  v                                                                       v        |
|  +-------------------------------------------------------------+   +---------------------------+  |
|  | Container 2: `ucs-cm-postgres` (Database Container)         |   | Persistent Host Volume    |  |
|  | - Image: `postgres:16-alpine`                               |   | `/var/ucs-cm/storage`     |  |
|  | - Port: 5432 (Internal Docker Network Only)                |   | (Uploaded Binary Files)   |  |
|  | - Volume: `pgdata:/var/lib/postgresql/data`                |   +---------------------------+  |
|  +-------------------------------------------------------------+                                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Environment Variable Specification (`.env.example`)

```ini
# Application Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security Secrets
SESSION_SECRET=super-secret-random-32-character-key
ENCRYPTION_KEY=super-secret-32-byte-hex-encryption-key

# Database Connection (PostgreSQL 16)
DATABASE_URL=postgresql://ucs_user:secure_password@ucs-cm-postgres:5432/ucs_cm_db?schema=public

# Document Storage Driver Setup
STORAGE_DRIVER=local # Options: 'local' | 's3'
LOCAL_STORAGE_PATH=/var/ucs-cm/storage

# MinIO / S3 Configuration (Optional stretch capability)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=ucs-cm-documents
S3_ACCESS_KEY=minioaccesskey
S3_SECRET_KEY=miniosecretkey
```

---

## 4. Automated CI Pipeline (GitHub Actions / GitLab CI Workflow)

```text
[ Git Push to `main` ]
          |
          v
+---------------------------------------------------------------------------------------------------+
| Stage 1: Static Code Analysis & Verification                                                      |
| - `npm run lint` (ESLint strict rules)                                                            |
| - `npm run type-check` (TypeScript strict compile checks)                                         |
+---------------------------------------------------------------------------------------------------+
          |
          v
+---------------------------------------------------------------------------------------------------+
| Stage 2: Database Migration & Automated Testing                                                   |
| - Start ephemeral PostgreSQL service container                                                    |
| - Run Drizzle migrations (`npm run db:migrate`)                                                   |
| - Execute Vitest Unit & Integration Tests (`npm run test`)                                        |
+---------------------------------------------------------------------------------------------------+
          |
          v
+---------------------------------------------------------------------------------------------------+
| Stage 3: Container Build & Verification                                                           |
| - Execute Docker multi-stage build (`docker build -t ucs-cm:latest .`)                           |
| - Verify standalone Node.js server startup smoke test                                             |
+---------------------------------------------------------------------------------------------------+
```

---

## 5. Architectural Decisions

### Choice 10.1: Multi-Stage Standalone Dockerfile Build
* **Decision**: Use a multi-stage Docker build utilizing Next.js `output: 'standalone'` mode within a multi-container Docker Compose deployment.
* **Alternatives Considered**: Standard Node `npm start` image build.
* **Rationale**:
  1. Reduces final Docker application container image size from ~1.2 GB to ~180 MB by trimming unnecessary `node_modules` build tools.
  2. Ensures application container starts quickly with low host RAM utilization.
* **Phase 1 Impact**: Fast deployment, light resource footprint on target Linux VM.
* **Future Implications**: Ideal for container orchestration deployment (Kubernetes / Docker Swarm) in future phases.
* **Risks**: Standalone Node builds omit public static assets unless explicitly copied in the Dockerfile; host disk volume saturation if local storage is unmonitored.
* **Mitigations**: Multi-stage Dockerfile explicitly copies static assets; host monitoring and disk usage threshold alerts configured in operational guides.
* **Product Approval Required**: Approved (Decision Point #4).
