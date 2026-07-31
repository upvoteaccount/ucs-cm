# UCS CM - Setup and Local Development Guide

## Overview
UCS CM is built as a TypeScript modular monolith using Next.js (App Router, standalone Node server) and PostgreSQL 16 managed by Drizzle ORM.

## Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm 10+

## Local Setup Instructions

1. **Environment Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Start Local PostgreSQL Container**:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Install Dependencies**:
   ```bash
   npm ci
   ```

4. **Generate & Run Initial Database Migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start Next.js Development Server**:
   ```bash
   npm run dev
   ```
   The application is available at `http://localhost:3000`.

6. **Verify Health Endpoint**:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Expected output:
   ```json
   {
     "status": "UP",
     "timestamp": "2026-07-31T06:00:00.000Z",
     "components": {
       "application": { "status": "UP" },
       "database": { "status": "UP", "latencyMs": 5 }
     }
   }
   ```

## Production Docker Compose Deployment

To build and run the full multi-container environment (Standalone Node App + PostgreSQL 16 + Volumes):

```bash
docker compose up --build -d
```

## Running Verification Commands

- **Lint**: `npm run lint`
- **Type Check**: `npm run type-check`
- **Unit Tests**: `npm run test`
