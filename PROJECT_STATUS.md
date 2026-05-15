# Coffeelot — Project Status

Last updated: 2026-05-15

## Overall Progress: Milestone 2 Started — Database Foundation Planning

### Current State

Milestone 1 — Project Brain is complete.

Milestone 2 — Database Foundation is in progress on branch `feat/milestone-2-database-foundation`. The monorepo foundation, `.env.example`, validated Prisma SQLite schema, initial SQLite migration, and demo seed source are now created. Prisma packages are pinned to `^6.19.3` because Prisma 7 changes datasource configuration. Bun is not installed on the current host yet, so dependency installation, Prisma generate, runtime seed execution, and Bun script verification are pending. Next implementation target: shared enums/types and backend API foundation.

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

Continue Milestone 2 in this order:

1. Expand shared enums/types in `packages/shared`.
2. Install Bun/dependencies and run Prisma generate + seed execution once host tooling is available.
3. Begin Milestone 3 backend API foundation after Milestone 2 closeout.
4. Update living docs and changelog after each completed phase.

### Modules Created

None yet. Create module folders only when implementation reaches the related module scope. Milestone 2 can start with `prisma/`, root workspace config, and `packages/shared`.

### Blockers

None.
