# Mini ERP + CRM Operations Portal

A small ERP/CRM system for a wholesale/distribution company: customer relationship management, product & inventory tracking, and a sales challan (delivery note) workflow with transaction-safe stock control. Built as a full-stack case study, scoped deliberately to stay understandable end-to-end by the person who built it.

## 1. Project Overview

Internal teams (Sales, Warehouse, Accounts, Admin) share one portal to manage customers, catalog/stock, and outgoing sales challans. The system enforces role-based permissions on the server, keeps a full audit trail of every stock change, and guarantees a sold item can never be oversold — even under concurrent requests.

## 2. Business Problem

A distributor currently tracks customers, stock, and sales on spreadsheets or paper challans. That breaks down in a few specific ways this project addresses:

- **No single source of truth for stock** — nothing stops two people writing down the same last unit as sold to two different customers.
- **No audit trail** — if stock is wrong, nobody can reconstruct why.
- **No historical accuracy** — if a spreadsheet price column is edited, old sales silently "change" too.
- **No access control** — anyone with the file can edit anything.

## 3. Features

- JWT authentication with 4 roles: Admin, Sales, Warehouse, Accounts.
- **Customer CRM**: create/edit/search/paginate customers, customer detail page, append-only follow-up history (never overwrites prior notes).
- **Product & Inventory**: create/edit/search/paginate products, low-stock indicator, full stock movement audit log.
- **Sales Challans**: multi-line draft challans with live totals, auto-generated challan numbers, atomic confirm-and-deduct-stock transaction, cancel-while-draft, and per-item product snapshots that never change after the fact.
- Centralized error handling with a consistent JSON envelope, request validation on every write endpoint, and structured request logging.
- Role-aware React UI — buttons/pages are hidden per role, but this is UX only; every permission is independently enforced on the backend.

## 4. Technology Stack

**Backend**: Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, JWT, bcrypt, Zod, Helmet, CORS, Pino (+ pino-http), express-rate-limit.

**Frontend**: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form + Zod resolvers, Tailwind CSS v4.

**Testing**: Vitest + Supertest (backend integration tests against a real Postgres test database).

**Tooling**: npm workspaces (no Turborepo/pnpm — one less concept to explain), ESLint, Prettier.

## 5. Architecture

```
Browser (React SPA)
    │  fetch/axios, JWT in Authorization header
    ▼
Express REST API
    │  Helmet, CORS, pino-http request logging
    ▼
Auth middleware → Role middleware → Zod validation
    ▼
Controllers (thin — parse request, call service, shape response)
    ▼
Services (ALL business logic lives here)
    ▼
Repositories (thin Prisma wrappers)
    ▼
PostgreSQL
```

A modular monolith, not microservices — see `docs/architecture.md` and `docs/system-design.md` for the full reasoning, diagrams, and evolution path if the system ever needed to scale past this.

## 6. System Workflow

The three core workflows (login, stock movement, challan lifecycle) are diagrammed with Mermaid sequence diagrams in `docs/system-design.md`. In short:

1. **Login** → JWT issued → every subsequent request carries it in `Authorization: Bearer <token>`.
2. **Stock only changes through a recorded movement** — a product's `currentStock` column is never writable directly; every change is `(product update + stock_movement insert)` in one transaction.
3. **Challans are Draft until explicitly Confirmed** — Draft never touches stock; Confirm runs one atomic transaction that validates and deducts stock for every line item or rejects the whole thing.

## 7. Database Design

PostgreSQL via Prisma. Full schema: `apps/backend/prisma/schema.prisma`. Tables:

| Table | Purpose |
|---|---|
| `users` | Login + role (enum, not a join table — see below) |
| `customers` | CRM record; `status` (Lead/Active/Inactive) drives "soft delete" instead of hard delete |
| `customer_follow_ups` | Append-only follow-up history per customer |
| `categories`, `warehouses` | Simple lookup tables backing the product form |
| `products` | Catalog + current stock + min-stock alert threshold |
| `stock_movements` | Append-only audit log of every stock change (IN/OUT, quantity, reason, who, when) |
| `challans` | Header: auto-generated number, status, totals |
| `challan_items` | Line items — **stores a product name/SKU/price snapshot**, not just a `product_id` |

