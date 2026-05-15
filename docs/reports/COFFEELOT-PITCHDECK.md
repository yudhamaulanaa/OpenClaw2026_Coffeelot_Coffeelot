# Coffeelot Pitch Deck

**Autonomous AI Business Intelligence & Operations Agent for Coffee Shops / Small F&B**

Prepared for: Yudha Maulana A  
Date: 2026-05-15  
Product stage: MVP live prototype

---

## Slide 1 — Title

# Coffeelot ☕

## AI Business Intelligence & Operations Agent for Coffee Shops

Coffeelot combines POS, web self-order, DOKU payments, inventory, booking, kitchen queue, and LLM-powered operational intelligence into one autonomous agent layer.

**Tagline:**
> From transaction data to operational decisions — automatically.

---

## Slide 2 — Problem

Coffee shops and small F&B teams usually operate with scattered tools:

- POS records transactions but does not explain what to do next.
- Inventory is reactive; owners notice problems after stock runs out.
- Payment status and order status often need manual checking.
- Kitchen queue, seat booking, and customer order channels are disconnected.
- BI dashboards show charts, but still require the owner to interpret everything.

**Result:** the owner becomes the analyst, operator, cashier supervisor, and risk monitor at the same time.

---

## Slide 3 — Insight

Most F&B software stops at reporting.

Coffeelot goes further:

> Coffeelot does not only display data — it understands operational context and recommends the next best action.

Example:

Instead of:
> “Revenue is down 30%.”

Coffeelot can say:
> “Revenue is down, but AOV is stable and stock is safe. Likely traffic is weak, not menu performance. Run a short slow-hour promo and push available menu with safe stock.”

---

## Slide 4 — Solution

# Coffeelot

An AI-native operating layer for coffee shops and small F&B businesses.

Core layers:

1. **Commerce Layer**
   - Built-in POS
   - Webchat/self-order
   - QRIS / VA BCA / DOKU Checkout
   - Kitchen queue

2. **Operations Layer**
   - Inventory
   - Recipe-based stock deduction
   - Projected cart stock
   - Booking and seat availability
   - Payment reconciliation

3. **Intelligence Layer**
   - LLM-generated insights
   - Business Intelligence workflows
   - Risk detection
   - Prep planning
   - Menu engineering

4. **Autonomy Layer**
   - Scheduled workflows
   - Event-triggered workflows
   - Approval flow
   - Agent dashboard

---

## Slide 5 — Product Demo Flow

Current live prototype:

- POS: `https://coffeelot.app/`
- Customer order: `https://coffeelot.app/chat`
- Agent dashboard: `https://coffeelot.app/agent`
- API health: `https://api.coffeelot.app/api/health`

Demo sequence:

1. Create order from POS or `/chat`.
2. Generate QRIS or VA BCA payment.
3. Reconcile payment status.
4. Order enters kitchen queue.
5. Paid order deducts recipe inventory.
6. Agent workflows analyze operations.
7. `/agent` comparison table shows differences between insights.

---

## Slide 6 — Built-In POS + Self-Order

Coffeelot includes a working commerce foundation:

- Cashier POS product grid
- Cart and checkout
- QRIS / VA BCA payment UI
- Kitchen/barista queue
- Customer-facing `/chat` order flow
- Customer name and table context
- Payment status and order status on one page
- Live polling for payment/order/kitchen status

This means a shop can start using Coffeelot even before integrating an existing POS.

---

## Slide 7 — Payment & Reconciliation

DOKU sandbox integration is implemented with runtime-only credentials.

Supported MVP payment channels:

- DOKU Checkout
- VA BCA
- QRIS

Payment hardening already includes:

- DOKU MCP tool discovery
- QRIS generation
- VA BCA generation
- Payment status check
- Manual reconcile endpoint
- Pending payment polling fallback
- DOKU callback signature validation
- Paid payment → order paid
- Paid order → recipe stock deduction

Key learning:

> Webhook/callback is ideal, but polling reconciliation is mandatory for reliable MVP operations.

---

## Slide 8 — Inventory Intelligence

Coffeelot already connects sales to inventory through recipes.

Implemented:

- Inventory item status
- Product recipes
- Paid-order stock deduction
- Idempotent sale stock movements
- Backend insufficient stock guard
- Frontend projected cart stock
- Cart checkout blocked when projected stock is insufficient

Operational value:

> The system prevents customers from paying for unfulfillable orders.

---

## Slide 9 — Booking Seat Intelligence

Coffeelot now includes booking/reservation intelligence.

Implemented:

- Booking data model
- Booking APIs
- Seat capacity guard
- Overlapping booking window calculation
- Active statuses counted for seat availability
- LLM-backed `booking_seat_insight`
- `/agent` booking insight display

Default configuration:

- Seat capacity: 24
- Hold duration: 90 minutes

Agent value:

> Coffeelot preserves seat availability when booked guests are expected to arrive and prevents double-booking.

---

## Slide 10 — AI Agent Core

Coffeelot has an internal agent workflow system.

Implemented:

- Workflow registry
- Workflow runner API
- Agent run persistence
- Agent output persistence
- Scheduler
- Event triggers
- Approval flow
- Agent dashboard
- Insight comparison table

Trigger modes:

- On-demand
- Scheduled
- Event-driven after operational changes

---

## Slide 11 — LLM Insight Engine

Coffeelot uses an OpenAI-compatible LLM runtime.

Runtime verified:

- Base URL configured outside repo
- API key stored only in runtime env
- Model: `gpt-5.5`
- Fallback: deterministic rule-based insight if LLM fails

Structured AI insight fields:

- performance status
- highlights
- risks
- restock recommendations
- sales opportunities
- next best actions
- owner message

This makes every insight machine-readable and UI-renderable.

---

## Slide 12 — Business Intelligence Workflow Pack

Coffeelot now has 11 Agent Workflows:

1. `daily_report`
2. `restock_alert`
3. `risk_detection`
4. `promo_generation`
5. `morning_briefing`
6. `booking_seat_insight`
7. `menu_engineering`
8. `demand_forecast`
9. `prep_planning`
10. `kitchen_sla`
11. `payment_reconciliation_insight`

The latest BI pack expands Coffeelot from “agent workflow” into “AI business intelligence”.

---

## Slide 13 — BI Examples

**Menu Engineering**
- Which menu is strong?
- Which menu needs promo?
- Which menu has stock risk?

**Demand Forecast**
- What demand should we expect next?
- What menu and hour should be prepared?

**Prep Planning**
- What should the team prepare before rush hour?

**Kitchen SLA**
- Which order is too old?
- Is the kitchen queue overloaded?

**Payment Reconciliation**
- Which payments are pending too long?
- Does provider status need reconcile?

---

## Slide 14 — Differentiation

Coffeelot is not just another POS.

| Traditional POS | Coffeelot |
|---|---|
| Records sales | Explains sales |
| Shows stock | Predicts operational risk |
| Manual reports | AI-generated insight |
| Payment status only | Payment reconciliation intelligence |
| Static dashboard | Agent workflows |
| Human interprets data | Agent recommends actions |

Key differentiator:

> Autonomous analysis, human-approved action.

---

## Slide 15 — Current MVP Status

Completed / live foundation:

- Database foundation
- Backend API foundation
- Built-in POS
- Webchat/self-order
- Kitchen queue
- DOKU sandbox payments
- Payment reconciliation fallback
- Inventory deduction and stock guard
- Booking seat availability
- AI Agent workflow engine
- LLM-backed Agent Insights
- BI Insight Pack
- Agent dashboard and comparison table

Intentionally skipped for now:

- Milestone 8 POS Connector

---

## Slide 16 — Remaining Risks / Gaps

Known follow-ups:

- Real DOKU callback delivery still needs production/sandbox confirmation.
- Public endpoint rate limiter should be added.
- `/chat` order tracker UX can be polished further.
- QR table generator page should be added.
- Booking UI and calendar/table map are not yet built.
- COGS/margin fields are needed for deeper menu engineering.
- Multi-day historical forecasting is not yet implemented.
- Auth/RBAC is future scope.

---

## Slide 17 — Product Roadmap

Recommended next build order:

1. Public endpoint rate limiter
2. `/chat` tracker UX polish
3. QR table/order-link generator
4. Booking customer form + operator calendar
5. BI dashboard filters/charts
6. COGS/margin tracking
7. Supplier/purchase planning
8. POS connector / CSV import
9. Auth/RBAC and multi-outlet controls
10. WhatsApp notification/agent channel

---

## Slide 18 — Why Now

Small F&B owners increasingly need:

- Low-cost automation
- Faster decisions
- Integrated payment/order/inventory data
- AI assistance that speaks operational language
- Practical recommendations, not generic dashboards

Coffeelot can become the owner’s daily operating copilot.

---

## Slide 19 — Positioning

Recommended positioning:

> Coffeelot is an AI Business Intelligence & Operations Agent for coffee shops and small F&B businesses.

Alternative:

> AI-powered operating system for coffee shops — combining POS, order channels, payments, inventory, booking, and business intelligence.

---

## Slide 20 — Closing

Coffeelot transforms coffee shop data into operational decisions.

It starts as a POS + order + payment + inventory system, but its real value is the agent layer:

- monitors operations,
- detects risks,
- explains what changed,
- recommends what to do,
- and keeps the owner in control.

**Coffeelot ☕ — from daily transactions to autonomous operational intelligence.**
