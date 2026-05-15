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

## Latest update — LLM Agent Insights

Coffeelot Agent Workflows now support structured AI Insight generation. The mandatory AI Insight behavior inspired by the reference codebase has been adapted into existing Agent Workflows instead of adding a separate report module.

Current behavior:
- `daily_report`, `risk_detection`, `promo_generation`, and `morning_briefing` build a business snapshot and ask an OpenAI-compatible LLM for Indonesian owner-friendly insight.
- If AI env is missing or provider fails, the workflow falls back to deterministic rule-based insight.
- `/agent` renders structured insight cards with performance status, risks, restock recommendations, sales opportunities, next actions, and owner message.

Required runtime env for live LLM mode:
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- optional `AI_TIMEOUT_MS`

## Latest update — Booking Seat Insight

Coffeelot now has a reservation/booking foundation for seat availability control. Bookings reserve seats over a time window and the backend rejects double-booking when requested seats exceed configured capacity.

Agent Workflow added:
- `booking_seat_insight`

It evaluates:
- current seats available,
- reserved seats over the next 2 hours,
- arrival watchlist for bookings due soon,
- occupancy/availability risks,
- operational seat actions for the owner/floor team.

Runtime capacity controls:
- `BOOKING_DEFAULT_SEAT_CAPACITY` default `24`
- `BOOKING_DEFAULT_HOLD_MINUTES` default `90`

## Latest update — Agent Insight Comparison

The Agent Dashboard now includes a tabular comparison view for structured insights. This helps compare `daily_report`, `risk_detection`, `promo_generation`, `morning_briefing`, and booking insights side-by-side.

Prompt analysis result:
- Previous non-booking workflows shared the same generic prompt, causing similar LLM phrasing.
- Prompts are now workflow-specific: daily report summarizes performance, risk detection audits operational risk, promo generation focuses on approvable campaigns, and morning briefing focuses opening-shift readiness.
## Latest update — BI Insight Pack

Coffeelot now has a first-pass BI Insight Pack in Agent Workflows. The agent can generate AI-backed insights for menu engineering, demand forecast, prep planning, kitchen SLA, and payment reconciliation health. These workflows appear in `/agent` and are included in the insight comparison table.

The BI snapshot now includes hourly sales, menu performance, recipe stock risk, active kitchen queue/SLA indicators, and pending payment summary so the LLM can reason beyond generic reports.


## Latest update — Wrap-up Reporting Materials

The current MVP/BI build phase has been wrapped with reporting assets in `docs/reports/`:

- Pitch deck content covering problem, solution, demo flow, AI/BI layer, current status, and roadmap.
- Demo video script covering POS, `/chat`, payment/inventory reliability, `/agent`, Booking Seat Insight, and BI workflows.

These are Markdown source materials ready to convert into slides/PDF and a recorded demo video.

## Latest update — Agent Insight Context Labels

The `/agent` Insight Comparison table now makes each workflow easier to understand. The Type column describes when the insight should be used and what data is processed, instead of only showing the raw output type.