**ID strategy**: every table uses a UUID primary key (`@default(uuid())`). Chosen over auto-increment integers so IDs are safe to expose in URLs (no sequential enumeration of customers/challans by guessing), at the small cost of a slightly larger index — an acceptable tradeoff at this scale.

**Why a `role` enum instead of a `roles` table**: with exactly 4 fixed roles that never change at runtime, a normalized roles/permissions table would be an unnecessary abstraction. Documented explicitly as a deliberate simplification, not an oversight — see `docs/interview-guide.md`.

**Why product snapshots**: if a product's name or price changes after a challan was created, every historical challan must still show what was actually agreed and sold at the time. `challan_items` stores `productNameSnapshot`, `skuSnapshot`, and `unitPriceSnapshot` alongside `productId` — the ID is kept only for traceability back to the current product, never for rendering the challan. See `docs/architecture.md`.

Indexes exist on every foreign key, plus `email` (login lookup), `sku`/product `name` (search), `challanNumber` and challan `status` (filtering), and customer `name`/`mobile`/`email`/`status`.

## 8. Authentication

- `POST /api/auth/login` verifies the password with `bcrypt.compare` against the stored hash and issues a JWT (`jsonwebtoken`, `HS256`, default expiry `8h`, configurable via `JWT_EXPIRES_IN`).
- The JWT payload carries `{ sub: userId, email, role }` — enough for the `authenticate` middleware to attach `req.user` without a database round trip on every request.
- No refresh tokens: a single access token that simply expires and requires re-login. Documented as a known limitation, appropriate for this scope.
- Login is rate-limited (`express-rate-limit`, 20 attempts / 15 minutes / IP) as a basic brute-force deterrent.

## 9. RBAC (Role-Based Access Control)

| Role | Customers | Products | Stock Movements | Challans |
|---|---|---|---|---|
| **Admin** | Full | Full | Full | Full |
| **Sales** | Full (create/edit/follow-ups) | Read only | Read only | Create, edit draft, confirm, cancel |
| **Warehouse** | No access | Full | Create + read | Read only |
| **Accounts** | Read only | Read only | Read only | Read only |

Enforced with two composable Express middlewares (`apps/backend/src/middleware/auth.ts`):
- `authenticate` — verifies the JWT, attaches `req.user`.
- `requireRole(...roles)` — checks `req.user.role` is in the allowed list, throws `403 FORBIDDEN` otherwise.

**The frontend also hides buttons/pages per role** (`ProtectedRoute`, `AppShell` nav filtering) purely for UX — a user should never see a button that will just 403. But this is never the security boundary; every route re-checks the role on the server regardless of what the UI shows, and the backend test suite verifies this directly (e.g. a Sales token gets `403` calling `POST /api/products`).

## 10. API Design

Full endpoint reference: **`docs/api.md`**. Runnable companion: **`postman/MiniERPCRM.postman_collection.json`**.

Every endpoint follows the same conventions: `/api/<resource>`, JWT auth (except `/health` and `/auth/login`), Zod request validation, pagination via `?page&pageSize` with a `pagination` object in the response, and a single consistent envelope:

```json
{ "success": true, "message": "...", "data": { ... }, "pagination": { ... } }
{ "success": false, "message": "...", "error": { "code": "INSUFFICIENT_STOCK", "details": [...] } }
```

## 11. Challan Business Logic

- **Draft never touches stock.** Creating/editing a challan while it's a Draft only ever reads product data to snapshot it — `currentStock` is untouched.
- **Confirm is one atomic transaction** (`apps/backend/src/services/challan.service.ts`, `confirm()`):
  1. `SELECT ... FOR UPDATE` locks the challan row (stops a double-confirm race).
  2. Re-check status is still `DRAFT` — else `409 CHALLAN_NOT_DRAFT`.
  3. `SELECT ... FOR UPDATE` locks every involved product row, **in a fixed sorted order** (prevents deadlocks between concurrent challans sharing products).
  4. Validate stock for every line item first — if *any* item is short, throw and roll back everything (`409 INSUFFICIENT_STOCK` with a per-SKU `Available/Requested` message).
  5. Only then: decrement stock, insert an `OUT` stock movement per item, flip status to `CONFIRMED`.
