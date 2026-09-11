# Requirements Traceability Matrix

Maps every requirement from the case study PDF and the accompanying implementation prompt to what was actually built. Statuses are reported honestly — nothing here is claimed as done that wasn't verified.

## Authentication and Roles

| Requirement | Implementation | File/Module | Test | Status |
|---|---|---|---|---|
| JWT-based login | `bcrypt.compare` + `jsonwebtoken.sign` | `services/auth.service.ts` | `tests/auth.test.ts` | Complete |
| Password hashing | bcrypt, cost 10 | `services/auth.service.ts` | `tests/auth.test.ts` | Complete |
| Authentication middleware | Verifies JWT, attaches `req.user` | `middleware/auth.ts` (`authenticate`) | `tests/auth.test.ts` | Complete |
| Role authorization middleware | Per-route allowed-roles check | `middleware/auth.ts` (`requireRole`) | `tests/auth.test.ts`, `tests/product.test.ts`, `tests/customer.test.ts` | Complete |
| Protected APIs | Every route except `/health`, `/auth/login` | all `routes/*.ts` | all backend tests | Complete |
| Protected frontend routes | Redirects unauthenticated/wrong-role users | `components/ProtectedRoute.tsx` | Manual browser walkthrough (all 4 roles) | Complete |
| Role-aware UI | Nav + action buttons filtered per role | `components/AppShell.tsx`, all page components | Manual browser walkthrough | Complete |
| 4 roles: Admin, Sales, Warehouse, Accounts | `Role` enum | `prisma/schema.prisma` | Seed data + all backend tests | Complete |

## Customer CRM Module

| Requirement | Implementation | File/Module | Test | Status |
|---|---|---|---|---|
| Customer fields (name, mobile, email, business, GST, type, address, status, follow-up date, notes) | `Customer` model | `prisma/schema.prisma` | `tests/customer.test.ts` | Complete |
| Create customer | `POST /api/customers` | `controllers/customer.controller.ts` | `tests/customer.test.ts` | Complete |
| Edit customer | `PUT /api/customers/:id` | `controllers/customer.controller.ts` | Manual verification (curl + browser) | Complete |
| Search customer | `search` query param (name/mobile/email/business) | `repositories/customer.repository.ts` | Manual verification | Complete |
| Pagination | `page`/`pageSize` on list endpoint | `services/customer.service.ts` | Manual verification | Complete |
| Customer details page | `/customers/:id` | `pages/customers/CustomerDetailPage.tsx` | Manual browser walkthrough | Complete |
| Add follow-up notes | `POST /api/customers/:id/follow-ups` | `controllers/customer.controller.ts` | `tests/customer.test.ts` | Complete |
| View follow-up history | Follow-ups included on customer detail response | `repositories/customer.repository.ts` | `tests/customer.test.ts` | Complete |
| Follow-ups stored as history, not overwritten | Separate `customer_follow_ups` append-only table | `prisma/schema.prisma` | `tests/customer.test.ts` ("append-only history") | Complete |
| Hard delete customer | Not implemented — `status` field used instead | — | — | Not Implemented (by design — customers carry historical challans/follow-ups; deleting would orphan or destroy audit history, see README Assumptions) |

## Product and Inventory Module

