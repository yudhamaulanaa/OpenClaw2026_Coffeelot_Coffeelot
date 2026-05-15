# Coffeelot Demo Video Script

Purpose: wrap-up demo video for Coffeelot MVP + AI Business Intelligence expansion.  
Target length: 4–6 minutes.  
Tone: confident, product-demo style, Indonesian narration.

---

## Video Structure

1. Opening / positioning
2. Problem
3. Product walkthrough
4. AI Agent + BI Insight demo
5. Technical credibility
6. Roadmap / closing

---

## Scene 1 — Opening

**Visual:** Coffeelot logo/title slide or homepage.

**Narration:**

> Ini adalah Coffeelot, AI Business Intelligence dan Operations Agent untuk coffee shop dan bisnis F&B kecil.
> Coffeelot bukan hanya POS. Coffeelot membaca transaksi, inventory, payment, booking, dan kitchen queue, lalu mengubahnya menjadi insight dan rekomendasi operasional untuk owner.

**On-screen text:**

- Coffeelot ☕
- AI Business Intelligence & Operations Agent
- POS • Payment • Inventory • Booking • AI Insight

---

## Scene 2 — Problem

**Visual:** Simple slide showing scattered tools: POS, payment, inventory, kitchen, booking, reports.

**Narration:**

> Masalah utama coffee shop kecil adalah datanya tersebar. POS mencatat transaksi, payment ada di provider, stok sering dicek manual, kitchen queue berdiri sendiri, dan owner tetap harus membaca semua laporan sendiri.
> Dashboard biasa hanya menampilkan angka. Tapi owner masih harus menjawab pertanyaan paling penting: apa yang harus dilakukan hari ini?

**On-screen text:**

- Data scattered
- Reports are passive
- Owner still makes all decisions manually

---

## Scene 3 — POS Walkthrough

**Visual:** Open `https://coffeelot.app/`.

**Actions:**

1. Show product grid.
2. Add item to cart.
3. Show projected stock panel.
4. Show kitchen queue.
5. Mention auto-refresh.

**Narration:**

> Di halaman POS, kasir bisa membuat order langsung dari product grid. Coffeelot juga membaca recipe setiap produk, jadi stok yang terpakai bisa diproyeksikan bahkan sebelum checkout.
> Kalau stok tidak cukup, checkout bisa diblokir supaya customer tidak membayar order yang tidak bisa dipenuhi.
> Setelah order masuk, kitchen queue menampilkan status barista: new, preparing, ready, sampai completed.

**On-screen callouts:**

- Built-in POS
- Projected stock from cart
- Kitchen queue
- 5-second refresh

---

## Scene 4 — Customer Self-Order / Chat Order

**Visual:** Open `https://coffeelot.app/chat?table=A1&name=Demo`.

**Actions:**

1. Show customer name/table.
2. Add menu to cart.
3. Choose QRIS or VA BCA.
4. Checkout.
5. Show payment box.
6. Show check payment button / status area.

**Narration:**

> Coffeelot juga punya customer-facing order page. Ini bisa dipakai untuk QR table order atau webchat order.
> Customer memilih menu, checkout, lalu Coffeelot membuat payment melalui DOKU sandbox, seperti QRIS atau Virtual Account BCA.
> Setelah checkout, kontrol order dikunci, payment ditampilkan, dan status order/kitchen bisa dipantau dalam halaman yang sama.

**On-screen callouts:**

- `/chat` self-order
- QRIS / VA BCA
- Payment + order status in one page

---

## Scene 5 — Payment & Inventory Reliability

**Visual:** Show payment status / API or dashboard summary.

**Narration:**

> Coffeelot tidak hanya membuat payment. Sistem juga punya reconciliation fallback untuk mengecek status pembayaran ke DOKU jika callback belum masuk.
> Ketika payment sudah paid, order ditandai paid dan inventory dikurangi berdasarkan recipe secara idempotent.
> Ini penting karena data sales dan stock harus sinkron sebelum dipakai oleh AI Agent.

**On-screen callouts:**

- DOKU MCP sandbox
- Manual + polling reconciliation
- Paid order → stock deduction
- Insufficient stock guard

---

## Scene 6 — Agent Dashboard

**Visual:** Open `https://coffeelot.app/agent`.

**Actions:**

1. Show workflow buttons.
2. Show Insight Comparison table.
3. Show individual insight cards.

**Narration:**

> Bagian paling penting ada di Agent Dashboard. Coffeelot punya workflow engine yang bisa dijalankan manual, scheduled, atau event-triggered.
> Output workflow disimpan sebagai agent runs dan agent outputs.
> Di sini ada comparison table supaya owner bisa membandingkan insight dari masing-masing workflow secara jelas.

**On-screen callouts:**

- Agent Workflow Runner
- LLM Insight
- Insight Comparison Table
- Approval flow

---

## Scene 7 — AI Insight Workflows

**Visual:** Show list of workflows on `/agent`.

**Narration:**

> Saat ini Coffeelot sudah punya 11 workflow. Mulai dari daily report, restock alert, risk detection, promo generation, morning briefing, booking seat insight, sampai BI workflow seperti menu engineering, demand forecast, prep planning, kitchen SLA, dan payment reconciliation insight.

**On-screen text:**

