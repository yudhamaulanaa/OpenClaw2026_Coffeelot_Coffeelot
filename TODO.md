# Coffeelot — Active Tasks

## Current Focus: Milestone 2 — Database Foundation

- [x] Create milestone branch: `feat/milestone-2-database-foundation`
- [x] Setup monorepo workspace config (Bun workspace)
- [x] Create `.env.example`
- [x] Create Prisma schema (SQLite) — all tables from `docs/DATABASE-SCHEMA.md`
- [x] Run migration
- [x] Create seed data (tenant, outlet, user, products, inventory, recipes, sample orders)
- [ ] Define shared types in `packages/shared`
- [ ] Verify database setup with seed + basic Prisma query

## Up Next: Milestone 3 — Backend Foundation

- [ ] Setup Elysia.js server
- [ ] Database client (Prisma + SQLite)
- [ ] Tenant context middleware
- [ ] Product service + endpoints
- [ ] Inventory service + endpoints
- [ ] Order service + endpoints
- [ ] Stock engine
- [ ] Invoice generator
- [ ] Reports endpoints

## Milestone 4 — Built-in POS / Order Channels

- [ ] Product grid UI
- [ ] Cart management
- [ ] Manual cart/custom item input
- [ ] Checkout flow
- [ ] Receipt preview
- [ ] Kitchen/barista queue UI
- [ ] Prep status API: new → preparing → ready → completed
- [ ] QR order link generator
- [ ] Chat cart session model/API
- [ ] Self-order via chat MVP flow
- [ ] Route chat orders into POS + kitchen queue

## Milestone 5 — DOKU Payment Integration

- [ ] Setup DOKU MCP connection (sandbox)
- [ ] QRIS payment generation
- [ ] Virtual Account payment
- [ ] Payment status checking
- [ ] Payment webhook/callback handling
- [ ] Payment UI di POS checkout
- [ ] Payment confirmation → order paid + stock deduction

## Later

- [ ] Milestone 6 — AI Agent Core
- [ ] Milestone 7 — Agent Workflows
- [ ] Milestone 8 — POS Connector

## Blocked

None.
