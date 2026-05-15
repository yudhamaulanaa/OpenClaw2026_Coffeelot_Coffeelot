# Coffeelot — Agent Instructions

## Project Overview

Coffeelot adalah single autonomous AI Agent yang membantu owner kedai kopi memantau, menganalisis, mengambil keputusan awal, dan menjalankan workflow operasional harian.

> Coffeelot bukan chatbot. Coffeelot adalah operator digital untuk kedai kopi.

### Positioning

Coffeelot BUKAN:
- POS yang ditambahkan fitur AI
- Dashboard analytics biasa
- Chatbot yang menjawab pertanyaan

Coffeelot ADALAH:
- AI Agent untuk operasional kedai kopi
- Autonomous operator yang membaca data, menganalisis, dan menjalankan workflow
- Single agent with multiple tools and workflows (multi-agent later)

### Perbedaan dengan AI Biasa

AI biasa: User bertanya → AI menjawab.
Coffeelot: Agent diberi tujuan → membaca data → menganalisis kondisi → memilih tindakan → menjalankan workflow → menghasilkan output yang bisa langsung dipakai.

### Kalimat Kunci

> AI biasa membantu manusia berpikir. Coffeelot Agent membantu owner kedai kopi menyelesaikan pekerjaan operasional.

### Target User

- Owner kedai kopi kecil
- Coffee cart operator
- Booth minuman event
- UMKM F&B
- Owner yang sudah punya POS dan gak mau ganti

## Current MVP Priority Order

Ikuti urutan roadmap terbaru:

1. **Milestone 4 — Built-in POS**: cashier POS, manual cart/custom item, kitchen/barista queue, self-order via chat, QR order link.
2. **Milestone 5 — DOKU Payment Integration**: QRIS/VA/e-wallet/payment link, payment status, callback/polling, confirmation to paid.
3. **Milestone 6 — AI Agent Core**: workflow registry, execution loop, scheduler/event/on-demand triggers, agent dashboard.
4. **Milestone 7 — Agent Workflows**: daily report, restock alert, risk detection, promo generation, morning briefing.
5. **Milestone 8 — POS Connector**: CSV/import first, API sync later.

Do not start Agent Core before POS + payment foundations are usable unless explicitly asked.

## Agent Identity

### Goal

Membantu owner menjaga operasional kedai kopi tetap sehat setiap hari.

### Data (yang dibaca agent)

- Transaksi POS & omzet harian
- Produk terlaris & histori penjualan
- Stok bahan & inventory movement
- Penggunaan bahan per menu
- Jam ramai & performa produk

### Reasoning (yang dianalisis agent)

Contoh: "Penjualan es kopi susu naik, tapi stok susu tinggal cukup untuk satu hari."

### Tools (yang dipakai agent)

- Membaca sales summary
- Membaca inventory status
- Menghitung stok kritis
- Membuat restock alert
- Membuat laporan harian
- Membuat draft promo
- Menyiapkan pesan WhatsApp (draft)
- Trigger payment via DOKU MCP

### Workflow (yang dijalankan agent)

Contoh: cek penjualan → cek stok → prediksi kebutuhan → rekomendasikan restock → buat alert ke owner.

### Action (output nyata)

- Membuat alert restock
- Membuat daily business brief
- Membuat draft promo
- Membuat rekomendasi pembelian bahan
- Membuat laporan operasional

## Agent Features

### 1. Daily Business Brief

Ringkasan kondisi bisnis harian otomatis.

Output contoh:
"Omzet kemarin Rp1.250.000, naik 18% dari hari sebelumnya. Produk terlaris adalah Es Kopi Susu. Jam ramai terjadi pukul 16.00–18.00. Risiko utama hari ini adalah stok susu yang mulai menipis."

### 2. Inventory Risk Detection

Memantau stok dan mendeteksi risiko kehabisan bahan.

Output contoh:
"Stok susu tinggal 2 liter. Berdasarkan tren penjualan, stok ini cukup untuk 1 hari. Rekomendasi: restock minimal 8 liter sebelum besok sore."

### 3. AI Restock Recommendation

Rekomendasi jumlah restock berdasarkan data penjualan dan pemakaian bahan.

Output contoh:
"Dalam 3 hari terakhir, rata-rata pemakaian susu adalah 2,7 liter per hari. Untuk kebutuhan 3 hari ke depan, disarankan restock minimal 8–10 liter."

### 4. Smart Promo Recommendation

Analisis produk yang performanya turun, stok berlebih, atau peluang jam ramai.

