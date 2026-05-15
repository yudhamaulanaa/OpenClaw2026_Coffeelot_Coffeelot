# Coffeelot — Changelog

## [DOKU Callback Signature Hardening] — 2026-05-15

### Added

- Added DOKU callback signature validation for `POST /api/payments/callback` using DOKU non-SNAP signature components.
- Validates `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature`, request path, raw-body digest, HMAC-SHA256, and timestamp tolerance.
- Added `DOKU_CALLBACK_SIGNATURE_REQUIRED` and `DOKU_CALLBACK_SIGNATURE_TOLERANCE_MS` environment controls.
- Expanded callback reference/status parsing for additional DOKU-style fields such as `order_invoice_number` and `transactionStatus`.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- Unsigned public callback simulation is rejected with `401 INVALID_DOKU_SIGNATURE`.
- Correctly signed callback simulation passes signature validation and reaches payment lookup (`404 PAYMENT_NOT_FOUND` for intentionally unknown invoice).

## [Agent Output Approval Flow] — 2026-05-15

### Added

- Added `PATCH /api/agent/outputs/:id/approval` for approving or rejecting agent outputs that require review.
- Agent dashboard now shows approval status badges for outputs requiring approval.
- Agent dashboard now supports Approve/Reject actions for pending outputs.
- Promo generation outputs can now be reviewed before any future publishing/action flow.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` and `coffeelot-web` restarted successfully.
- Generated a promo output requiring approval and approved it through the new API.
- Public `/agent` bundle contains approval UI strings and endpoint reference.

## [Agent Workflow Pack] — 2026-05-15

### Added

- Added `risk_detection` workflow for inventory/sales risk signals.
- Added `promo_generation` workflow for draft promo recommendations; outputs require approval.
- Added `morning_briefing` workflow summarizing yesterday sales, top seller, stock focus, and opening checklist.
- Agent workflow registry now exposes five workflows: daily report, restock alert, risk detection, promo generation, and morning briefing.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- Public API `GET /api/agent/workflows` returns all five workflows.
- On-demand runs for `risk_detection`, `promo_generation`, and `morning_briefing` completed and created outputs.

## [Agent Event Triggers] — 2026-05-15

### Added

- Added event-triggered agent workflow runs after paid orders.
- Paid order events trigger `daily_report` with `trigger_type=event`.
- If inventory is low after a paid order/stock deduction, the event also triggers `restock_alert`.
- Event triggers are controlled by runtime env flags.

### Runtime Config

- `AGENT_EVENT_TRIGGERS_ENABLED`
- `AGENT_EVENT_PAID_ORDER_DAILY_REPORT_ENABLED`

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- Test paid cash order triggered event runs for `daily_report` and low-stock `restock_alert`, both completed.

## [Agent Workflow Scheduler] — 2026-05-15

### Added

- Added configurable API-side agent scheduler for `daily_report` and `restock_alert`.
- Scheduler uses runtime env controls for enable/disable, tenant/outlet target, initial delay, and interval durations.
- Scheduled workflow runs are persisted as `agent_runs` with `trigger_type=scheduled` and generate normal `agent_outputs`.

### Runtime Config

- `AGENT_SCHEDULER_ENABLED`
- `AGENT_SCHEDULER_TENANT_ID`
- `AGENT_SCHEDULER_OUTLET_ID`
- `AGENT_SCHEDULER_INITIAL_DELAY_MS`
- `AGENT_DAILY_REPORT_INTERVAL_MS`
- `AGENT_RESTOCK_ALERT_INTERVAL_MS`

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- Scheduler logged both `daily_report` and `restock_alert` scheduled runs as `completed`.

## [Web Navbar] — 2026-05-15

### Added

- Added a shared navbar to existing UI pages: POS `/`, Chat Order `/chat`, and Agent Dashboard `/agent`.
- Navbar highlights the active page and links between available UI surfaces.
- Added responsive navbar styling for mobile widths.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public bundle includes navbar labels `Coffeelot`, `Chat Order`, and `Agent`.

## [Projected Cart Stock] — 2026-05-15

### Added

- Product POS API now includes recipe + linked inventory metadata for live cart stock projection.
- POS stock panel now shows temporary/projected stock after current cart quantities.
- POS checkout is disabled when projected stock would go below zero, with a clear stock warning.
- `/chat` also calculates temporary stock while the customer adjusts cart quantities and blocks checkout if projected stock is insufficient.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` and `coffeelot-web` restarted successfully.
- Public API `/products/pos` returns recipe metadata for Americano.
- Public bundle includes `Temporary stock setelah cart`, `STOCK TIDAK CUKUP`, and `Stok sementara tidak cukup`.

