# Coffeelot — Roadmap

## Vision

Autonomous Coffee Shop / F&B Operator berbasis AI Agent.
AI Agent yang bisa colok ke POS manapun.

---

## Milestone 1 — Project Brain ✅

Setup dokumentasi dan blueprint project.

Status: **Complete** — living documents sudah tersedia dan akan terus di-update setiap milestone/phase.

- [x] AGENTS.md + adapter files
- [x] README.md
- [x] PROJECT_STATUS.md, ROADMAP.md, TODO.md, CHANGELOG.md
- [x] docs/ARCHITECTURE.md
- [x] docs/DATABASE-SCHEMA.md
- [x] docs/API-CONTRACTS.md
- [x] docs/ORDER-CHANNELS.md

---

## Milestone 2 — Database Foundation

Setup database schema (SQLite), migration, dan seed data.

Status: **Complete** — database schema, migration, seed data, Bun tooling, Prisma generate/seed verification, and shared types are complete.

- [x] Milestone branch created
- [x] Bun workspace config
- [x] `.env.example`
- [x] Prisma schema (all tables: tenant, POS, agent, payment)
- [x] Migration (SQLite)
- [x] Seed: demo tenant, outlet, user
- [x] Seed: sample products, inventory, recipes
- [x] Seed: sample orders (for agent to analyze)
- [x] Shared types/enums in `packages/shared`
- [x] Seed/query verification

---

## Milestone 3 — Backend Foundation ✅

Setup API server dan core services.

Status: **Complete** — API foundation, Prisma client, tenant context, products, inventory, orders, stock/invoice basics, and reports are implemented.

- [x] Elysia.js server setup
- [x] Database client (Prisma + SQLite)
- [x] Tenant context middleware
- [x] Product service + endpoints
- [x] Inventory service + endpoints
- [x] Order service + endpoints
- [x] Stock engine (transactional deduction)
- [x] Invoice generator

---

## Milestone 4 — Built-in POS ✅

Build POS module sebagai data source dan workflow operasional kasir/barista.

Status: **Complete for MVP foundation** — cashier POS, cart, checkout, kitchen queue, prep status API, QR order links, and chat cart order channel foundation are implemented.

- [x] Product grid UI
- [x] Cart management
- [x] Checkout flow
- [x] Order creation + stock deduction
- [x] Invoice generation
- [x] Receipt preview
- [x] Manual cart / custom item input untuk order cepat di kasir
- [x] Kitchen / Barista order queue
- [x] Order prep status: new → preparing → ready → completed
- [x] Barista click actions per order
- [x] Highlight waiting time / order age
- [x] Tablet-friendly kitchen display
- [x] Self-order via chat sebagai order channel MVP
- [x] QR order link generator untuk self-order
- [x] Customer cart flow via chat
- [x] Chat order masuk ke POS + kitchen queue

---

## Milestone 5 — DOKU Payment Integration

Integrate DOKU MCP Server untuk payment processing.

- [x] Setup DOKU payment foundation placeholder (sandbox-compatible API contract)
- [x] QRIS payment generation placeholder
- [x] Virtual Account payment placeholder
- [x] Payment status checking endpoint
- [x] Payment webhook/callback endpoint
- [x] Payment UI di POS checkout
- [x] Customer-facing `/chat` web order screen for order-by-chat/browser flow
- [x] Public HTTPS deployment for web/API payment callback URL
- [x] Real DOKU MCP sandbox tool discovery using runtime credentials
- [x] QRIS payment creation through DOKU MCP sandbox
- [x] BCA Virtual Account payment creation through DOKU MCP sandbox
- [x] Fallback payment reconciliation/polling via DOKU MCP invoice status
- [x] Manual payment reconciliation endpoint
- [x] Reconciled DOKU `SUCCESS` → local payment paid + order paid
- [ ] Callback signature/security validation
- [x] Payment confirmation → trigger stock deduction

---

## Milestone 6 — AI Agent Core

Build agent orchestrator dan workflow engine.

- [x] Agent core (execution loop)
- [x] Workflow registry
- [x] Scheduler (cron-based)
- [x] Event trigger system
- [x] Agent output storage (agent_runs, agent_outputs tables)
- [x] Agent dashboard page (activity timeline)
- [x] Approval flow for agent outputs/actions

---

## Milestone 7 — Agent Workflows

Implement individual agent workflows.

- [x] Daily Report workflow — first API-backed version
- [x] Restock Alert workflow — first API-backed version
- [x] Risk Detection workflow
- [x] Promo Generation workflow
- [x] Morning Briefing workflow

---

## Milestone 8 — POS Connector

Enable colok ke POS eksisting.

- [ ] CSV/Excel import (orders, products, inventory)
- [ ] Data mapping/transformation
- [ ] Import history & validation
- [ ] Scheduled import (optional)

---

## Future (Post-MVP)

- WhatsApp notification channel
- Real-time POS API sync
- Authentication & session management
- Role-based permissions
- Multi-outlet switching UI
- Subscription billing
- Advanced analytics

## Mandatory polish from reference codebase

1. **AI Insight for Agent Workflows — done foundation**
   - LLM-backed structured insight is now integrated into existing Agent Workflows with fallback mode.
   - Next: configure runtime AI provider and tune prompts from real shop data.
2. **Public endpoint rate limiter — next**
3. **Improved `/chat` tracker UX — next**
4. **Backend modularization — ongoing, incremental only**

