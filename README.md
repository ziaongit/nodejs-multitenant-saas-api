# nodejs-multitenant-saas-api

Production-ready multi-tenant REST API built with Node.js, Express, PostgreSQL, and Redis.

Companion code for the freeCodeCamp article: **How to Build a Multi-Tenant SaaS API with Node.js, RBAC, and Audit Logging**

## What this covers

- **Tenant isolation** — every DB query filters by `tenant_id` from the verified JWT
- **RBAC** — four roles (SuperAdmin, TenantAdmin, Member, Viewer) enforced by middleware
- **Audit logging** — append-only table, role captured at action time
- **Per-tenant rate limiting** — plan-based thresholds using Redis, keyed on `tenant_id` not IP
- **Isolation tests** — automated tests that prove cross-tenant data leakage is impossible

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Run the database schema
psql -U your_user -d your_database -f schema.sql

# Start the server
npm start
```

## File structure

```
nodejs-multitenant-saas-api/
├── schema.sql                        # PostgreSQL schema
├── app.js                            # Express app setup
├── server.js                         # Entry point
├── db/
│   ├── index.js                      # PostgreSQL connection pool
│   └── redis.js                      # Redis client
├── src/
│   ├── utils/
│   │   └── token.js                  # JWT generate/verify
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification + tenant extraction
│   │   ├── rbac.js                   # Role enforcement
│   │   └── rateLimiter.js            # Per-tenant Redis rate limiter
│   ├── services/
│   │   └── auditService.js           # Append-only audit logger
│   ├── repositories/
│   │   └── projectRepo.js            # Tenant-safe DB queries
│   └── routes/
│       └── projects.js               # Route handlers
└── tests/
    └── tenantIsolation.test.js       # Tenant isolation tests
```

## API endpoints

All endpoints require a `Bearer <JWT>` Authorization header.

| Method | Path | Min role | Description |
|--------|------|----------|-------------|
| GET | /api/projects | Viewer | List all projects for the tenant |
| GET | /api/projects/:id | Viewer | Get a single project |
| POST | /api/projects | Member | Create a project |
| PUT | /api/projects/:id | Member | Update a project |
| DELETE | /api/projects/:id | TenantAdmin | Delete a project |

## Running tests

Tests require a live PostgreSQL connection (uses `DATABASE_URL` from `.env`).

```bash
npm test
```

## License

MIT
