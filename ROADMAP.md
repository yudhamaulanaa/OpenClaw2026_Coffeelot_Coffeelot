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

## Milestone 3 — Backend Foundation

Setup API server dan core services.

- [x] Elysia.js server setup
- [x] Database client (Prisma + SQLite)
- [x] Tenant context middleware
- [x] Product service + endpoints
- [x] Inventory service + endpoints
- [x] Order service + endpoints
- [x] Stock engine (transactional deduction)
- [x] Invoice generator

---

## Milestone 4 — Built-in POS

Build POS module sebagai data source dan workflow operasional kasir/barista.

- [ ] Product grid UI
- [ ] Cart management
- [ ] Checkout flow
- [ ] Order creation + stock deduction
- [ ] Invoice generation
- [ ] Receipt preview
- [ ] Manual cart / custom item input untuk order cepat di kasir
- [ ] Kitchen / Barista order queue
- [ ] Order prep status: new → preparing → ready → completed
- [ ] Barista click actions per order
- [ ] Highlight waiting time / order age
- [ ] Tablet-friendly kitchen display
- [ ] Self-order via chat sebagai order channel MVP
- [ ] QR order link generator untuk self-order
- [ ] Customer cart flow via chat
- [ ] Chat order masuk ke POS + kitchen queue

---

## Milestone 5 — DOKU Payment Integration

Integrate DOKU MCP Server untuk payment processing.

- [ ] Setup DOKU MCP connection (sandbox)
- [ ] QRIS payment generation
- [ ] Virtual Account payment
- [ ] Payment status checking
- [ ] Payment webhook/callback handling
- [ ] Payment UI di POS checkout
- [ ] Payment confirmation → trigger stock deduction

---

## Milestone 6 — AI Agent Core

Build agent orchestrator dan workflow engine.

- [ ] Agent core (execution loop)
- [ ] Workflow registry
- [ ] Scheduler (cron-based)
- [ ] Event trigger system
- [ ] Agent output storage (agent_runs, agent_outputs tables)
- [ ] Agent dashboard page (activity timeline)

---

## Milestone 7 — Agent Workflows

Implement individual agent workflows.

- [ ] Daily Report workflow
- [ ] Restock Alert workflow
- [ ] Risk Detection workflow
- [ ] Promo Generation workflow
- [ ] Morning Briefing workflow

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
