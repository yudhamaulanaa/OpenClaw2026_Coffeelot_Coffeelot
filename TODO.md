# Coffeelot — Active Tasks

## Current Focus: Milestone 5 — DOKU Payment Hardening + Deployment

- [x] Create milestone branch: `feat/milestone-2-database-foundation`
- [x] Setup monorepo workspace config (Bun workspace)
- [x] Create `.env.example`
- [x] Create Prisma schema (SQLite) — all tables from `docs/DATABASE-SCHEMA.md`
- [x] Run migration
- [x] Create seed data (tenant, outlet, user, products, inventory, recipes, sample orders)
- [x] Define shared types in `packages/shared`
- [x] Verify database setup with seed + basic Prisma query

## Up Next: Milestone 3 — Backend Foundation

- [x] Setup Elysia.js server
- [x] Database client (Prisma + SQLite)
- [x] Tenant context middleware
- [x] Product service + endpoints
- [x] Inventory service + endpoints
- [x] Order service + endpoints
- [x] Stock engine
- [x] Invoice generator
- [x] Reports endpoints

## Milestone 4 — Built-in POS / Order Channels

- [x] Product grid UI
- [x] Cart management
- [x] Manual cart/custom item input
- [x] Checkout flow
- [x] Receipt preview
- [x] Kitchen/barista queue UI
- [x] Prep status API: new → preparing → ready → completed
- [x] QR order link generator
- [x] Chat cart session model/API
- [x] Self-order via chat MVP flow
- [x] Route chat orders into POS + kitchen queue

## Milestone 5 — DOKU Payment Integration

### Foundation / Sandbox Placeholder

- [x] Setup DOKU payment foundation placeholder (sandbox-compatible API contract)
- [x] QRIS payment generation placeholder
- [x] Virtual Account payment placeholder
- [x] Payment status checking endpoint
- [x] Payment webhook/callback endpoint
- [x] Payment UI di POS checkout

### Deployment / Public Access

- [x] Configure Nginx Proxy Manager for `coffeelot.app` web app
- [x] Configure Nginx Proxy Manager for `api.coffeelot.app` API
- [x] Issue and attach SSL certificates for root and API domains
- [x] Fix frontend production API base URL to `https://api.coffeelot.app/api`
- [x] Add API CORS support for `https://coffeelot.app`

### Real DOKU Hardening

- [ ] Collect DOKU sandbox credentials/config
- [ ] Replace sandbox placeholder with real DOKU MCP/API calls
- [ ] Add callback signature/security validation
- [ ] Payment confirmation → order paid + stock deduction transaction
- [ ] Verify sandbox end-to-end payment flow

## Later

- [ ] Milestone 6 — AI Agent Core
- [ ] Milestone 7 — Agent Workflows
- [ ] Milestone 8 — POS Connector

## Blocked

None.