## [POS Payment Reconcile Button] — 2026-05-15

### Fixed

- POS root `Check Pembayaran` now calls `POST /api/payments/:id/reconcile` instead of only reading local payment status.
- Successful POS payment checks refresh the kitchen/inventory view after reconciliation.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public root bundle contains the reconcile call used by the POS payment check button.

## [Prevent Negative Stock] — 2026-05-15

### Fixed

- Added insufficient-stock guard before recipe-based sale deduction so paid orders cannot push inventory below zero.
- Added stock validation before DOKU payment creation, preventing customers from paying for orders that cannot be fulfilled from current stock.
- Sale deduction now aggregates ingredient requirements per order and returns `INSUFFICIENT_STOCK` with item details when unavailable.
- Restored Es Batu stock from `-1100g` to `10000g` using a restock movement after the oversell test case.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- Oversell test `Americano ×100` returns HTTP 409 `INSUFFICIENT_STOCK` and Es Batu remains `10000g`.

## [Chat Auto Payment Status Polling] — 2026-05-15

### Fixed

- `/chat` now auto-reconciles pending payment status every 5 seconds after checkout.
- Once payment becomes `paid`, the customer order-status panel appears and continues polling order/kitchen status every 5 seconds.
- The status text now clarifies that payment and order status both auto-update.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public `/chat` bundle contains the new payment/order auto-update text.

## [Paid Order Stock Deduction] — 2026-05-15

### Added

- Added idempotent recipe-based stock deduction when an order becomes `paid`.
- Paid cash orders now deduct inventory immediately using product recipes.
- DOKU callback/reconciliation paid flow now also deducts inventory using the same transaction helper.
- Sale deductions create `stock_movements` with `movement_type=sale` and order references.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- Test Americano cash order deducted Biji Kopi by 18g, Cup 16oz by 1 pcs, and Es Batu by 150g, with sale movement records created.

## [Agent Dashboard UI] — 2026-05-15

### Added

- Added web agent dashboard at `/agent`.
- Dashboard lists available workflows, runs `daily_report` / `restock_alert` on demand, and displays recent agent run/output activity timeline.
- Timeline auto-refreshes every 10 seconds.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public `/agent` bundle contains `Agent dashboard & activity timeline`, `Run workflow`, and `Activity timeline`.

## [POS Stock Status Panel] — 2026-05-15

### Added

- Added a stock status panel to the main POS page at `/`.
- Stock cards show current stock, minimum stock, unit, and `LOW STOCK` / `OK` state.
- The stock panel refreshes with the existing 5-second POS/kitchen auto-refresh loop.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public root bundle contains `Status Stock` and `LOW STOCK`.

## [QRIS QR Code Display] — 2026-05-15

### Added

- Added QR code rendering for QRIS payment payloads in POS and `/chat` payment boxes.
- QRIS customers now see a scannable QR code instead of raw QR payload text.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public `/chat` bundle contains `Scan QRIS untuk bayar`.

## [Milestone 6 Agent Core Runner] — 2026-05-15

### Added

- Added internal agent workflow runner service with run/output persistence through existing `agent_runs` and `agent_outputs` tables.
- Added initial workflows: `daily_report` and `restock_alert`.
- Added API endpoints:
  - `GET /api/agent/workflows`
  - `POST /api/agent/runs`
  - `GET /api/agent/runs`
  - `GET /api/agent/outputs`

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully.
- `GET /api/agent/workflows` returns `daily_report` and `restock_alert`.
- `POST /api/agent/runs` with `restock_alert` completed and created an alert output.