| Requirement | Implementation | File/Module | Test | Status |
|---|---|---|---|---|
| Product fields (name, SKU, category, price, stock, min alert, warehouse) | `Product` model | `prisma/schema.prisma` | `tests/product.test.ts` | Complete |
| Add product | `POST /api/products` | `controllers/product.controller.ts` | `tests/product.test.ts` | Complete |
| Edit product | `PUT /api/products/:id` | `controllers/product.controller.ts` | Manual verification | Complete |
| Search product | `search` query param (name/SKU) | `repositories/product.repository.ts` | Manual verification | Complete |
| Pagination | `page`/`pageSize` on list endpoint | `services/product.service.ts` | Manual verification | Complete |
| View product details | `/products/:id` | `pages/products/ProductDetailPage.tsx` | Manual browser walkthrough | Complete |
| Stock adjustment | `POST /api/stock-movements` | `services/stockMovement.service.ts` | `tests/stockMovement.test.ts` | Complete |
| Low-stock indication | `lowStockOnly` filter + UI badge (`currentStock <= minStockAlert`) | `repositories/product.repository.ts`, `pages/products/*` | Manual browser walkthrough | Complete |
| Stock movement/audit table (product, qty, type, reason, created by, timestamp) | `StockMovement` model | `prisma/schema.prisma` | `tests/stockMovement.test.ts` | Complete |
| No direct stock manipulation without a movement record | `currentStock` excluded from `PUT /products/:id`; only changed inside the same transaction as a movement insert | `validators/product.validator.ts`, `services/stockMovement.service.ts`, `services/challan.service.ts` | `tests/stockMovement.test.ts`, `tests/challan.test.ts` | Complete |
| Hard delete product | Not implemented | — | — | Not Implemented (by design — products carry historical stock movements and challan line items) |

## Sales Challan Module

| Requirement | Implementation | File/Module | Test | Status |
|---|---|---|---|---|
| Select customer, add multiple products, quantity per product | Challan builder form | `pages/challans/ChallanFormPage.tsx`, `services/challan.service.ts` | Manual browser walkthrough | Complete |
| See product price / line totals / total quantity / total amount | Computed client-side (create) and server-side (stored) | `ChallanFormPage.tsx`, `services/challan.service.ts` | Manual browser walkthrough | Complete |
| Auto-generated challan number | Postgres sequence, format `CH-YYYY-NNNNNN` | `repositories/challan.repository.ts` (`nextChallanNumber`) | `tests/challan.test.ts` (format assertion) | Complete |
| Save as Draft | `POST /api/challans` (always creates as `DRAFT`) | `services/challan.service.ts` | `tests/challan.test.ts` | Complete |
| Confirm challan | `POST /api/challans/:id/confirm` | `services/challan.service.ts` | `tests/challan.test.ts` | Complete |
| View challan | `GET /api/challans/:id`, `/challans/:id` page | `controllers/challan.controller.ts` | Manual browser walkthrough | Complete |
| Cancel challan where permitted | `POST /api/challans/:id/cancel`, only from `DRAFT` | `services/challan.service.ts` | `tests/challan.test.ts` ("only a draft challan can be cancelled") | Complete |
| Draft does not reduce stock | No stock write in `create()` | `services/challan.service.ts` | `tests/challan.test.ts` ("does NOT reduce stock") | Complete |
| Confirm validates products/quantities/stock, prevents negative stock, reduces atomically, creates OUT movements, updates status | Full transaction in `confirm()` | `services/challan.service.ts` | `tests/challan.test.ts` (multiple cases) | Complete |
| Insufficient stock rejects confirmation, no partial update, useful error message | Row-lock + validate-before-write, per-SKU message | `services/challan.service.ts` | `tests/challan.test.ts` ("no partial update"), Postman collection | Complete |
| Product snapshot stored (not just `product_id`) | `productNameSnapshot`/`skuSnapshot`/`unitPriceSnapshot` on `ChallanItem` | `prisma/schema.prisma`, `services/challan.service.ts` | `tests/challan.test.ts` ("snapshot ... does not change") | Complete |
| Cannot confirm twice | Row-locked status re-check | `services/challan.service.ts` | `tests/challan.test.ts` ("cannot confirm the same challan twice") | Complete |

## REST API Requirements

