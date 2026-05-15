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

### Order Channels / Webchat

- [x] Add customer-facing `/chat` web order screen
- [x] Wire webchat screen to chat-cart APIs
- [x] Generate QRIS/VA BCA payment after chat order submit
- [x] Render QRIS payment payload as scannable QR code
- [x] Show VA Bank BCA payment instructions and manual status check button on `/chat`
- [x] Keep `/chat` checkout/payment/status in one page after user feedback
- [x] Disable `/chat` payment dropdown and ordering controls after checkout
- [x] Show customer name in `/chat` order panel
- [x] Poll `/chat` order status every 5 seconds after payment is paid
- [x] Auto-reconcile `/chat` payment status every 5 seconds after checkout
- [x] POS `Check Pembayaran` reconciles DOKU status instead of only reading local status
- [x] Auto-refresh POS kitchen queue/status every 5 seconds
- [x] Make `/chat` Check Pembayaran trigger DOKU reconciliation, not just local status read
- [x] Show VA Bank BCA payment instructions and manual status check button on POS root `/`
- [ ] Generate QR order links that point customers directly to `/chat?table=...`

### Real DOKU Hardening

- [x] Collect DOKU sandbox credentials/config
- [x] Discover real DOKU MCP tools via sandbox endpoint
- [x] Replace payment creation placeholder path with real DOKU MCP QRIS/VA calls
- [x] Verify sandbox QRIS payment creation via MCP
- [x] Verify sandbox BCA Virtual Account payment creation via MCP
- [x] Harden invalid callback handling to return clear 4xx errors instead of generic 500
- [x] Add fallback DOKU MCP reconciliation/polling for pending payments
- [x] Add manual payment reconciliation endpoint
- [x] Sync DOKU `SUCCESS` status to local paid payment/order state
- [x] Add callback signature/security validation
- [x] Payment confirmation → stock deduction transaction
- [x] Prevent paid orders/payment creation from making inventory negative
- [x] Show temporary/projected stock while items are in POS and chat carts
- [x] Add navbar across POS, chat, and agent UI pages
- [ ] Verify sandbox end-to-end payment callback flow

## POS / Operations UI

- [x] Add stock status panel to POS root `/` with 5-second refresh

## Next — Milestone 6 AI Agent Core

- [x] Implement internal agent workflow runner service
- [x] Add agent run creation/status/output API endpoints
- [x] Add daily report workflow using existing sales/report data
- [x] Add restock alert workflow using inventory thresholds
- [x] Add agent dashboard/activity timeline page
- [x] Add configurable scheduler for daily_report and restock_alert workflows
- [x] Add event triggers for paid orders and low-stock restock alerts

- [x] Add risk detection workflow

- [x] Add promo generation workflow

- [x] Add morning briefing workflow
- [x] Add approval flow for agent outputs/actions

## Later

- [ ] Milestone 6 — AI Agent Core
- [ ] Milestone 7 — Agent Workflows
- [ ] Milestone 8 — POS Connector

## Blocked

- Callback signature/security validation is blocked until DOKU callback signing details/headers are confirmed.
- `www.coffeelot.app` SSL/proxy setup is blocked until DNS resolves publicly.