Output contoh:
"Stok croissant masih tinggi, tapi penjualan menurun. Rekomendasi promo: Bundle Kopi Susu + Croissant untuk jam 14.00–17.00."

Draft promo:
"Ngopi sore lebih hemat! Beli Kopi Susu + Croissant cuma Rp25.000 hari ini jam 14.00–17.00."

### 5. Operational Alert

Alert aktif untuk owner:
- Stok bahan kritis
- Cup/packaging hampir habis
- Produk tertentu turun penjualan
- Omzet hari ini lebih rendah dari rata-rata
- Bahan tertentu cepat habis
- Menu yang margin-nya kurang sehat

### 6. AI Daily Insight

Insight harian berbasis data.

Output contoh:
"Hari ini performa kedai cukup baik. Produk kopi susu masih menjadi kontributor utama omzet. Namun ada risiko stok susu dan cup 16oz. Rekomendasi prioritas: restock susu, dorong promo croissant, dan siapkan stok lebih banyak untuk jam sore."

### 7. Draft WhatsApp / Customer Message

Menyiapkan pesan promosi atau follow-up (draft, belum kirim).

Output contoh:
"Halo kak, hari ini ada promo Kopi Susu + Croissant khusus jam 14.00–17.00. Cocok buat teman ngopi sore ☕"

### 8. Human-Approved Action

Prinsip: **Autonomous analysis, human-approved action.**

Agent BOLEH otomatis:
- Membaca data
- Menganalisis
- Memberi rekomendasi
- Membuat draft
- Membuat alert

Aksi penting BUTUH konfirmasi owner:
- Kirim WhatsApp ke customer
- Order ke supplier
- Ubah harga menu
- Jalankan campaign besar

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Elysia.js
- Database: SQLite + Prisma ORM
- Validation: Zod
- Charts: Recharts
- AI: OpenAI-compatible API (provider replaceable)
- Scheduler: cron-based (bun-cron atau node-cron)
- Payment: DOKU MCP Server (sandbox mode)

## Architecture

- Monorepo: apps/web, apps/api, packages/shared
- Multi-tenant: single database, shared schema, tenant_id column
- Tenant-ready, not tenant-heavy
- All operational queries scoped by tenant_id
- Outlet-level queries scoped by tenant_id + outlet_id
- Single AI Agent sebagai autonomous layer di atas data layer
- Milestone 4 includes cashier POS, manual cart/custom item, self-order chat, QR order link, and kitchen/barista queue
- Payment integration is Milestone 5 and comes before Agent Core

Read docs/ARCHITECTURE.md for full system design.
Read docs/DATABASE-SCHEMA.md for complete database schema (SQLite + Prisma).
Read docs/API-CONTRACTS.md for all API endpoints.
Read docs/ORDER-CHANNELS.md for Milestone 4 POS, kitchen, self-order, QR, and chat cart scope.

### System Layers

```
┌─────────────────────────────────────────┐
│         Dashboard (Agent Activity)       │  ← Owner lihat hasil agent di sini
├─────────────────────────────────────────┤
│         COFFEELOT OPS AGENT             │  ← Single Agent
│  ┌─────────┐ ┌────────┐ ┌───────────┐  │
│  │Scheduler│ │ Events │ │ On-Demand │  │
│  └────┬────┘ └───┬────┘ └─────┬─────┘  │
│       └──────────┼─────────────┘        │
│           ┌──────▼──────┐               │
│           │ Agent Core  │               │
│           │ (workflows) │               │
│           └──────┬──────┘               │
├──────────────────┼──────────────────────┤
│          ORDER SOURCE LAYER             │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Cashier   │ │Kitchen   │ │Chat    │ │
│  │POS/Cart  │ │Queue     │ │Order   │ │
│  └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ External POS Connector/Import    │ │
│  └──────────────────────────────────┘ │
├─────────────────────────────────────────┤
│       PAYMENT LAYER (DOKU MCP)          │
├─────────────────────────────────────────┤
│         Database (SQLite)               │
└─────────────────────────────────────────┘
```

## Project Context Files

- **PROJECT_STATUS.md** — Baca ini PERTAMA untuk tahu posisi terakhir project
- **TODO.md** — Daftar task aktif, kerjakan dari sini
- **ROADMAP.md** — Arah besar, jangan menyimpang dari ini
- **CHANGELOG.md** — Update ini setiap kali selesai task

## Modules (Planned)

Project ini akan terdiri dari module-module berikut. Buat folder `modules/{name}/` saat mulai develop module tersebut.

### Core — Coffeelot Ops Agent

