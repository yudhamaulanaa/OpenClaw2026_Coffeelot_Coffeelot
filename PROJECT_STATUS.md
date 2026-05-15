# Coffeelot — Project Status

Last updated: 2026-05-15

## Overall Progress: Milestone 5 Started — DOKU Payment Hardening + Deployment

### Current State

Milestone 1 — Project Brain is complete.

Milestone 2 — Database Foundation is complete and merged to `main`. The Bun monorepo foundation, `.env.example`, Prisma SQLite schema, initial migration, demo seed, and shared domain types are implemented and verified.

Milestone 3 — Backend Foundation is complete and merged to `main`.

Milestone 4 — Built-in POS / Order Channels MVP foundation is complete and merged to `main`.

Milestone 5 — DOKU Payment Integration foundation is started on branch `feat/milestone-5-doku-hardening`: sandbox placeholder payment creation, status polling, callback handling, and POS payment link/QR/VA display are implemented. The public deployment now serves `https://coffeelot.app` and `https://api.coffeelot.app`; frontend API calls use the public API origin and backend CORS allows the app origin. Next target: replace sandbox placeholder with real DOKU MCP/API calls and harden paid-order stock deduction once sandbox credentials/flow are available.

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

Continue Milestone 5 in this order:

1. Collect real DOKU sandbox credentials/config and confirm the provider flow.
2. Replace sandbox placeholder internals in `apps/api/src/payments.ts` with real DOKU MCP/API calls.
3. Add callback signature/security validation.
4. Harden successful payment flow: payment paid → order paid → invoice assignment → stock deduction → stock movement records.
5. Verify with `bun run typecheck`, `bun run build`, and a sandbox end-to-end payment callback.
6. Update living docs and changelog before merging.

### Modules Created

- `apps/api` — Elysia backend API.
- `apps/web` — React/Vite POS frontend.
- `packages/shared` — shared domain constants/types.
- `prisma` — database schema, migration, and seed.

### Blockers

- Real DOKU integration needs sandbox credentials/config and callback signing details.
- `www.coffeelot.app` is not enabled in Nginx Proxy Manager SSL until DNS resolves publicly.
