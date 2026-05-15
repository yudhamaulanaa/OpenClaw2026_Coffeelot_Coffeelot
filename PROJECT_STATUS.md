# Coffeelot — Project Status

Last updated: 2026-05-15

## Overall Progress: Milestone 6 Scheduler Added — Continuing Agent/Event Workflows

### Current State

Milestone 1 — Project Brain is complete.

Milestone 2 — Database Foundation is complete and merged to `main`. The Bun monorepo foundation, `.env.example`, Prisma SQLite schema, initial migration, demo seed, and shared domain types are implemented and verified.

Milestone 3 — Backend Foundation is complete and merged to `main`.

Milestone 4 — Built-in POS / Order Channels MVP foundation is complete and merged to `main`. A customer-facing `/chat` web order screen is now implemented and deployed for browser/QR-based self-order testing.

Milestone 5 — DOKU Payment Integration MVP is wrapped for now. DOKU MCP sandbox discovery and payment creation are verified for QRIS, DOKU Checkout, and BCA Virtual Account paths with runtime-only credentials. Fallback reconciliation/polling is implemented, manual payment reconciliation works, webchat/POS payment status UX is deployed, and paid DOKU sandbox payments can sync to local `paid`. DOKU callback signature validation is now implemented from the public non-SNAP signature docs. Recipe-based stock deduction is now implemented for paid orders.

Roadmap and docs are updated with the latest MVP direction:

- Milestone 1 documentation/checklist is complete and maintained as living documents.
- Milestone 4 includes cashier POS, manual cart/custom item, kitchen/barista queue, self-order via chat, and QR order links.
- Milestone 5 is DOKU Payment Integration.
- Milestone 6 is AI Agent Core.
- Milestone 7 is Agent Workflows.
- Milestone 8 is POS Connector.

### Living Document Rule

Keep `.md` files updated as part of the work, not afterthoughts:

- Update `ROADMAP.md` checklist when a milestone item is completed.
- Update `TODO.md` when tasks start/finish or scope changes.
- Update `PROJECT_STATUS.md` at the end of each phase.
- Update `CHANGELOG.md` for every meaningful completed change.
- Keep module-level `STATUS.md` and `TODO.md` current once modules are created.

### What's Next

Continue with Milestone 6/7 follow-ups. The internal workflow runner, agent dashboard, daily report/restock workflows, configurable scheduler, and event trigger system are now implemented. Milestone 7 first-pass workflows are also implemented: risk detection, promo generation, and morning briefing. Approval states/actions are now implemented for agent outputs that require review. DOKU callback signature validation has been applied from the public DOKU non-SNAP signature docs. Next targets: deeper workflow recommendations, callback delivery confirmation, and safe callback simulation coverage.

### Modules Created

- `apps/api` — Elysia backend API.
- `apps/web` — React/Vite POS frontend.
- `packages/shared` — shared domain constants/types.
- `prisma` — database schema, migration, and seed.

### Blockers

- Callback security validation still needs confirmed DOKU callback signing details.
- `www.coffeelot.app` is not enabled in Nginx Proxy Manager SSL until DNS resolves publicly.
