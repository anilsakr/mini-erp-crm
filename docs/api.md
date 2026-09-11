# API Reference

Base URL (local): `http://localhost:4000/api`. All endpoints except `GET /health` and `POST /auth/login` require `Authorization: Bearer <jwt>`.

**Response envelope** (every endpoint):
```json
// success
{ "success": true, "message": "optional", "data": { ... }, "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
// failure
{ "success": false, "message": "human-readable", "error": { "code": "MACHINE_CODE", "details": null } }
```

A runnable companion covering every flow below is at `postman/MiniERPCRM.postman_collection.json`.

---

## Health

### `GET /health` — public
Returns `{ status: "ok" | "degraded", timestamp, database: "connected" | "disconnected" }`. Checks live DB connectivity via `SELECT 1`. Returns HTTP 503 if the database is unreachable.

---

## Auth

### `POST /api/auth/login` — public, rate-limited (20 req / 15 min / IP)
Body: `{ email: string, password: string }`
Success `200`: `{ token: string, user: { id, name, email, role } }`
Errors: `401 UNAUTHORIZED` (invalid credentials — same message whether the email exists or not, to avoid user enumeration), `429 RATE_LIMITED`.

### `GET /api/auth/me` — any authenticated role
Success `200`: `{ id, name, email, role }`

---

## Customers

Roles: **read** — Admin, Sales, Accounts (Warehouse has no customer access at all). **write** — Admin, Sales only.

### `GET /api/customers` — read roles
Query: `page` (default 1), `pageSize` (default 20, max 100), `search` (matches name/mobile/email/businessName), `status` (`LEAD`|`ACTIVE`|`INACTIVE`), `customerType` (`RETAIL`|`WHOLESALE`|`DISTRIBUTOR`)
Success `200`: paginated list of customers (each includes `createdBy: {id, name}`).

### `GET /api/customers/:id` — read roles
Success `200`: full customer, including `followUps[]` (each with `createdBy`), ordered newest first. `404 NOT_FOUND` if missing.

### `POST /api/customers` — write roles
Body: `{ name, mobile, email?, businessName, gstNumber?, customerType, address, status? (default LEAD), followUpDate?, notes? }`
Success `201`. Errors: `400 VALIDATION_ERROR`.

### `PUT /api/customers/:id` — write roles
Body: any subset of the create fields.
Success `200`. Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND`.

### `POST /api/customers/:id/follow-ups` — write roles
Body: `{ note: string, followUpDate?: date }`
Success `201`: the new follow-up row. This is **append-only** — it never modifies or removes a prior follow-up.

---

## Products

Roles: **read** — all four roles. **write** — Admin, Warehouse only.

### `GET /api/products` — any role
Query: `page`, `pageSize` (max 100), `search` (matches name/sku), `categoryId`, `lowStockOnly` (boolean; filters to `currentStock <= minStockAlert`)
Success `200`: paginated list, each with `category` and `warehouse` expanded.

### `GET /api/products/:id` — any role
Success `200`. `404 NOT_FOUND` if missing.

### `POST /api/products` — write roles
Body: `{ name, sku, categoryId, unitPrice (≥0), currentStock? (≥0, default 0), minStockAlert? (≥0, default 0), warehouseId }`
Success `201`. Errors: `400 VALIDATION_ERROR`, `409 DUPLICATE_SKU` if the SKU already exists.

### `PUT /api/products/:id` — write roles
Body: any subset of create fields **except `currentStock`** — stock can only change via a recorded stock movement (below).
Success `200`. Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `409 DUPLICATE_SKU`.

### `GET /api/products/:id/stock-movements` — any role
Query: `page`, `pageSize` (max 100)
Success `200`: paginated movement history for that product, newest first, each with `createdBy`.

---

## Stock Movements

Role: Admin, Warehouse only (this is the single writable path to `currentStock` outside of challan confirmation).

### `POST /api/stock-movements`
Body: `{ productId, quantityChanged (integer > 0), movementType: "IN" | "OUT", reason: string }`
Success `201`: the created movement, with `product: {id, name, sku}` expanded. The product's `currentStock` is updated atomically with the movement insert.
Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND` (product), `409 INSUFFICIENT_STOCK` if an `OUT` movement would take stock negative — e.g. `"Insufficient stock for SKU ABC-001. Available: 5, Requested: 8."` — and in that case **no** change is made to stock or the audit log.