## [Milestone 5 MVP Wrap-up] — 2026-05-15

### Updated

- Marked the DOKU/Webchat MVP slice as wrapped for now after sandbox DOKU MCP payment creation, fallback reconciliation, webchat ordering, POS/webchat payment checks, and live kitchen status refresh were deployed.
- Moved remaining DOKU items into follow-up hardening: callback signature/security validation and recipe-based stock deduction.
- Set next active work to Milestone 6 — AI Agent Core.

### Verification

- Repository is clean and synced with `origin/main` before starting Milestone 6.

## [Chat Check Payment Reconcile Fix] — 2026-05-15

### Fixed

- Fixed `/chat` `Check Pembayaran` button to call `POST /api/payments/:id/reconcile` instead of only reading local status.
- The button now actively syncs DOKU status first, so paid DOKU payments can immediately switch the customer view to order status.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public `/chat` bundle contains `Check Pembayaran` and `/reconcile`.

## [Realtime Kitchen Refresh] — 2026-05-15

### Added

- Main POS/kitchen page now auto-refreshes product/kitchen queue data every 5 seconds.
- Kitchen panel now communicates that kitchen status auto-refreshes every 5 seconds.
- `/chat` keeps its existing 5-second paid order-status polling.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-web` restarted successfully.
- Public bundle contains both kitchen auto-refresh and chat order-status polling text.

## [Webchat Single-Page Live Order Status] — 2026-05-15

### Changed

- Reverted `/chat` back to a single-page checkout/payment/status flow.
- After checkout, menu/cart stay visible but ordering controls and payment dropdown are disabled.
- Customer name is shown in the order panel.
- Paid chat orders now show order status in the same page and poll the order detail endpoint every 5 seconds for kitchen/barista status updates.

### Added

- Added `GET /api/orders/:id` to fetch one order with items for customer/kitchen status polling.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` and `coffeelot-web` restarted successfully.
- `GET https://api.coffeelot.app/api/orders/:id` returns chat order status.
- `/chat` public bundle includes `Pemesan:` and the 5-second status polling text.

## [Webchat Payment-Only Checkout View] — 2026-05-15

### Changed

- After checkout on `/chat`, the customer is now moved to a focused payment-only view instead of keeping the menu/cart visible.
- For VA BCA, the payment page only highlights the VA number and a check-payment button.
- Once payment is paid, `/chat` switches to the order-status page.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/chat` serves the updated bundle containing `Nomor VA Bank BCA` and payment-only view classes.

## [Payment Response Casing Fix] — 2026-05-15

### Fixed

- Fixed frontend payment display to read both camelCase API fields (`vaNumber`, `paymentUrl`, `qrCode`) and snake_case fields (`va_number`, `payment_url`, `qr_code`).
- This fixes VA BCA not appearing after checkout even though the API payment record contains a VA number.

### Verification

- Confirmed recent VA BCA payments contain `va_number` in the database.
- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/chat` serves the updated bundle containing both camelCase and snake_case payment field handling.

## [Webchat Paid Order Status] — 2026-05-15

### Added

- Updated `/chat` so once payment status is `paid`, the customer sees an order-status panel instead of payment instructions.
- The paid view shows payment paid, order paid/processing, and current kitchen/barista prep status placeholder.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/chat` serves the updated bundle containing `Status pesanan` and `Pembayaran: lunas`.

## [POS Payment Status UI] — 2026-05-15

### Added

- Added the same Bank BCA VA instructions and `Check Pembayaran` button to the main POS page payment box.
- Cashier can now refresh payment status from `https://coffeelot.app/` after QRIS/VA BCA payment creation.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/` serves the updated bundle containing `Check Pembayaran` and `Bank BCA`.

## [Webchat Payment Status UI] — 2026-05-15

