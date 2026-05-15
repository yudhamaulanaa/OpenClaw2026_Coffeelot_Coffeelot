# Coffeelot — Project Status

Last updated: 2026-05-15

## Overall Progress: Milestone 5 In Progress — Real DOKU MCP Sandbox Integrated

### Current State

Milestone 1 — Project Brain is complete.

Milestone 2 — Database Foundation is complete and merged to `main`. The Bun monorepo foundation, `.env.example`, Prisma SQLite schema, initial migration, demo seed, and shared domain types are implemented and verified.

Milestone 3 — Backend Foundation is complete and merged to `main`.

Milestone 4 — Built-in POS / Order Channels MVP foundation is complete and merged to `main`.

Milestone 5 — DOKU Payment Integration is in progress on branch `feat/doku-mcp-integration`: sandbox placeholder payment creation, status polling, callback handling, and POS payment link/QR/VA display are implemented. The public deployment serves `https://coffeelot.app` and `https://api.coffeelot.app`; frontend API calls use the public API origin and backend CORS allows the app origin. DOKU MCP sandbox discovery now works against the real endpoint, and payment creation has been verified for QRIS and BCA Virtual Account sandbox tools with runtime-only credentials. Next target: callback signature/security validation and paid-order stock deduction hardening.

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

1. Add callback signature/security validation using confirmed DOKU callback headers/canonical string.
2. Harden successful payment flow: payment paid → order paid → invoice assignment → stock deduction → stock movement records.
3. Add an internal/safe callback simulation script for existing sandbox payment records.
4. Verify with `bun run typecheck`, `bun run build`, and a sandbox end-to-end payment callback.
5. Update living docs and changelog before merging.

### Modules Created

- `apps/api` — Elysia backend API.
- `apps/web` — React/Vite POS frontend.
- `packages/shared` — shared domain constants/types.
- `prisma` — database schema, migration, and seed.

### Blockers

- Callback security validation still needs confirmed DOKU callback signing details.
- `www.coffeelot.app` is not enabled in Nginx Proxy Manager SSL until DNS resolves publicly.