- **Cancel** is only permitted from `DRAFT` — a `CONFIRMED` challan has already affected stock and audit records; reversing that is out of scope (see Known Limitations).
- **Product snapshots** — see section 7.

Full concurrency reasoning (why row locks specifically, what the alternative optimistic-locking approach would have looked like and why it was rejected) is in `docs/architecture.md`.

## 12. Inventory Transaction Logic

Outside of challans, stock can be adjusted directly via `POST /api/stock-movements` (Admin/Warehouse only). This is the **only** other write path to `currentStock`, and it's transactional in the same way: lock the product row, validate the resulting quantity is non-negative, update stock and insert the movement record together, or reject with `409 INSUFFICIENT_STOCK`. A product's stock can always be reconstructed from the sum of its movement history.

## 13. Frontend Architecture

- **Routing**: React Router, with a `ProtectedRoute` wrapper that redirects unauthenticated users to `/login` and role-mismatched users to `/dashboard`.
- **Data layer**: TanStack Query for all server state (caching, loading/error states, invalidation on mutation) — no hand-rolled `useEffect` fetch logic.
- **Forms**: React Hook Form + Zod resolvers, mirroring the backend's own Zod schemas for a consistent validation story.
- **Styling**: Tailwind v4 utility classes directly in components — no separate component-library API to learn, easy to read line-by-line.
- **Shared components**: `Button`, `Input`, `Select`, `Modal`, `Table`, `Pagination`, `Badge`, `Loading`, `ErrorState`, `EmptyState`, `FormField`, `ConfirmDialog` (`apps/frontend/src/components/`).

## 14. Local Setup

Prerequisites: Node.js ≥ 20, npm, and a PostgreSQL server (local via Homebrew, or a free hosted instance like Neon — see `docs/deployment.md`).

```bash
# 1. Install all workspace dependencies
npm install

# 2. Set up a local Postgres database (macOS/Homebrew example)
brew install postgresql@16
brew services start postgresql@16
createdb mini_erp_crm_dev

# 3. Configure the backend
cp .env.example apps/backend/.env
# edit apps/backend/.env — set DATABASE_URL to your local (or hosted) Postgres connection string

# 4. Run migrations and seed demo data
npm run prisma:migrate --workspace=apps/backend
npm run prisma:seed --workspace=apps/backend

# 5. Configure the frontend
echo "VITE_API_BASE_URL=http://localhost:4000/api" > apps/frontend/.env

# 6. Run both apps (two terminals)
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

Visit `http://localhost:5173/login` and sign in with any demo account below.

## 15. Environment Variables

