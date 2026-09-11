# Interview Guide

This is written for the person who built this project to prepare for defending it live in a technical interview. Every answer below should be something you could say out loud, in your own words, without notes.

## 30-Second Explanation

"I built a mini ERP/CRM portal for a wholesale distributor — it handles customers, product inventory, and sales challans, with four role-based logins: Admin, Sales, Warehouse, and Accounts. The interesting engineering part is the sales challan workflow: confirming a sale runs inside a database transaction that locks the relevant rows so two people can never oversell the same stock, even if they click confirm at the exact same time."

## 2-Minute Explanation

**Business problem**: a distributor tracking customers, stock, and sales on spreadsheets has no single source of truth, no audit trail for stock changes, and no access control.

**Architecture**: a React frontend talks to an Express REST API over JSON, which uses Prisma to talk to PostgreSQL. It's a "modular monolith" — one deployable backend, but internally split into clean layers (routes → controllers → services → repositories) so business logic never leaks into HTTP-handling code.

**Technology**: TypeScript everywhere, Prisma for type-safe database access, JWT for stateless auth, Zod for validation on both ends, Tailwind for styling, TanStack Query for frontend data fetching.

**Main workflows**: log in and get a role; manage customers with a full follow-up history; manage products and see low-stock warnings; build a sales challan as a Draft (which doesn't touch stock yet), then Confirm it, which does.

**One important business rule**: confirming a challan is one atomic database transaction — it locks the product rows being sold, checks every item has enough stock, and either applies the entire sale or rejects the entire thing. That's what makes "can't oversell, even under concurrency" actually true instead of just assumed.

## 5-Minute Architecture Explanation

Walk through the diagram in `docs/architecture.md`:

1. **Frontend** — React SPA, holds a JWT after login, attaches it to every request.
2. **API layer** — Express routes wire an HTTP verb+path to middleware and a controller. Nothing else happens here.
3. **Middleware** — three things run in order on protected routes: `authenticate` (verify JWT, attach `req.user`), `requireRole` (check the role is allowed), `validate` (Zod-check the request shape). Each is independently testable.
4. **Controllers** — thin. Parse the request, call one service method, shape the response. If you find yourself writing an `if` statement about business rules in a controller, it belongs in the service instead.
5. **Services** — this is where all the logic lives: the challan confirmation transaction, the stock movement's insufficient-stock check, the customer follow-up history logic.
6. **Repositories** — thin wrappers around Prisma queries, one file per entity, so services don't call `prisma.customer.findMany` directly scattered everywhere.
7. **Database** — PostgreSQL, accessed only through Prisma (parameterized, type-safe), with one raw-SQL exception: the `SELECT ... FOR UPDATE` row-locking queries in the challan confirm transaction, because Prisma's high-level API doesn't expose row locking directly.

---

## Technical Q&A

### 1. Why React?
**Simple**: it's the most widely used frontend library, and component-based UIs match how this app's screens naturally break down (a customer list, a customer form, a challan builder).
**Technical**: React's declarative rendering plus a mature ecosystem (React Router, TanStack Query, React Hook Form) meant I could focus on business logic instead of building routing or data-fetching primitives myself.
**Example**: `ProtectedRoute` + `AppShell` compose cleanly as nested routes to handle auth guarding and layout without duplicating logic per page.

### 2. Why Node.js?
**Simple**: same language (TypeScript) on frontend and backend, so I only need to context-switch once, not between two ecosystems.
**Technical**: Node's non-blocking I/O model suits an API that's mostly waiting on database queries, and Express is lightweight enough to make the layering explicit rather than hidden behind a heavier framework's conventions.
**Example**: the whole backend, including the transaction-heavy challan service, is plain async/await TypeScript — no separate runtime or language to reason about.

### 3. Why TypeScript?
**Simple**: it catches a whole category of bugs (wrong field names, wrong types) before the code ever runs.
**Technical**: with Prisma generating types from the schema, and Zod inferring types from validators, I get one source of truth for a shape (e.g. a `Customer`) that flows through repository → service → controller → (duplicated by hand, intentionally, on the frontend) without manual re-declaration drifting out of sync.
**Example**: if I rename a field in `schema.prisma` and regenerate the Prisma client, every place that used the old field name fails to compile immediately, instead of failing silently at runtime in production.

### 4. Why PostgreSQL?
**Simple**: it's a reliable, widely-used relational database, and this data is inherently relational (customers have many follow-ups, challans have many items, products have many stock movements).
**Technical**: I specifically need row-level locking (`SELECT ... FOR UPDATE`) and multi-statement transactions to make the challan confirmation safe under concurrency — Postgres supports both cleanly, and Prisma has first-class support for it.
**Example**: the entire "no overselling" guarantee is built on Postgres's `FOR UPDATE` row locks inside a transaction.

### 5. Why Prisma?
**Simple**: it lets me write database queries as TypeScript function calls instead of raw SQL strings, with autocomplete and type-checking.
**Technical**: Prisma generates a fully-typed client from the schema, handles migrations, and still lets me drop down to raw parameterized SQL (`$queryRaw`) for the one thing it doesn't abstract well — explicit row locking.
**Example**: `prisma.challan.findMany({ include: { items: { include: { product: true } } } })` versus hand-writing that join in SQL and mapping the result myself.

### 6. Why JWT?
**Simple**: it's a self-contained token that proves who you are without the server needing to remember you — like a signed ID badge.
**Technical**: JWT lets the API stay stateless (no server-side session store), which simplifies horizontal scaling later, at the cost of not being able to instantly revoke a token before it expires (mitigated here by a short-ish 8-hour expiry).
**Example**: `authenticate` middleware just verifies the signature and reads `{sub, email, role}` out of the token — no database lookup needed on every request.

### 7. How does authentication work?
**Simple**: you log in with email/password, the server checks it and gives you a signed token, and you send that token with every future request.
**Technical**: `POST /auth/login` looks up the user by email, compares the password against the stored bcrypt hash, and if it matches, signs a JWT containing the user's id/email/role. The frontend stores it and attaches `Authorization: Bearer <token>` via an axios interceptor on every request.
**Example**: `apps/backend/src/services/auth.service.ts` → `login()`.

### 8. How does RBAC work?
**Simple**: each user has exactly one role, and each API action lists which roles can do it.
**Technical**: `requireRole(...roles)` is an Express middleware factory — you call it per-route with the allowed roles, and it throws `403` if `req.user.role` isn't in that list. It composes with `authenticate` (which must run first to populate `req.user`).
**Example**: `customerRouter.post('/', requireRole(Role.ADMIN, Role.SALES), validate(createCustomerSchema), customerController.create)`.

### 9. Where is authorization enforced?
**Simple**: on the server, always — never just by hiding a button in the UI.
**Technical**: every route file wires `requireRole` explicitly per-endpoint. The frontend also hides buttons/routes per role, but that's purely UX; the backend test suite directly verifies a disallowed role gets `403` even when calling the API directly (bypassing the UI entirely).
**Example**: `tests/auth.test.ts` — "enforces role authorization: a SALES user cannot create a product" hits the API with a valid Sales token and expects `403`.

### 10. Why use a service layer?
**Simple**: it keeps "what does this button do" (controller) separate from "how do we correctly do it" (service), so the logic isn't tangled up with HTTP concerns.
**Technical**: it also makes business logic independently testable and reusable — the same `challanService.confirm()` could be called from a future CLI script or scheduled job without duplicating the transaction logic.
**Example**: `ChallanController.confirm` is three lines; `ChallanService.confirm` is the entire locking/validation/transaction logic.

### 11. How do you prevent negative stock?
**Simple**: every place that reduces stock checks there's enough first, inside the same database transaction that makes the change — so the check can't go stale between checking and writing.
**Technical**: both the stock-movement service and the challan confirm service lock the product row (`FOR UPDATE`) before reading its current stock, validate the resulting quantity would be ≥ 0, and only then write — all inside one `prisma.$transaction`.
**Example**: attempting to record an OUT movement or confirm a challan for more than what's in stock returns `409 INSUFFICIENT_STOCK` and changes nothing.

### 12. What happens if two users confirm challans simultaneously?
**Simple**: whichever request gets there first wins; the second one waits, then correctly sees the updated (lower) stock and fails if there's no longer enough.
**Technical**: both transactions try to `SELECT ... FOR UPDATE` the same product row. Postgres grants the lock to one and blocks the other until the first commits or rolls back. The second transaction then re-reads the now-current stock under its own lock — it never operates on stale data.
**Example**: this exact scenario is testable manually by firing two `confirm` requests for challans that both need the last unit of a low-stock product — only one succeeds.

### 13. Why use database transactions?
**Simple**: so a multi-step change either fully happens or fully doesn't — never half-done.
**Technical**: confirming a challan touches multiple tables (products, stock_movements, challans). Without a transaction, a crash or error partway through could leave stock decremented but the challan still marked Draft, or vice versa — an inconsistent state that's hard to detect and fix later.
**Example**: if the insufficient-stock check fails on the *second* item in a 5-item challan, nothing from items 1–5 is applied — the whole transaction rolls back.

### 14. Why store product snapshots?
**Simple**: so old sales records don't silently change if you edit a product later.
**Technical**: `challan_items` denormalizes `productName`, `sku`, and `unitPrice` at the moment the challan is created, instead of relying on a live join to `products`. This trades a small amount of duplicated data for historical accuracy.
**Example**: `tests/challan.test.ts` — "stores a product snapshot that does not change if the product is edited afterwards" creates a challan, then renames/reprices the product, then confirms the challan still shows the original name and price.

### 15. What happens if product price changes?
**Simple**: nothing happens to past challans — they keep showing the price at the time of sale.
**Technical**: the price is only read from `products.unitPrice` at challan-creation time, copied into `challan_items.unitPriceSnapshot`. Later changes to `products.unitPrice` have zero effect on any existing `challan_items` row, since there's no live foreign-key dependency at render time.
**Example**: see test #14 above — same mechanism.

### 16. How do you handle validation?
**Simple**: every request's shape is checked before any business logic runs, and the same rules exist on both the frontend (for instant feedback) and backend (for actual enforcement).
**Technical**: Zod schemas per-endpoint (`src/validators/*.ts`) run in a `validate` middleware before the controller; the frontend uses the same idea (albeit a hand-mirrored schema) via React Hook Form's `zodResolver`. Validation failures return `400 VALIDATION_ERROR` with field-level details.
**Example**: creating a product with a negative `unitPrice` is rejected before the service or database ever sees it.

### 17. How do you handle errors?
**Simple**: every error, expected or not, goes through one place and comes back in the same shape, so the frontend only ever needs to check one thing: `success: false` and read `message`.
**Technical**: a custom `AppError` class carries a status code + machine-readable code; services throw it directly. A single Express error-handling middleware catches `AppError`, `ZodError`, known Prisma errors, and anything else, and formats all of them into `{success, message, error:{code, details}}`. Unexpected errors are logged server-side (Pino) but never leak internals to the client in production.
**Example**: `INSUFFICIENT_STOCK` and `VALIDATION_ERROR` look identical in shape to the frontend, just with different codes/messages.

### 18. How do you paginate APIs?
**Simple**: list endpoints take a page number and page size, and tell you how many pages exist in total.
**Technical**: `parsePagination`/`buildPaginationMeta` helpers standardize `?page&pageSize` parsing (capped at 100 per page) and the `{page, pageSize, total, totalPages}` response shape across every list endpoint (customers, products, challans, stock movements).
**Example**: `GET /api/customers?page=2&pageSize=10`.

### 19. How would you scale this system?
**Simple**: the API itself can just be run on more servers, since it doesn't remember anything between requests; the database would need more thought.
**Technical**: JWT auth means the backend is stateless, so horizontal scaling behind a load balancer is a deployment change, not a code change. The database would be the actual bottleneck — read replicas for list/search traffic, connection pooling, and (if one specific product became an extreme write hot-spot under the row-locking scheme) a queue-based reservation system ahead of the transaction.
**Example**: see "Scalability" in `docs/system-design.md`.

### 20. How would you deploy it on AWS?
**Simple**: I documented an AWS design (Route 53 → CloudFront → S3 for the frontend, and ALB → ECS/Fargate → RDS for the backend) but didn't actually deploy there, since it's optional for this project and costs money.
**Technical**: see the AWS architecture diagram in `docs/system-design.md` — each piece (WAF, Secrets Manager, CloudWatch) is explained there.
**Example**: the app actually deploys to Vercel + Render + Neon (all free), documented in `docs/deployment.md`.

### 21. How would you monitor it?
**Simple**: right now there's a health check and structured logs; in production I'd add dashboards and alerts.
**Technical**: `/health` checks DB connectivity; Pino/pino-http gives structured JSON logs (method, path, status, duration) with secrets redacted. A production setup would add CloudWatch or a hosted log sink, OpenTelemetry tracing, and Prometheus/Grafana metrics with alerting on error rate and latency.
**Example**: see "Observability" in `docs/system-design.md`.

### 22. How would you improve security?
**Simple**: add refresh tokens, account lockout after failed logins, and a secrets manager instead of plain environment variables.
**Technical**: currently there's no refresh-token rotation (single access token, 8h expiry), no per-account lockout (only IP-based rate limiting on login), and secrets live in environment variables rather than something like AWS Secrets Manager. All are honestly listed in Known Limitations rather than glossed over.
**Example**: `docs/system-design.md` → "Security" section lists exactly what's implemented and what's explicitly not.

### 23. How would you handle database backup?
**Simple**: not implemented here; in production I'd turn on automated backups from day one.
**Technical**: managed Postgres providers (Neon, RDS) offer automated daily backups and point-in-time recovery as a configuration toggle, not custom code. I'd also test a restore at least once before calling it "done."
**Example**: see "Backup and Recovery" in `docs/system-design.md`.

### 24. How would you implement invoice generation?
**Simple**: it's a bonus feature I didn't build, but I know how I'd approach it.
**Technical**: I'd add a `GET /api/challans/:id/invoice.pdf` endpoint that renders the confirmed challan's stored snapshot data (never a live product lookup, for the same historical-accuracy reason as the challan itself) through a PDF library like `pdfkit` or `@react-pdf/renderer`, streamed directly in the response.
**Example**: listed under Future Improvements in the README — deliberately not attempted, to avoid shipping something half-finished.

### 25. What are the current limitations?
See the README's "Known Limitations" section in full. Top ones to be ready to say out loud: no Docker (deliberate, not an oversight), no CI/CD, no refresh tokens, no automated frontend tests, no invoice export, no automated backups, and the product picker in the challan form isn't paginated for very large catalogs.