1. Daily Report
2. Restock Alert
3. Risk Detection
4. Promo Generation
5. Morning Briefing
6. Booking Seat Insight
7. Menu Engineering
8. Demand Forecast
9. Prep Planning
10. Kitchen SLA
11. Payment Reconciliation Insight

---

## Scene 8 — Booking Seat Insight

**Visual:** Show booking insight card on `/agent`, or use API response if UI data exists.

**Narration:**

> Coffeelot juga mulai masuk ke reservation intelligence. Booking Seat Insight menghitung seat yang tersedia berdasarkan booking aktif dan window kedatangan.
> Jika ada tamu booking yang akan datang, Coffeelot bisa menjaga availability seat agar tidak double-booked dan memberi action ke floor team.

**On-screen callouts:**

- Booking capacity guard
- Overlap-based reserved seats
- Arrival watchlist
- Seat actions

---

## Scene 9 — Business Intelligence Layer

**Visual:** Insight comparison table with BI rows.

**Narration:**

> Ini yang membuat Coffeelot naik kelas menjadi business intelligence. Workflow seperti menu engineering membaca menu mana yang kuat atau lemah. Demand forecast membaca potensi demand berikutnya. Prep planning memberi checklist bahan. Kitchen SLA melihat bottleneck operasional. Payment reconciliation insight memonitor pending payment.
>
> Jadi Coffeelot tidak hanya menjawab “apa yang terjadi”, tapi juga “apa yang harus dilakukan”.

**On-screen callouts:**

- Menu Engineering
- Demand Forecast
- Prep Planning
- Kitchen SLA
- Payment Reconciliation

---

## Scene 10 — Technical Foundation

**Visual:** Architecture slide or code/docs quick view.

**Narration:**

> Secara teknis, Coffeelot dibangun dengan Bun, TypeScript, Elysia API, React/Vite frontend, Prisma SQLite, DOKU MCP sandbox, dan OpenClaw + GPT-5.5 AI stack.
> Secrets disimpan runtime-only. Workflow punya fallback rule-based jika LLM tidak tersedia.

**On-screen text:**

- Bun + TypeScript
- Elysia API
- React/Vite
- Prisma SQLite
- DOKU MCP
- OpenClaw agent runtime
- GPT-5.5 main LLM model
- Rule-based fallback

---

## Scene 11 — Current Status

**Visual:** Milestone completion slide.

**Narration:**

> Untuk MVP ini, Milestone 1 sampai 7 sudah terbangun untuk foundation. Milestone 8 POS Connector memang belum dikerjakan karena sengaja dikecualikan untuk fase ini.
> Fokus berikutnya adalah hardening: rate limiter, UX polish untuk chat tracker, QR table generator, booking UI, dashboard BI yang lebih kaya, dan konfirmasi real DOKU callback delivery.

**On-screen text:**

- Milestone 1–7: MVP foundation complete
- Milestone 8: skipped intentionally
- Next: hardening + polish + connector

---

## Scene 12 — Closing

**Visual:** Coffeelot title/logo.

**Narration:**

> Coffeelot dimulai dari POS dan payment, tapi arahnya jelas: menjadi AI operating system untuk coffee shop.
> Owner tidak hanya melihat angka, tapi mendapat rekomendasi operasional yang bisa langsung ditindaklanjuti.
>
> Coffeelot — from daily transactions to autonomous operational intelligence.

**On-screen text:**

Coffeelot ☕  
AI Business Intelligence & Operations Agent for Coffee Shops

---

## Recording Checklist

Before recording:

- [ ] Open browser tabs:
  - `https://coffeelot.app/`
  - `https://coffeelot.app/chat?table=A1&name=Demo`
  - `https://coffeelot.app/agent`
  - `https://api.coffeelot.app/api/health`
- [ ] Make sure API and web services are active.
- [ ] Prepare one demo product/order flow.
- [ ] Run/refresh agent workflows if latest BI rows are needed.
- [ ] Hide secrets and runtime env files.
- [ ] Avoid showing private API keys, DOKU credentials, or server env values.

Recommended screen recording sections:

1. 20s title/problem slide
2. 60s POS demo
3. 60s `/chat` order/payment demo
4. 90s `/agent` AI/BI insight demo
5. 40s architecture/status slide
6. 20s closing

---

## Optional Voiceover Short Version

> Coffeelot adalah AI Business Intelligence dan Operations Agent untuk coffee shop. Ia menggabungkan POS, customer self-order, DOKU payment, inventory, booking, kitchen queue, dan LLM-powered insight dalam satu sistem.
>
> POS biasa hanya mencatat transaksi. Coffeelot membaca data operasional dan memberi rekomendasi: stok apa yang rawan, menu mana yang harus didorong, demand apa yang perlu disiapkan, apakah kitchen queue mulai terlambat, dan apakah ada pembayaran yang harus direconcile.
>
> Dengan Agent Workflow, Coffeelot bisa menjalankan daily report, restock alert, risk detection, promo generation, booking seat insight, menu engineering, demand forecast, prep planning, kitchen SLA, dan payment reconciliation insight.
>
> Coffeelot bukan hanya dashboard. Ini adalah agent layer yang membantu owner mengambil keputusan operasional lebih cepat dan lebih aman.
