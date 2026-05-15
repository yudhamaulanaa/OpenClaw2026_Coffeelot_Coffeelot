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

## Completed — LLM Agent Insight Foundation

- [x] Add OpenAI-compatible AI client for Agent Workflows.
- [x] Adapt reference-codebase AI Insight pattern into `daily_report`, `risk_detection`, `promo_generation`, and `morning_briefing`.
- [x] Add structured metadata for performance status, risks, restock, opportunities, next actions, and owner message.
- [x] Add safe rule-based fallback when LLM is not configured/fails.
- [x] Render AI Insight cards on `/agent`.

## Still pending from mandatory reference-codebase items

- [ ] Add public endpoint rate limiter.
- [ ] Improve `/chat` order tracker UX.
- [ ] Continue backend modularization in small safe steps.

## Completed — Booking Seat Insight Foundation

- [x] Add booking/reservation DB model.
- [x] Add seat availability overlap calculation.
- [x] Reject booking when remaining seats are insufficient.
- [x] Add booking status transitions including arrived/completed/cancelled/no_show/released.
- [x] Add `booking_seat_insight` Agent Workflow using LLM with fallback.
- [x] Render booking insights on `/agent`.

## Booking follow-up

- [ ] Add public/customer booking UI.
- [ ] Add operator booking calendar/table map UI.
- [ ] Add automatic no-show/release reminders around booking time.

## Completed — Agent Insight Comparison

- [x] Analyze duplicated AI insight prompt behavior.
- [x] Split prompt intent per workflow.
- [x] Add workflow focus metadata.
- [x] Add tabular comparison view to `/agent`.
## Completed — BI Insight Pack

- [x] Add Menu Engineering Insight workflow.
- [x] Add Demand Forecast Insight workflow.
- [x] Add Prep Planning Insight workflow.
- [x] Add Kitchen SLA Insight workflow.
- [x] Add Payment/Reconciliation Insight workflow.
- [x] Include BI workflows in `/agent` workflow list and comparison table.

## Follow-up — BI Insight Pack

- [ ] Add dedicated BI dashboard filters and charts.
- [ ] Add COGS/margin fields for deeper menu engineering.
- [ ] Add historical multi-day forecasting beyond today/yesterday.


## Reporting / Pitch Deck Follow-up

- [x] Create Markdown pitch deck content for Coffeelot MVP/BI wrap-up.
- [x] Create demo video script and recording checklist.
- [ ] Convert pitch deck markdown into slides/PDF.
- [ ] Capture product screenshots for deck.
- [ ] Record demo video using safe browser tabs only.

## Completed — Agent Insight Context Labels

- [x] Add usage context to `/agent` Insight Comparison Type column.
- [x] Add processed-data descriptions per workflow.
## Completed — Compact Pitch Deck

- [x] Create 5-slide Coffeelot pitch deck for shorter presentation format.
## Devpost Submission Follow-up

- [x] Update README with reproducible setup instructions.
- [x] Add Devpost submission draft.
- [x] Add AI tools/models list.
- [x] Generate required 5-slide pitch deck PDF.
- [ ] Confirm GitHub repository is public.
- [ ] Rename or duplicate repository to `OpenClaw2026_Coffeelot_Coffeelot` if required.
- [ ] Record and upload public max-2-minute demo video.
- [ ] Add final demo video URL to Devpost submission.
## Completed — Submission Repository Link

- [x] Update submission docs to point to `OpenClaw2026_Coffeelot_Coffeelot`.
## Completed — Main AI Stack Clarification

- [x] Add OpenClaw as main AI tool/runtime in submission materials.
- [x] Add GPT-5.5 as main LLM model in submission materials.
- [x] Regenerate pitch deck PDF after AI stack update.


## Completed — POS Cart Quantity Controls

- [x] Add `-` and `+` buttons to main POS `/` cart rows.
## Completed — GitHub Hero Image

- [x] Add user-provided hero image to the repository README.
## Completed — Uploaded Final PDF Report

- [x] Add the user-provided final PDF report to the repository using the required submission filename.
## Completed — Backend Structure Cleanup

- [x] Extract CORS helper from API index.
- [x] Extract DOKU callback signature/security helpers.
- [x] Extract payment paid-flow, stock deduction, reconciliation, and paid-order agent trigger helpers.