---

## Challans

Roles: **read** — all four roles. **write** (create/edit/confirm/cancel) — Admin, Sales only.

### `GET /api/challans` — any role
Query: `page`, `pageSize` (max 100), `status` (`DRAFT`|`CONFIRMED`|`CANCELLED`), `customerId`
Success `200`: paginated list, each with `customer`, `createdBy`, and `items[]` (with `product`) expanded.

### `GET /api/challans/:id` — any role
Success `200`. `404 NOT_FOUND` if missing.

### `POST /api/challans` — write roles
Body: `{ customerId: uuid, items: [{ productId: uuid, quantity: integer > 0 }, ...] (min 1) }`
Success `201`: new challan, `status: "DRAFT"`. `challanNumber` is auto-generated (format `CH-<year>-<6-digit sequence>`). Each item is stored with a **snapshot** of the product's current name/SKU/unit price. **Stock is not touched.**
Errors: `400 VALIDATION_ERROR`, `400 CUSTOMER_NOT_FOUND`, `400 PRODUCT_NOT_FOUND` (if any `productId` doesn't exist).

### `PUT /api/challans/:id` — write roles
Body: `{ customerId?, items? }` — only permitted while status is `DRAFT` (replaces all items and recomputes totals/snapshots if `items` is provided).
Errors: `409 CHALLAN_NOT_DRAFT` if the challan is no longer a draft.

### `POST /api/challans/:id/confirm` — write roles
No body. Runs the atomic confirm transaction (see `docs/architecture.md`): validates stock for every item, and either applies all of them (decrement stock + insert an `OUT` stock movement per item + status → `CONFIRMED`) or none of them.
Success `200`: the confirmed challan.
Errors: `404 NOT_FOUND`, `409 CHALLAN_NOT_DRAFT` (already confirmed/cancelled — this is also what a double-confirm attempt returns), `409 INSUFFICIENT_STOCK` with a `details[]` array of `{ sku, available, requested }` for every short item.

### `POST /api/challans/:id/cancel` — write roles
No body. Only permitted while status is `DRAFT`.
Success `200`: the cancelled challan. Errors: `404 NOT_FOUND`, `409 CHALLAN_NOT_CANCELLABLE` if it's already Confirmed or Cancelled.

---

## Lookups

Any authenticated role. Backing data for the product form's dropdowns.

- `GET /api/lookups/categories` → `{ id, name }[]`
- `GET /api/lookups/warehouses` → `{ id, name, location }[]`

---

## Dashboard

### `GET /api/dashboard/summary` — any authenticated role
Success `200`:
```json
{
  "customers": { "total": 0, "active": 0 },
  "products": { "total": 0, "lowStock": 0 },
  "challans": { "draft": 0, "confirmed": 0, "recent": [/* up to 5 */] },
  "recentStockMovements": [/* up to 5 */]
}
```

---

## Error Codes Reference

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/query/params failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired JWT, or bad login credentials |
| `FORBIDDEN` | 403 | Authenticated, but role not permitted for this action |
| `NOT_FOUND` | 404 | Resource (customer/product/challan/user) doesn't exist |
| `ROUTE_NOT_FOUND` | 404 | No route matches the request path/method |
| `DUPLICATE_SKU` | 409 | Product SKU already exists |
| `DUPLICATE_VALUE` | 409 | Generic unique-constraint violation caught from Prisma |
| `CUSTOMER_NOT_FOUND` | 400 | Challan creation referenced a nonexistent customer |
| `PRODUCT_NOT_FOUND` | 400 | Challan creation referenced a nonexistent product |
| `CHALLAN_NOT_DRAFT` | 409 | Tried to edit/confirm a challan that isn't a Draft |
| `CHALLAN_NOT_CANCELLABLE` | 409 | Tried to cancel a challan that isn't a Draft |
| `INSUFFICIENT_STOCK` | 409 | A stock movement or challan confirmation would take stock negative |
| `RATE_LIMITED` | 429 | Too many login attempts from this IP |
| `INTERNAL_ERROR` | 500 | Unexpected server error (message is generic in production) |
