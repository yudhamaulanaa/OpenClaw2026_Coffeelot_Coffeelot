# Coffeelot Pitch Deck — 5 Slides

**Positioning:** AI Business Intelligence & Operations Agent for coffee shops and small F&B businesses.  
**Prepared for:** Yudha Maulana A  
**Date:** 2026-05-15  
**Stage:** MVP live prototype

---

## Slide 1 — Coffeelot ☕

# AI Business Intelligence & Operations Agent for Coffee Shops

Coffeelot combines POS, customer self-order, DOKU payment, inventory, booking, kitchen queue, and LLM-powered insight into one operational agent.

**Tagline**

> From daily transactions to autonomous operational intelligence.

**What it is**

- Built-in POS and customer order channel.
- Operational system for payment, stock, kitchen, and booking.
- AI agent that explains what happened and recommends what to do next.

**Speaker note**

> Coffeelot bukan hanya POS. Coffeelot adalah agent layer yang membaca data operasional coffee shop dan mengubahnya menjadi keputusan harian untuk owner.

---

## Slide 2 — Problem: F&B Owners Still Operate Blind

Small coffee shops often use disconnected tools:

- POS records sales, but does not explain decisions.
- Inventory is checked manually and often too late.
- Payment status needs manual callback/reconcile checks.
- Kitchen queue, customer order, and booking are not connected.
- BI dashboards show charts, but the owner still has to interpret everything.

**Core problem**

> Owners do not need more raw dashboards. They need operational decisions.

**Example**

Traditional dashboard:
> Revenue turun 30%.

Coffeelot:
> Revenue turun, AOV masih stabil, stok aman. Kemungkinan traffic sepi, bukan problem menu. Jalankan promo slow-hour dan dorong menu dengan stok aman.

---

## Slide 3 — Solution: One AI-Native Operating Layer

Coffeelot is built as four connected layers:

1. **Commerce**
   - POS
   - `/chat` self-order
   - QRIS / VA BCA / DOKU Checkout
   - Kitchen queue

2. **Operations**
   - Inventory
   - Recipe stock deduction
   - Projected cart stock
   - Booking seat availability
   - Payment reconciliation

3. **Intelligence**
   - Daily report
   - Risk detection
   - Promo generation
   - Booking seat insight
   - BI Insight Pack

4. **Autonomy**
   - Scheduler
   - Event triggers
   - Agent run/output history
   - Approval flow
   - `/agent` dashboard

**Live URLs**

- POS: `https://coffeelot.app/`
- Customer order: `https://coffeelot.app/chat`
- Agent dashboard: `https://coffeelot.app/agent`

---

## Slide 4 — Product Demo: From Order to Insight

**Demo flow**

1. Customer/cashier creates order from POS or `/chat`.
2. Coffeelot generates QRIS or VA BCA payment via DOKU sandbox.
3. Payment status is checked through callback/reconciliation fallback.
4. Paid order enters kitchen and deducts recipe inventory.
5. Booking logic preserves seat availability for reserved guests.
6. Agent workflows analyze the operational snapshot.
7. `/agent` shows insight cards and comparison table.

**Implemented AI/BI workflows**

- Daily Report
- Restock Alert
- Risk Detection
- Promo Generation
- Morning Briefing
- Booking Seat Insight
- Menu Engineering
- Demand Forecast
- Prep Planning
- Kitchen SLA
- Payment Reconciliation Insight

**AI + Tech Stack**

- Main AI runtime/tool: OpenClaw
- Main LLM model: GPT-5.5
- Backend/frontend: Bun, TypeScript, Elysia, React/Vite, Prisma SQLite
- Integrations: DOKU MCP sandbox, OpenAI-compatible Chat Completions API

**Key proof**

> Coffeelot already processes real operational signals: orders, payment, inventory, kitchen queue, booking windows, and GPT-5.5-powered LLM insight.

---

## Slide 5 — Why It Matters + Roadmap

**Differentiation**

| Traditional POS | Coffeelot |
|---|---|
| Records sales | Explains sales |
| Shows stock | Prevents oversell and predicts stock risk |
| Shows reports | Generates LLM operational insight |
| Manual payment checks | Reconciliation insight and fallback polling |
| Static dashboard | Agent workflows with recommended actions |

**Current MVP status**

- Milestone 1–7 MVP foundation complete.
- LLM Agent Insight is live.
- BI Insight Pack is live.
- Booking Seat Insight is live.
- DOKU sandbox payment/reconciliation is live.
- Milestone 8 POS Connector intentionally skipped for now.

**Next roadmap**

1. Public endpoint rate limiter.
2. `/chat` order tracker UX polish.
3. QR table/order-link generator.
4. Booking UI and operator calendar/table map.
5. BI dashboard filters/charts.
6. COGS/margin fields for deeper menu engineering.
7. POS connector / CSV import.

**Closing line**

> Coffeelot turns coffee shop data into decisions — and keeps the owner in control.