| Requirement | Implementation | File/Module | Test | Status |
|---|---|---|---|---|
| RESTful, consistent naming | `/api/<resource>[/:id][/subresource]` throughout | `routes/*.ts` | Postman collection, `docs/api.md` | Complete |
| Input validation on every write | Zod schemas + `validate` middleware | `validators/*.ts`, `middleware/validate.ts` | all backend tests | Complete |
| Authentication + authorization | `authenticate` + `requireRole` on every route file | `middleware/auth.ts` | all backend tests | Complete |
| Proper HTTP status codes | 200/201/400/401/403/404/409/429/500 used per case | `utils/AppError.ts`, controllers | all backend tests | Complete |
| Consistent error response | `{success, message, error:{code, details}}` envelope | `middleware/errorHandler.ts` | all backend tests | Complete |
| Pagination where appropriate | Customers, Products, Challans, Stock Movements lists | respective services | Manual verification | Complete |
| Search/filter where appropriate | Customers (search/status/type), Products (search/category/lowStock), Challans (status/customer) | respective repositories | Manual verification | Complete |
| Centralized error handling | One Express error middleware | `middleware/errorHandler.ts` | all backend tests | Complete |

## Technology Stack, Architecture, Database

| Requirement | Implementation | Status |
|---|---|---|
| Node.js + TypeScript + Express + PostgreSQL + Prisma + JWT + bcrypt + Zod + dotenv + Helmet + CORS + logger | All present in `apps/backend/package.json` and wired in `app.ts` | Complete |
| React + TypeScript + Vite + React Router + TanStack Query + React Hook Form + Zod | All present in `apps/frontend/package.json` | Complete |
| Layered architecture (routes → controllers → services → repositories → DB) | Enforced directory structure, see `docs/architecture.md` | Complete |
| Normalized DB schema, PKs/FKs/unique/indexes/enums/timestamps | `prisma/schema.prisma` | Complete |
| UUID ID strategy, documented | `@default(uuid())` everywhere, rationale in README §7 | Complete |
| ER diagram | `docs/system-design.md` (Mermaid `erDiagram`) | Complete |

## Testing

| Requirement | Implementation | Status |
|---|---|---|
| Backend tests for critical business logic (13-point list in the case study: login, unauthorized access, role auth, customer/product/stock creation, draft-doesn't-reduce-stock, confirm-reduces-stock, insufficient-stock-rejects, no-negative-stock, snapshot-stored, no-double-confirm) | `apps/backend/tests/*.test.ts` — 23 tests, all passing | Complete |
| Integration tests for the challan confirmation transaction | `tests/challan.test.ts` (7 dedicated cases) | Complete |
| Frontend automated tests (Vitest + React Testing Library) | — | Not Implemented — manual browser verification only (see README Known Limitations) |
| E2E tests | — | Not Implemented (listed as a Future Improvement) |

## Documentation

| Requirement | Implementation | Status |
|---|---|---|
| README with all required sections | `README.md` | Complete |
| `docs/architecture.md` | Diagrams + transaction/snapshot rationale | Complete |
| `docs/system-design.md` | Requirements, actors, ER diagram, sequence diagrams, security/scalability/observability/deployment discussion | Complete |
| `docs/api.md` | Full endpoint reference | Complete |
| `docs/deployment.md` | Step-by-step Neon/Render/Vercel runbook + documented-only AWS option | Complete |
| `docs/interview-guide.md` | 30s/2min/5min explanations + 25 Q&A | Complete |
| `docs/demo-script.md` | 13-step recruiter demo | Complete |
| Postman collection | `postman/MiniERPCRM.postman_collection.json`, verified with `newman run` (24 requests, 0 failures) | Complete |
| This traceability matrix | `docs/requirements-traceability.md` | Complete |

## Bonus / Explicitly Descoped Items

| Requirement | Status | Rationale |
|---|---|---|
| Docker + docker-compose | Not Implemented | Deliberate scope cut — bonus item in the case study, and the candidate wanted every part of the stack (including local dev setup) to be something they can personally explain without gaps. See README §16. |
| GitHub Actions CI/CD | Not Implemented | Bonus item, listed as a Future Improvement |
| Export invoice as PDF | Not Implemented | Bonus item, listed as a Future Improvement |
| Upload product image to AWS S3 | Not Implemented | Bonus item, listed as a Future Improvement |
| AWS deployment | Not Implemented (documented only) | Case study treats AWS as optional/bonus and explicitly says not to spend money; free-tier deployment (Neon/Render/Vercel) used instead. AWS architecture is documented in `docs/system-design.md`. |
