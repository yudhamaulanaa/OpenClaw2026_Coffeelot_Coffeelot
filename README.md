# Coffeelot

Autonomous Coffee Shop / F&B Operator berbasis AI Agent.

Coffeelot membantu owner kedai kopi menjalankan operasional harian dengan membaca data POS dan inventory, mendeteksi risiko, memberi rekomendasi, membuat laporan, serta menjalankan workflow seperti restock alert, promo generation, payment, kitchen queue, dan self-order.

## Branch Purpose

Branch ini adalah **clean blueprint** untuk implementasi dan rebuild dari awal.

Gunakan branch ini kalau ingin membangun ulang Coffeelot dari nol, tapi tetap memakai roadmap dan scope MVP terbaru. i tried to build a clean adn replicatable blueprint for the Coffeelot.

## Updated MVP Roadmap

### Milestone 1 — Project Brain

Dokumentasi awal, agent instructions, roadmap, dan architecture docs.

### Milestone 2 — Database Foundation

SQLite + Prisma schema, migration, seed demo tenant/outlet/user, products, inventory, recipes, dan sample orders.

### Milestone 3 — Backend Foundation

Elysia API server, Prisma client, tenant context, products, inventory, orders, stock engine, invoice generator, dan operational reports.

### Milestone 4 — Built-in POS / Order Channels

Built-in POS bukan cuma layar kasir. Milestone ini mencakup:

- cashier POS product grid
- cart management
- manual cart/custom item input
- checkout flow
- receipt/invoice preview
- kitchen/barista queue
- prep status: `new → preparing → ready → completed`
- QR order link generator
- self-order via chat
- customer chat cart flow
- chat order masuk ke POS + kitchen queue

Detail: baca [`docs/ORDER-CHANNELS.md`](docs/ORDER-CHANNELS.md).

### Milestone 5 — DOKU Payment Integration

Payment menjadi milestone sebelum Agent Core:

- DOKU MCP sandbox connection
- QRIS payment generation
- Virtual Account payment
- payment status checking
- webhook/callback handling
- payment UI di POS checkout
- payment confirmation → order paid + stock deduction

### Milestone 6 — AI Agent Core

Agent runtime foundation:

- workflow registry
- execution loop
- scheduler
- event trigger system
- agent run/output storage
- agent dashboard activity timeline

### Milestone 7 — Agent Workflows

Workflow AI operasional:

- Daily Report
- Restock Alert
- Risk Detection
- Promo Generation
- Morning Briefing

### Milestone 8 — POS Connector

Agar Coffeelot bisa colok ke POS eksisting:

- CSV/Excel import
- data mapping/transformation
- import history & validation
- scheduled import later

## What Coffeelot Does

- 📊 **Daily Report** — ringkasan performa harian otomatis
- ⚠️ **Restock Alert** — deteksi stok rendah + rekomendasi restock
- 🎯 **Promo Generation** — ide promo berdasarkan pola penjualan
- 🔍 **Risk Detection** — early warning stok, revenue drop, dan operasional
- ☀️ **Morning Briefing** — fokus hari ini + prep checklist
- 🧾 **Built-in POS** — kasir internal untuk user yang belum punya POS
- 👨‍🍳 **Kitchen Queue** — barista klik order masuk → proses → ready → completed
- 💬 **Self-order via Chat** — QR → chat cart → order masuk POS/kitchen
- 💳 **DOKU Payment** — QRIS, VA, e-wallet/payment link via sandbox integration

## Key Differentiator

- **Bukan POS app biasa** — Coffeelot adalah AI Agent layer di atas data operasional.
- **Colok ke POS manapun** — owner tidak wajib ganti POS yang sudah ada.
- **Built-in POS tersedia** — untuk kedai yang belum punya POS.
- **Order channel lengkap** — cashier POS, manual cart, kitchen queue, dan self-order via chat.
- **Payment sebelum Agent Core** — payment dibuat stabil dulu agar agent punya data transaksi yang valid.
- **Autonomous analysis, human-approved action** — agent boleh analisis dan buat draft, aksi penting tetap butuh approval owner.

## Clean Blueprint Quick Start

Karena branch ini belum berisi implementasi, quick start-nya adalah membaca blueprint lalu mulai milestone baru.

```bash
# Clone repo
git clone <repo-url>
cd coffeelot

# Checkout clean blueprint branch
git checkout blueprint/clean-updated-milestones

# Buat branch implementasi baru dari blueprint
git checkout -b feat/milestone-2-database-foundation
```

Setelah mulai implementasi Milestone 2, barulah tambahkan runtime/dependency seperti Bun workspace, Prisma, Elysia, React, dan seterusnya.

## Planned Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Frontend**: React + Vite + Tailwind CSS/shadcn-style components
- **Backend**: Elysia.js
- **Database**: SQLite + Prisma ORM
- **Validation**: Zod
- **Charts**: Recharts
- **AI**: OpenAI-compatible API
- **Scheduler**: cron-based (`bun-cron` atau `node-cron`)
- **Payment**: DOKU MCP Server sandbox

## Planned Project Structure

Struktur ini belum ada di clean blueprint branch. Buat saat implementasi dimulai.

```text
coffeelot/
├── AGENTS.md
├── PROJECT_STATUS.md
├── ROADMAP.md
├── TODO.md
├── CHANGELOG.md
├── apps/
│   ├── web/                  # Frontend React + Vite
│   └── api/                  # Backend Elysia.js
├── packages/shared/          # Shared types & utilities
├── modules/                  # Specs & documentation per module
├── prisma/                   # Database schema & migrations
├── docs/                     # Dokumentasi arsitektur
└── scripts/                  # Utility scripts
```

## Important Docs

- [`AGENTS.md`](AGENTS.md) — instruksi utama untuk coding agent
- [`ROADMAP.md`](ROADMAP.md) — milestone terbaru
- [`TODO.md`](TODO.md) — task aktif untuk mulai implementasi
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur sistem
- [`docs/DATABASE-SCHEMA.md`](docs/DATABASE-SCHEMA.md) — schema database target
- [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) — kontrak API target
- [`docs/ORDER-CHANNELS.md`](docs/ORDER-CHANNELS.md) — POS, kitchen, self-order, QR, chat cart

## Target User

- Owner kedai kopi kecil
- Coffee cart operator
- Booth minuman event
- UMKM F&B
- Owner yang sudah punya POS dan tidak mau ganti sistem

## License

Private — All rights reserved.
