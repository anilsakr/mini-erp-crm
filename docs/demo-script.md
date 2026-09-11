# Recruiter Demo Script (~10 minutes)

Assumes the seeded demo data from `prisma/seed.ts` (see README "Demo Credentials"). All passwords: `Password123!`.

### Step 1 — Login as Sales
Go to `/login`, sign in as `sales@example.com`. Point out: role-aware navigation — Sales sees Customers, Products, Challans, Profile.

### Step 2 — Open the Dashboard
Show the stat cards (total/active customers, total products, low-stock count, draft/confirmed challans) and the two recent-activity panels. Mention this is intentionally simple — a few counts and recent lists, not speculative analytics.

### Step 3 — Create a Customer
Go to Customers → Add Customer. Fill in a new customer, save. Land on the detail page — point out the follow-up section is empty. Add a follow-up note, then add a second one. Both remain visible — this is the append-only history table (`customer_follow_ups`), not a single overwritable notes field.

### Step 4 — Open Products
Go to Products. Point out the low-stock filter checkbox and that **Wireless Mouse (SKU `ELEC-002`)** is intentionally seeded with very low stock — this is the product used for the oversell demo in Step 10.

### Step 5 — Show Inventory Detail
Open the Wireless Mouse product detail page. Show its stock movement history (IN from initial seed, OUT from prior confirmed challans). As Sales, note there's no "Stock Adjustment" panel here — that's Warehouse/Admin only (shown in Step 11).

### Step 6 — Create a Sales Challan
Go to Challans → New Challan. Select a customer.

### Step 7 — Add Two Products
Add two line items (e.g. USB-C Cable and A4 Notebook), set quantities. Point out the live unit price lookup and running line totals / grand total as you type — all computed client-side for instant feedback, using the same price the backend will snapshot.

### Step 8 — Save as Draft, Show Stock Unchanged
Click "Save as Draft." Land on the challan detail page, status `DRAFT`. Open one of the products you just added in a new tab (or note its current stock) — **stock has not moved.** This is Rule 1: a Draft never touches inventory.

### Step 9 — Confirm the Challan
Back on the challan detail page, click "Confirm Challan," confirm the dialog. Show:
- Status flips to `CONFIRMED`.
- Re-open the product page — stock has decreased by exactly the confirmed quantity.
- Its stock movement history has a new `OUT` row referencing this challan number.

### Step 10 — Attempt to Oversell
Create a new challan for **Wireless Mouse (`ELEC-002`)** requesting more units than are currently in stock. Save as Draft, then Confirm. Show the exact error surfaced from the API: *"Insufficient stock for SKU ELEC-002. Available: X, Requested: Y."* The challan remains `DRAFT` — nothing was partially applied, and you can edit or cancel it.

### Step 11 — Login as Warehouse
Log out, sign in as `warehouse@example.com`. Note the nav no longer shows Customers at all. Open a product — this role *does* see the "Stock Adjustment" panel. Record a small IN movement and show it appear immediately in the stock movement history.

### Step 12 — Login as Accounts
Log out, sign in as `accounts@example.com`. Show Customers, Products, and Challans are all visible (read access) but every "Add"/"Edit"/"Confirm"/"Cancel" action is absent from the UI. If time allows, mention this is enforced independently on the backend too — hitting `POST /api/customers` with an Accounts token returns `403` regardless of what the UI shows.

### Step 13 — Explain the Architecture
Close with the 2-minute explanation from `docs/interview-guide.md`: React → Express → service layer → Prisma → PostgreSQL, and the one sentence that matters most — *"confirming a challan is one atomic transaction that locks the relevant rows, so two people can never oversell the same stock."*
