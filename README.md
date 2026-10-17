# LotBazaar App

Web frontends for **LotBazaar**, a multi-tenant B2B platform where liquidators sell branded apparel and footwear dead stock to verified retailers in lots of 100 to 1,000+ mixed pieces.

This repository holds two Next.js apps in one npm workspace. The API they call lives in [lotbazaar-service](https://github.com/zilicstech/lotbazaar-service).

| App | Port | For |
|---|---|---|
| `apps/seller-console` | 3001 | The liquidator's staff: owner, warehouse and sales. Also the warehouse screens (scan, putaway, pick, pack) |
| `apps/buyer-web` | 3000 | Retailers: register, browse a seller's storefront, buy or make offers, pay, track orders, raise claims |

## Tech stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, `jsbarcode` for carton labels.

## Run locally

Start the backend first (see the lotbazaar-service README); it serves the API on `http://localhost:8080`. Then, with Node 24:

```bash
npm install
npm run dev --workspace @lotbazaar/seller-console   # http://localhost:3001
npm run dev --workspace @lotbazaar/buyer-web        # http://localhost:3000
```

Both apps proxy `/api/*` to the backend, so the browser only talks to its own origin. Set `API_URL` to point at another backend (default `http://localhost:8080`).

Other scripts, run from the repository root: `npm run lint` and `npm run build` (both apps).

### Demo logins

With the backend's `demo` profile, the seller login page has one-click buttons for Owner, Warehouse, Sales and a second company. The buyer login form is pre-filled with an approved buyer. Accounts:

| Account | App | Role |
|---|---|---|
| `owner@rk.demo` | Seller | Owner: everything, including costs, dashboard and claims |
| `warehouse@rk.demo` | Seller | Warehouse: dock check, sorting, labels, putaway, pick, pack, dispatch |
| `sales@rk.demo` | Seller | Sales: lots, photos, listing, buyers, offers, orders |
| `owner@acme.demo` | Seller | Owner of a second tenant, to show isolation |
| `buyer@shop.demo` | Buyer | Approved, Jaipur (gets IGST) |
| `delhi@shop.demo` | Buyer | Approved, Delhi (gets CGST + SGST) |
| `newbuyer@shop.demo` | Buyer | Pending approval by the seller |

All demo accounts share one password, defined in the backend's `DemoDataSeeder.java`.

## The workflow

The seller console's **How it works** page (`/guide`) walks through these steps.

| # | Step | Who | Screen |
|---|---|---|---|
| 1 | Record container arrival with packing list and landed cost | Owner | Containers |
| 2 | Dock check: bales and weight against the packing list | Warehouse | Container page |
| 3 | Sort into cartons and print barcode labels | Warehouse | Container page, Labels |
| 4 | Finish sorting | Warehouse | Container page |
| 5 | Putaway: scan carton, then bin | Warehouse | Putaway |
| 6–7 | Build a lot, add photos, list with a Buy Now price and an optional offer floor | Sales | Lots |
| 8 | Approve new buyers | Sales | Buyers |
| 9a | Buy Now: lot held 15 minutes, checkout with GST | Buyer | Buyer site |
| 9b | Make an offer; seller accepts or counters; lot held 24 hours | Buyer, Sales | Buyer site, Offers |
| 10 | Pay (mock gateway; can simulate a failed payment) | Buyer | Pay page |
| 11–13 | Pick by scanning each carton at its bin, pack and weigh, dispatch with GST invoice and e-way bill | Warehouse | Pick, pack & dispatch |
| 14–15 | Confirm delivery; close, or raise a claim within 72 hours | Buyer | My orders |
| 16 | Settle the claim with a credit, or reject it | Owner | Claims |
| 17 | Recovery % per container, stock age, order pipeline, ledger check | Owner | Dashboard |

## Project layout

```
apps/seller-console/
  app/            One folder per screen: dashboard, guide, containers, labels, putaway, inventory,
                  lots, buyers, offers, orders, fulfil, invoice, claims, login
  components/     Shell (role-based navigation), shared UI, GST invoice view
  lib/            API client and session, shared types, workflow steps and role labels
apps/buyer-web/
  app/            Home, login, register, and store/[code]/: lot list, lot page, checkout, pay,
                  orders, order detail, offers, invoice
  components/     Header, shared UI, GST invoice view
  lib/            API client and session, shared types, countdown hook for holds
```

Navigation in the seller console is filtered by role: warehouse staff never see costs, buyers or prices beyond the invoice.

## Notes

- Sessions are kept in `localStorage`; a 401 from the API signs the user out.
- `components/ui.tsx`, `components/InvoiceView.tsx` and `lib/types.ts` are duplicated between the two apps. Move them to a shared workspace package when they start to diverge.
- There is no frontend test suite yet; the end-to-end behaviour is covered by the backend's integration tests.
