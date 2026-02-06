# Backend Bootstrap Plan for HomeManager

This guide turns your current frontend prototype into a production-ready app in focused phases.

## 1) Define the target outcome (first)

Before coding the backend, define what “working app” means for v1:

- Multi-user login and sessions
- Cloud-hosted shared data (not browser localStorage)
- Role-based access (property manager, landlord, tenant)
- Reliable CRUD for properties, units, tenants, leases, payments, maintenance
- Basic observability (logs + error tracking)

Keep v1 intentionally narrow. Ship core flows first, then optimize.

## 2) Pick an opinionated backend stack

Recommended for speed and maintainability:

- **Runtime/API**: Node.js + Fastify (or Express)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT access + refresh token rotation (HTTP-only cookies)
- **Validation**: Zod
- **Deployment**: Railway/Render/Fly + managed Postgres

If you want even faster auth setup, use Supabase Auth and focus on business APIs.

## 3) Model your domain from existing frontend data

Use your current frontend data shape as the v1 schema source-of-truth:

Core entities:

- users
- profiles
- properties
- units
- tenants
- leases
- payments
- unit_features
- maintenance
- maintenance_history
- vendors
- preventive_tasks
- notifications

Key relationships:

- property has many units
- unit has many tenants/leasing records/maintenance items/features
- lease belongs to one tenant + one unit
- payments belong to lease

## 4) Build in vertical slices (not by layers)

### Slice A: Auth + users

- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`
- POST `/auth/reset-password` (can be phase 2)

Done criteria:

- Password hashing enabled
- Session refresh works
- Frontend login/signup flow uses API

### Slice B: Portfolio core

- GET/POST/PATCH/DELETE `/properties`
- GET/POST/PATCH/DELETE `/units`

Done criteria:

- Sidebar + properties pages use backend data
- Basic authorization checks in place

### Slice C: Occupancy + cashflow

- Tenants CRUD
- Leases CRUD
- Generate monthly payments from lease
- Payment status updates

Done criteria:

- Lease creation updates occupancy state safely
- Dashboard rent metrics read from API

### Slice D: Operations

- Maintenance CRUD + status transitions
- Vendors CRUD
- Preventive tasks CRUD
- Notifications feed endpoint

Done criteria:

- Unit maintenance tab fully backend-powered

## 5) API design rules (to prevent rework)

- Version endpoints: `/api/v1/...`
- Return consistent envelopes:
  - success: `{ data, meta? }`
  - error: `{ error: { code, message, details? } }`
- Support pagination + filtering for lists from day 1
- Use UTC timestamps in ISO format
- Add idempotency key for actions like payment generation

## 6) Security checklist (baseline)

- Hash passwords with argon2 or bcrypt
- HTTP-only secure cookies for refresh token
- CORS allowlist
- Rate limit login/password reset endpoints
- Validate all request bodies with schema validation
- Enforce role/resource-level authorization on every write route
- Audit fields: `created_at`, `updated_at`, `created_by`

## 7) Migration from localStorage to database

Run as one-time scripts:

1. Export localStorage JSON (`hm_users_v1`, `hm_data_v1`)
2. Validate with migration schema
3. Upsert in dependency order:
   - users/profiles
   - properties/units
   - tenants/leases/payments
   - maintenance/vendor/preventive/notifications
4. Produce migration report (counts + failures)

## 8) Developer workflow to start this week

### Day 1

- Scaffold backend project
- Configure DB + ORM migrations
- Add linting, formatting, test runner

### Day 2

- Implement auth routes and middleware
- Add user/profile tables + seeds

### Day 3

- Implement properties + units APIs
- Integrate frontend for these two modules only

### Day 4–5

- Implement tenants + leases + payments
- Add lease->payment generation service

### Day 6

- Implement maintenance + vendors endpoints
- Integrate maintenance tab

### Day 7

- Add dashboard summary endpoint
- Add logs, error handling, smoke tests
- Deploy staging

## 9) Team operating model (important)

Treat this as two tracks in parallel:

- **Track 1 (Product/UX):** finalize workflows, error states, empty states
- **Track 2 (Platform/API):** auth, persistence, authorization, domain logic

Every PR should include:

- API contract change (if any)
- frontend integration impact
- test evidence
- migration impact

## 10) First concrete deliverables you should create now

1. `backend/` project skeleton
2. `openapi.yaml` for v1 auth + properties + units
3. initial SQL/Prisma migration
4. `docs/architecture.md` with module boundaries
5. `docs/decision-log.md` for ADR-style choices

---

If you execute in this order, you will ship a usable backend quickly without destabilizing your already-strong frontend.