See `.env.example` at the repo root. Backend (`apps/backend/.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signing secret for access tokens — must be a long random string, never committed |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `PORT` | Port the API listens on |
| `FRONTEND_URL` | Exact deployed frontend origin, used for the CORS allow-list |
| `NODE_ENV` | `development` / `test` / `production` |

Frontend (`apps/frontend/.env`): `VITE_API_BASE_URL` — the backend's `/api` base URL.

No real secrets are committed anywhere in this repo; `.gitignore` excludes every `.env` file.

## 16. Docker Setup

**Deliberately not used in this project.** Docker is listed as a bonus item in the case study, not a requirement, and the goal here was to keep every part of the stack — including how the app runs locally — something the author can fully explain line-by-line in an interview without gaps. Local development instead uses a plain Homebrew-installed PostgreSQL and `npm run dev`, which is simpler to reason about for a first full-stack project and matches how the app is deployed (managed Postgres, no containers, on Render/Vercel).

If this evolves into a larger project, containerizing the backend (`Dockerfile.backend`) and adding a `docker-compose.yml` for `backend + frontend + postgres` would be a natural next step — noted in Future Improvements.

## 17. Testing

Backend only, focused on business-critical logic per the case study's explicit guidance not to pad test counts for their own sake. **23 automated tests** (`apps/backend/tests/`, Vitest + Supertest, run against a dedicated Postgres test database):

- Auth: login success/failure, unauthorized access, role rejection.
- Customers: creation, validation, RBAC, append-only follow-up history.
- Products: creation, duplicate SKU rejection, RBAC, negative-price rejection.
- Stock movements: IN increases stock, OUT beyond available stock is rejected with no partial change.
- **Challans** (the core logic): draft doesn't touch stock, confirm reduces stock atomically and records a movement, product snapshots survive later product edits, insufficient stock rejects the whole confirmation with no partial update, stock can never go negative, a challan cannot be confirmed twice, and only a draft challan can be cancelled.

Run: `npm run test --workspace=apps/backend`.

Frontend has **no automated tests** — verified instead by a full manual browser walkthrough across all 4 roles during development (documented as a known limitation, not silently skipped).

Testing pyramid this project follows: **Unit** → not heavily used here since most logic is thin service methods best tested at the integration level → **Integration** (what we have: real HTTP requests through the real Express app into a real database) → **E2E** (not implemented; would be Playwright driving the actual React UI against a running backend, listed as a future improvement).

## 18. API Documentation

Full reference: **`docs/api.md`**. Runnable collection: **`postman/MiniERPCRM.postman_collection.json`** (import into Postman, set `baseUrl`, run the "01 Authentication" → "05 Challans" folders in order — the Login requests auto-populate the `token` variable via a test script).

## 19. Deployment

Live now — deployed exactly per the runbook in **`docs/deployment.md`** (Neon for Postgres, Render for the backend, Vercel for the frontend, all free tiers):

- **Frontend**: https://mini-erp-crm-frontend-fawn.vercel.app
- **Backend**: https://mini-erp-crm-44i0.onrender.com (health check: `/health`)

Note: Render's free tier spins the backend down after inactivity, so the first request after a while can take 30–60 seconds to wake it back up — normal, not a bug.

## 20. Demo Credentials

Seeded by `apps/backend/prisma/seed.ts`. **For demonstration only — never reuse these in a real deployment.**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Password123!` |
| Sales | `sales@example.com` | `Password123!` |
| Warehouse | `warehouse@example.com` | `Password123!` |
| Accounts | `accounts@example.com` | `Password123!` |

## 21. Assumptions

- Hard delete is not offered for customers or products — they carry historical stock movements and challans; a `status` field (Lead/Active/Inactive) is the intended way to "retire" a customer, and products simply stay in the catalog. Deleting either would either orphan history or require cascade rules that risk destroying an audit trail, which conflicts with the project's core "everything is auditable" principle.
- Cancelling a challan is only allowed while it's a Draft. A Confirmed challan has already reduced stock and generated audit records; a proper "return/reversal" flow is a distinct feature, not the same as cancel, and was left out of scope rather than half-built.
- A single access token (no refresh token) is acceptable for a system this size; the UX cost is just re-logging in every 8 hours.
- The product picker in the "New Challan" form loads up to 100 products at once (the backend's pagination cap) — fine for a demo catalog, but would need a searchable/paginated picker for a catalog in the thousands.

## 22. Known Limitations

- **No Docker** — a deliberate scope cut (see section 16), not an oversight.
- **No CI/CD pipeline** — bonus item in the case study, not implemented.
- **No invoice PDF export or S3 product image upload** — both bonus items, not implemented, to avoid a half-finished feature.
- **No automated frontend tests** — manual browser verification only.
- **No refresh tokens** — single access token with a fixed expiry.
- **No automated database backups configured** — see `docs/system-design.md` for what a production setup would add.
- Render's free-tier web service cold-starts after inactivity, which affects first-request latency during a live demo (worth mentioning proactively if using the free tier for the recruiter demo).
- The product picker in the challan form isn't paginated/searchable (see Assumptions) — fine for a demo dataset, not for a large catalog.

## 23. Future Improvements

- Docker + `docker-compose.yml` for one-command local setup.
- GitHub Actions CI (lint + typecheck + test on every PR).
- Refresh tokens / shorter-lived access tokens.
- Invoice PDF export from a confirmed challan.
- Product image upload to S3.
- A proper challan "return/reversal" flow instead of cancel-only-while-draft.
- Searchable, paginated product picker in the challan builder.
- Automated frontend tests (Vitest + React Testing Library) and E2E coverage (Playwright).
- Structured application metrics/tracing (see the observability section in `docs/system-design.md`).
