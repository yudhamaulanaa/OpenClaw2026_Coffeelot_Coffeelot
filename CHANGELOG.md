# Coffeelot — Changelog

## [Milestone 3 API Foundation] — 2026-05-15

### Added

- Added Elysia API server under `apps/api`.
- Added Prisma client module, tenant/outlet context resolver, and API error envelope helpers.
- Added initial endpoints for health, context, outlets, products/POS products, product create/update/disable, inventory, restock, paid order creation, order listing, and critical stock report.

### Updated

- Updated workspace tsconfigs for Node types and cross-workspace path alias typechecking.
- Marked initial Milestone 3 API tasks complete in `TODO.md` and `ROADMAP.md`.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.

## [Milestone 2 Complete] — 2026-05-15

### Added

- Added shared enum/type constants in `packages/shared` for roles, tenant/business statuses, order/payment/prep/channel states, stock movements, agent states, API errors, POS products, cart inputs, order inputs, and kitchen orders.

### Updated

- Marked Milestone 2 complete in `ROADMAP.md`.
- Marked shared types and seed/query verification complete in `TODO.md`.
- Updated `PROJECT_STATUS.md` to point next work at Milestone 3 backend API foundation.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.

## [Tooling Verification] — 2026-05-15

### Added

- Installed Bun 1.3.14 on the host and generated `bun.lock`.

### Updated

- Added TypeScript `ignoreDeprecations: "6.0"` to keep workspace typecheck passing under TypeScript 6 while `baseUrl`/`paths` remain in use.
- Updated `PROJECT_STATUS.md` to reflect completed dependency installation, Prisma generate, seed execution, and typecheck verification.

### Verification

- `bun --version` and `bunx --version` both report `1.3.14`.
- `bun install` completed successfully.
- `DATABASE_URL=file:./dev.db bunx prisma migrate reset --schema prisma/schema.prisma --force --skip-seed` completed successfully.
- `DATABASE_URL=file:./dev.db bun run db:generate` completed successfully.
- `DATABASE_URL=file:./dev.db bun run db:seed` completed successfully.
- `bun run typecheck` passes for shared, API, and web workspaces.

## [Milestone 2 Migration and Seed] — 2026-05-15

### Added

- Added initial SQLite migration under `prisma/migrations`.
- Added `prisma/seed.ts` with idempotent demo data for Kopi Jagoan / Booth Ciputat.
- Seed source covers demo owner, tenant-user role, products, inventory, recipes, customer, and sample paid order.

### Updated

- Marked migration and seed tasks complete in `TODO.md` and `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` toward shared types and backend foundation.

### Verification

- Applied migration successfully with `DATABASE_URL=file:./dev.db npx --yes prisma@6.19.3 migrate reset --schema prisma/schema.prisma --force --skip-seed --skip-generate`.
- Confirmed `prisma migrate status` reports the database schema is up to date.
- Verified seed source markers for demo tenant, outlet, products, recipes, and sample order. Runtime seed execution is pending Bun/dependency installation.

## [Milestone 2 Prisma Schema] — 2026-05-15

### Added

- Added `prisma/schema.prisma` using SQLite datasource and Prisma Client generator.
- Modeled tenant, user, outlet, product, inventory, recipe, customer, order, stock movement, self-order/cart, AI agent, report, and payment tables from `docs/DATABASE-SCHEMA.md`.
- Added indexes, unique constraints, relations, timestamps, and snake_case table/column mappings.

### Updated

- Marked Prisma schema tasks complete in `TODO.md` and `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` next steps toward migration and seed data.

### Notes

- Schema validation passed with `DATABASE_URL=file:./dev.db npx --yes prisma@6.19.3 validate --schema prisma/schema.prisma`. Prisma packages are pinned to `^6.19.3` to preserve the documented datasource URL workflow; Prisma 7 moves datasource URLs to `prisma.config.ts`.

## [Milestone 2 Foundation Bootstrap] — 2026-05-15

### Added

- Added root Bun workspace `package.json` and TypeScript base config.
- Added starter workspace folders for `apps/api`, `apps/web`, `packages/shared`, `prisma`, and `scripts`.
- Added `.env.example` with SQLite, demo context, API/web, AI provider, and DOKU MCP sandbox placeholders.
- Added minimal API/web/shared package manifests and starter files.

### Updated

- Marked Bun workspace and `.env.example` tasks complete in `TODO.md` and `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` with current Milestone 2 progress and tooling blocker.

### Notes

- `bun` is not installed on the current host, so install/typecheck/build verification is pending until Bun is available. JSON config validation passed with Node.

## [Milestone 2 Started] — 2026-05-15

### Updated

- Created milestone implementation branch: `feat/milestone-2-database-foundation`.
- Updated `PROJECT_STATUS.md` to reflect Milestone 2 planning/bootstrap state.
- Updated `TODO.md` and `ROADMAP.md` so living documents track the next implementation sequence.

### Notes

- Follow root `AGENTS.md`: do not build directly on `main`; keep `.md` living documents updated before/with code changes.

## [Milestone 1 Complete] — 2026-05-15

### Updated

- Marked Milestone 1 — Project Brain as complete in `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` to reflect Milestone 1 completion.
- Added living document rule so `.md` files remain part of the delivery checklist.

### Notes

- Documentation is treated as a living project tracker and must stay updated with implementation progress.

## [Clean Blueprint] — 2026-05-15

### Added

- Clean restart branch with updated roadmap and documentation only.
- Milestone 4 expanded to include cashier POS, manual cart/custom item, kitchen/barista queue, self-order via chat, QR order links, and chat cart flow.
- DOKU Payment Integration promoted to Milestone 5.
- AI Agent Core shifted to Milestone 6 and Agent Workflows to Milestone 7.
- Added docs/ORDER-CHANNELS.md scope reference.

### Notes

- This branch intentionally contains no implementation code.
- Use this branch if restarting implementation from a clean blueprint.
