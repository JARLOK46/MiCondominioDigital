# MiCondominioDigital

SaaS multi-tenant para la administración de condominios.

## Phase 1

This repository currently bootstraps the backend foundation for authentication, tenant isolation, plans, subscriptions, and desktop entitlements.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+

## Commands

```bash
pnpm install
pnpm dev
pnpm test
```

Copy `.env.example` to `.env` and configure the database and token secrets before starting the API.