### Added

- Added a `Check Pembayaran` button on the `/chat` customer order screen.
- Added explicit Bank BCA Virtual Account payment instructions when VA BCA is selected/generated.
- The payment box now highlights paid status after a successful status check.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/chat` serves the updated bundle containing `Check Pembayaran` and `Bank BCA`.

## [Webchat Order Screen] — 2026-05-15

### Added

- Added customer-facing webchat order screen at `/chat`.
- Customers can enter name/table, pick catalog products, adjust quantities, submit a chat cart, and receive QRIS or VA BCA payment instructions.
- The screen uses existing `chat-carts` APIs and DOKU payment creation so chat orders enter the same kitchen/payment pipeline.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app/chat` returns HTTP 200 and serves the new webchat bundle.
- Public API smoke test created a webchat cart, submitted a `pending_payment` chat order, and generated a pending QRIS payment.

## [DOKU Payment Reconciliation] — 2026-05-15

### Added

- Added DOKU MCP transaction status lookup by invoice using `get_transaction_by_invoice_number`.
- Added manual reconciliation endpoint `POST /api/payments/:id/reconcile`.
- Added pending-payment reconciliation endpoint `POST /api/payments/reconcile-pending`.
- Added API worker polling for pending DOKU payments every 60 seconds by default, configurable with `PAYMENT_RECONCILE_INTERVAL_MS` and `PAYMENT_RECONCILE_ENABLED`.

### Changed

- Successful DOKU reconcile now updates payment status to `paid`, sets `paidAt`, stores the provider response safely, and marks the linked order as paid in one transaction.
- Existing callback path now uses the same paid-status update helper as reconciliation.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `coffeelot-api` restarted successfully and is active.
- Manual reconciliation synced sandbox VA payments `CLT-20260515-8045` and `CLT-20260515-0087` from DOKU `SUCCESS` to local `paid`.

## [DOKU MCP Sandbox Integration] — 2026-05-15

### Added

- Added a DOKU MCP JSON-RPC client with initialize, tools/list, and tools/call support.
- Added `GET /api/payments/doku/tools` to inspect available DOKU MCP tools from the configured sandbox endpoint.
- Wired `POST /api/payments/create` to call real DOKU MCP tools for QRIS and Virtual Account payment creation, with sandbox placeholder fallback if MCP is unavailable.
- Added DOKU runtime configuration placeholders to `.env.example` without committing real secrets.

### Changed

- Updated DOKU sandbox endpoint defaults to `https://api-sandbox.doku.com/doku-mcp-server/mcp`.
- Expanded POS/payment method constants to include DOKU methods used by payment creation.
- Hardened payment callback parsing so invalid or unknown callback references return clear 4xx API errors.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `GET https://api.coffeelot.app/api/payments/doku/tools` returns 35 DOKU MCP tools including checkout, QRIS, and virtual account tools.
- Sandbox QRIS payment creation returns a DOKU QR payload and QR image URL through `create_qris_payment`.
- Sandbox BCA Virtual Account payment creation returns a VA number and how-to-pay URL through `create_virtual_account_payment`.

## [Deployment API URL and CORS Fix] — 2026-05-15

### Fixed

- Changed the production frontend API fallback from `http://127.0.0.1:3001/api` to `https://api.coffeelot.app/api` so browser users call the public backend instead of their own local machine.
- Added API CORS headers and preflight handling for `https://coffeelot.app`, with local Vite dev origins still allowed.

### Updated

- Updated deployment/Milestone 5 living docs to distinguish completed sandbox foundation from pending real DOKU integration.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- `https://coffeelot.app` serves the fresh frontend asset.
- Served frontend asset contains `https://api.coffeelot.app/api` and no `127.0.0.1:3001` API reference.
- `OPTIONS https://api.coffeelot.app/api/kitchen/orders` from origin `https://coffeelot.app` returns `HTTP/2 204` with CORS headers.
- `GET https://api.coffeelot.app/api/kitchen/orders` from origin `https://coffeelot.app` returns `HTTP/2 200`.