| Module | Fungsi |
|--------|--------|
| agent-core | Agent orchestrator, workflow engine, execution loop |
| agent-workflows | Workflow definitions (8 features di atas) |
| agent-scheduler | Cron/scheduled triggers |
| agent-dashboard | UI halaman agent activity & results |

### Data Source — POS & Inventory

| Module | Fungsi |
|--------|--------|
| pos | Built-in cashier POS, product grid, cart, manual/custom item checkout |
| kitchen | Barista order queue, prep status, waiting time display |
| self-order | QR order link, chat cart session, customer self-order flow |
| pos-connector | Adapter untuk colok ke POS eksisting (import/sync) |
| products | Product management |
| inventory | Inventory management |
| recipes | Product recipe (bahan per produk) |
| orders | Order management |
| stock-engine | Auto stock deduction |

### Payment

| Module | Fungsi |
|--------|--------|
| payment | DOKU integration via MCP Server (QRIS, VA, e-Wallet) |

### Foundation

| Module | Fungsi |
|--------|--------|
| tenant-context | Tenant & outlet scoping |
| dashboard | General dashboard & summary |

### When Starting a New Module

Create this structure:

```
modules/{module-name}/
├── AGENTS.md        # Rules spesifik module (inherit from root AGENTS.md)
├── STATUS.md        # Progress tracking module
├── TODO.md          # Active tasks for this module
└── specs/           # Blueprint per fitur dalam module
    └── {feature}/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Agent Execution Model

### Single Agent Architecture (MVP)

```
Coffeelot Ops Agent
├── Tools: sales_summary, inventory_status, stock_critical, ...
├── Workflows: daily_brief, restock_alert, promo_gen, risk_detect, ...
└── Output: alerts, reports, drafts, recommendations
```

Multi-agent (future):
- Inventory Agent
- Sales Analyst Agent
- Promo Agent
- Customer Service Agent

Untuk sekarang: **Single Agent dulu. Multi-agent later.**

### Trigger Types

1. **Scheduled (Cron)** — Daily brief, morning briefing, end-of-day summary
2. **Event-driven** — Trigger saat stok rendah, order spike, anomaly detected
3. **On-demand** — Owner klik tombol di dashboard

### Agent Output

- Semua output ditampilkan di Agent Dashboard page
- Format output: structured JSON → rendered as cards/timeline di UI
- Historical: semua output disimpan dan bisa di-browse
- Aksi penting butuh approval owner (human-in-the-loop)

## DOKU Payment Integration

### Overview

Payment menggunakan DOKU MCP Server (sandbox mode). Untuk MVP, payment terutama dipakai POS dan self-order chat; Agent-triggered payment boleh menyusul setelah human-approved action model jelas.

### Supported Payment Methods

- QRIS (dynamic QR code)
- Virtual Account (BCA, BNI, BRI, Mandiri, dll)
- E-Wallet (OVO, GoPay, DANA, ShopeePay)

### MCP Configuration

```json
{
  "mcpServers": {
    "doku-payment": {
      "type": "sse",
      "url": "https://mcp-sandbox.doku.com/sse",
      "headers": {
        "Authorization": "Basic <base64_encoded_api_key>"
      }
    }
  }
}
```

### Key Tools (from DOKU MCP)

- `create_checkout_link` — Generate hosted payment page
- `create_payment_link` — Generate shareable payment link
- `generate_payment_virtual_account` — Create VA number
- `generate_qris` — Generate QRIS dynamic QR
- `get_merchant_payment_methods` — List available methods
- `check_payment_status` — Check transaction status

### Environment Variables

```env
DOKU_API_KEY=sandbox_api_key_here
DOKU_MCP_URL=https://mcp-sandbox.doku.com/sse
```

## Built-in POS / Order Channels (Milestone 4)

Milestone 4 is broader than a cashier screen. It includes:

### Cashier POS

- Product grid
- Category filter
- Cart management
- Manual cart/custom item input
- Checkout flow
- Receipt/invoice preview

### Kitchen / Barista Queue

- Queue shows paid/accepted orders that are not completed
- Prep status flow: `new → preparing → ready → completed`
- Barista can click actions per order
- Highlight waiting time/order age
- Tablet-friendly UI

### Self-order via Chat

- QR order link generator per outlet/table/session
- Customer chat cart flow
- Chat order enters the same POS order pipeline
- After payment confirmation, order enters kitchen queue

Keep these order channels on one shared order/inventory/reporting pipeline.

## POS Connector Concept

Coffeelot bisa menerima data dari POS eksisting via:
- CSV/Excel import (manual upload)
- API sync (jika POS punya API)
- Webhook receiver (jika POS bisa push)
- Built-in POS (kalau owner belum punya)

Untuk MVP: fokus Built-in POS Milestone 4 (cashier POS + kitchen + self-order chat) lalu DOKU Payment Milestone 5. POS Connector/CSV import tetap Milestone 8.

## Coding Conventions

- Prefer readable code over clever abstraction
- Use service layer for business logic
- Validate request body with Zod
- Use database transactions for order + stock deduction
- Keep payment/order lifecycle separate from kitchen prep lifecycle
- Route cashier, manual cart, self-order chat, and connector orders through shared order pipeline
- Keep AI prompt in separate file/service
- Never hardcode API keys
- Use UUID primary keys
- Use timestamps: created_at, updated_at
- Use numeric for price and stock quantities
- Agent workflows harus idempotent (safe to re-run)

## Naming Conventions

- Files: kebab-case (e.g., stock-engine.service.ts)
- Variables/functions: camelCase
- Types/interfaces: PascalCase
- Database tables: snake_case plural (e.g., order_items)
- API routes: kebab-case (e.g., /api/inventory/:id/restock)
- Agent workflows: kebab-case (e.g., daily-report, restock-alert)

## Business Rules (Critical)

1. All queries MUST be scoped by tenant_id
2. Outlet-level queries MUST include outlet_id
3. Invoice format: CLT-YYYYMMDD-0001 (unique per tenant)
4. Only paid orders deduct stock
5. Stock deduction uses product_recipes
6. Prevent checkout if stock would go below zero
7. AI input must be structured JSON, never raw SQL
8. Order statuses: draft, pending_payment, paid, cancelled
9. Prep statuses: new, preparing, ready, completed
10. Order channels: cashier, manual, chat, connector
11. Payment methods: cash, qris, transfer, va_bca, va_bni, ovo, gopay, dana, shopee_pay
12. Stock movement types: sale, restock, adjustment, waste
13. Payment/order lifecycle must stay separate from kitchen prep lifecycle
14. Self-order chat must submit into the same order pipeline as cashier POS
15. Agent workflows must be idempotent
16. Agent output must always be saved to database (auditable)
17. Agent must not take destructive actions without owner confirmation (human-approved action)

## What NOT to Build (MVP Boundaries)

- Complex subscription billing
- Complex role-based permission
- WhatsApp broadcast/promo sending production (draft only for MVP; self-order chat flow is in Milestone 4)
- Meta Ads integration
- Advanced multi-outlet analytics
- Custom domain / white-labeling
- Row-level security complexity
- Marketplace/module system
- Real-time POS API sync (CSV import dulu)
- Multi-agent architecture (single agent dulu)

## Workflow

1. Check PROJECT_STATUS.md → understand current state
2. Pick task from TODO.md
3. Check related docs first (`docs/ORDER-CHANNELS.md`, `docs/API-CONTRACTS.md`, `docs/DATABASE-SCHEMA.md`, `docs/ARCHITECTURE.md`)
4. If module specs exist in `modules/{module}/specs/{feature}/`, read requirements/design/tasks
5. If specs do not exist yet, create/update them or document assumptions in TODO/PROJECT_STATUS
6. Implement step by step
7. After done:
   - Mark task [x] in tasks.md
   - Update module TODO.md
   - Update root PROJECT_STATUS.md
   - Add entry to CHANGELOG.md

## After Completing Work

1. Mark completed tasks in tasks.md
2. Update module STATUS.md with current state
3. Update root PROJECT_STATUS.md
4. Add entry to CHANGELOG.md with date and summary
5. Never leave TODO.md or PROJECT_STATUS.md outdated
6. Ensure build is running (no errors)
7. Git commit with clear message
8. Git push to remote

## Git Rules

- Jangan coding langsung di `main`
- Buat branch per milestone besar sebelum mulai development, contoh: `feat/milestone-2-database-foundation`
- Commit kecil tetap boleh di dalam branch milestone selama scope-nya masih satu milestone
- Merge ke `main` hanya ketika 1 milestone besar selesai, build/test clean, dan tidak ada blocker
- `main` harus selalu stabil dan siap dijalankan
- Commit setelah setiap feature / phase selesai dan build clean
- Jangan commit kalau build error
- Commit message format: `feat(module): short description` atau `fix(module): short description`
- Push ke remote setelah setiap commit
- Satu feature/phase = satu commit (jangan campur banyak fitur dalam satu commit)
