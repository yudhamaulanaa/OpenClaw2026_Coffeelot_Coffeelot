# Coffeelot — Changelog

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