## [Deployment Proxy Setup] — 2026-05-15

### Added

- Added Vite allowed hosts for `coffeelot.app`, `www.coffeelot.app`, and `app.coffeelot.app` so Nginx Proxy Manager can proxy the web preview safely.

### Verification

- `bun run typecheck` passes.
- `bun run build` passes.
- Local NPM route verification passes for web root and API health.

## [Milestone 5 DOKU Payment Foundation] — 2026-05-15

### Added

- Added DOKU payment method shared types and validators.
- Added sandbox DOKU payment payload helper for payment URL, QRIS payload, VA number, and normalized status handling.
- Added payment create, list-by-order, status, and callback endpoints.
- Added POS checkout integration to create payment records for QRIS/transfer and display payment link, QR payload, or VA number.

### Updated

- Marked Milestone 5 payment foundation tasks complete in `TODO.md` and `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` with next hardening target: real DOKU MCP calls and paid-order stock deduction hardening.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.
- `bun run build` passes for shared, API, and web workspaces.

### Notes

- Current DOKU integration is a sandbox placeholder compatible with the planned API contract. Real MCP/provider calls should replace `apps/api/src/payments.ts` internals once sandbox credentials/flow are finalized.

## [Milestone 3 and 4 Complete] — 2026-05-15

### Updated

- Marked Milestone 3 backend foundation complete in `ROADMAP.md`.
- Marked Milestone 4 built-in POS/order channels MVP foundation complete in `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` to set Milestone 5 DOKU payment integration as the next target.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.
- `bun run build` passes for shared, API, and web workspaces; web production bundle generated successfully.

## [Milestone 4 Order Channels API] — 2026-05-15

### Added

- Added kitchen queue API and preparation status update endpoint.
- Added QR order link creation endpoint.
- Added chat cart session, add item, remove item, and submit-to-order endpoints.
- Chat cart submit now creates a `pending_payment` chat-channel order feeding the same order/items tables used by POS and kitchen flow.

### Updated

- Marked QR/self-order/chat cart routing tasks complete in `TODO.md` and `ROADMAP.md`.
- Updated `PROJECT_STATUS.md` to point next work at Milestone 5 after Milestone 4 closeout.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.

## [Milestone 4 POS MVP] — 2026-05-15

### Added

- Added React POS screen with product grid, categories, cart management, manual item input, payment method selection, total, and checkout action.
- Added kitchen/barista queue UI with status actions for `new`, `preparing`, `ready`, and `completed`.
- Added Vite env typings and POS styling for responsive/tablet-friendly layout.

### Updated

- Marked core POS and kitchen queue tasks complete in `TODO.md` and `ROADMAP.md`.

### Notes

- Manual/custom item UI is present; checkout currently accepts catalog-backed items until backend custom-order support is expanded.
- Self-order/chat cart and QR order link APIs remain next within Milestone 4.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.

## [Milestone 3 Reports and Stock Closeout] — 2026-05-15

### Added

- Added recent orders and daily report endpoints with revenue, order count, average order value, best sellers, and critical stock data.
- Confirmed transactional restock stock movement and checkout invoice generation are part of the API foundation.

### Updated

- Marked stock engine and invoice generator tasks complete in `TODO.md` and `ROADMAP.md`.

### Verification

- `bun run typecheck` passes for shared, API, and web workspaces.

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

## 2026-05-15 — LLM Agent Insights

- Added an OpenAI-compatible AI client for Agent Workflows using `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and optional `AI_TIMEOUT_MS`.
- Upgraded `daily_report`, `risk_detection`, `promo_generation`, and `morning_briefing` to generate structured AI Insight payloads from sales, inventory, product, and best-seller snapshots.
- Added rule-based fallback insight output when the LLM provider is not configured or fails, so workflows continue safely.
- Agent output metadata now stores provider, fallback reason, structured insight, and source snapshot.
- Improved `/agent` dashboard to render AI Insight sections, performance status, risk severity, restock recommendations, sales opportunities, next best actions, and owner message.

## 2026-05-15 — Booking Seat Insight

- Added booking/reservation data model with party size, booking window, status, table label, arrival/release timestamps.
- Added seat availability service with capacity-based overlap checks, reserved-seat calculation, current availability, and next-2-hour occupancy snapshots.
- Added booking APIs for creating bookings, checking availability, listing bookings, and updating booking status.
- Added `booking_seat_insight` Agent Workflow using LLM to assess seat availability, arrival watchlist, occupancy risk, and floor actions.
- Added `/agent` dashboard rendering for booking insight cards.

## 2026-05-15 — Agent Insight Comparison

- Split generic LLM insight prompting into workflow-specific prompts for daily report, risk detection, promo generation, and morning briefing.
- Added workflow focus metadata to agent output metadata so UI can distinguish insight intent.
- Added `/agent` insight comparison table showing latest structured insight per workflow with provider, status, summary, signal counts, owner message, and timestamp.
## 2026-05-15 — BI Insight Pack

- Expanded Agent Workflows with a Business Intelligence insight pack:
  - `menu_engineering`
  - `demand_forecast`
  - `prep_planning`
  - `kitchen_sla`
  - `payment_reconciliation_insight`
- Added richer insight snapshots for hourly sales, menu performance, recipe stock risks, kitchen queue/SLA, and pending payment reconciliation.
- Each BI workflow uses a distinct LLM prompt and stores `workflowFocus` metadata so `/agent` comparison table can distinguish their intent.


## 2026-05-15 — Wrap-up Reporting Materials

- Added report materials for the current Coffeelot MVP/BI phase:
  - `docs/reports/COFFEELOT-PITCHDECK.md`
  - `docs/reports/COFFEELOT-VIDEO-SCRIPT.md`
  - `docs/reports/README.md`
- The pitch deck positions Coffeelot as an AI Business Intelligence & Operations Agent for coffee shops/small F&B.
- The video script includes demo flow, narration, recording checklist, and secret-safety reminder.

## 2026-05-15 — Agent Insight Context Labels

- Updated `/agent` Insight Comparison table Type column to explain when each insight is used and what operational data it processes.
- Added workflow-specific context descriptions for daily report, restock alert, risk detection, promo generation, morning briefing, booking seat insight, and BI workflows.
## 2026-05-15 — Compact 5-Slide Pitch Deck

- Added `docs/reports/COFFEELOT-PITCHDECK-5SLIDES.md` as the primary concise pitch deck.
- Kept the longer pitch deck as an extended reference deck.
## 2026-05-15 — Devpost Submission Package

- Updated README with reproducible local setup, verification, demo flow, live links, and AI/tools references.
- Added Devpost submission draft at `docs/reports/DEVPOST-SUBMISSION.md`.
- Added AI tools/models list at `docs/reports/AI-TOOLS-MODELS.md`.
- Generated 5-page PDF pitch deck: `docs/reports/OpenClaw2026_Coffeelot_Coffeelot.pdf`.
- Added `scripts/generate_pitchdeck_pdf.py` to regenerate the PDF without external dependencies.
## 2026-05-15 — Submission Repository Link

- Updated README and Devpost submission draft to use the required GitHub repository URL: `https://github.com/yudhamaulanaa/OpenClaw2026_Coffeelot_Coffeelot`.
## 2026-05-15 — Main AI Stack Clarification

- Updated submission docs, README, report materials, and generated pitch deck PDF to explicitly list **OpenClaw** and **GPT-5.5** as the main AI stack/model.


## 2026-05-15 — POS Cart Quantity Controls

- Added `-` and `+` quantity controls to the main POS `/` cart.
- POS cart rows now show item name, unit price × quantity, subtotal, and quantity buttons matching the `/chat` cart behavior.
## 2026-05-15 — GitHub Hero Image

- Added `docs/assets/coffeelot-github-hero.jpg` and embedded it near the top of the README for the GitHub project page.

