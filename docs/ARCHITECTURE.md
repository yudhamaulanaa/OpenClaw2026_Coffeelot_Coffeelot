# Coffeelot — Architecture

## System Overview

Coffeelot adalah AI Agent layer yang duduk di atas data source (POS + Inventory) dan payment layer (DOKU).

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                  │
│                   apps/web                           │
│                                                      │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ General UI   │  │   Agent Dashboard          │   │
│  │ (POS, Inv)   │  │   (Activity, Results)      │   │
│  └──────────────┘  └────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────┐
│                   Backend (Elysia.js)                 │
│                      apps/api                        │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │              AI AGENT LAYER                  │    │
│  │                                             │    │
│  │  ┌───────────┐ ┌────────┐ ┌──────────┐    │    │
│  │  │ Scheduler │ │ Events │ │ On-Demand│    │    │
│  │  └─────┬─────┘ └───┬────┘ └────┬─────┘    │    │
│  │        └────────────┼───────────┘          │    │
│  │              ┌──────▼──────┐               │    │
│  │              │ Agent Core  │               │    │
│  │              │ (Workflows) │               │    │
│  │              └──────┬──────┘               │    │
│  │                     │                      │    │
│  │  ┌─────────────────┼─────────────────┐    │    │
│  │  │ Workflows:                         │    │    │
│  │  │ • daily-report                     │    │    │
│  │  │ • restock-alert                    │    │    │
│  │  │ • risk-detection                   │    │    │
│  │  │ • promo-generation                 │    │    │
│  │  │ • morning-briefing                 │    │    │
│  │  └───────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           DATA SOURCE LAYER                  │    │
│  │                                             │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐   │    │
│  │  │ Cashier  │  │ Kitchen  │  │ Chat   │   │    │
│  │  │ POS      │  │ Queue    │  │ Order  │   │    │
│  │  └──────────┘  └──────────┘  └────────┘   │    │
│  │  ┌───────────────────────┐  ┌────────┐   │    │
│  │  │ POS Connector         │  │ Orders │   │    │
│  │  │ (CSV import / API)    │  │ Stock  │   │    │
│  │  └───────────────────────┘  └────────┘   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           PAYMENT LAYER (DOKU MCP)           │    │
│  │                                             │    │
│  │  ┌────────┐  ┌────┐  ┌──────────┐         │    │
│  │  │  QRIS  │  │ VA │  │ e-Wallet │         │    │
│  │  └────────┘  └────┘  └──────────┘         │    │
│  │                                             │    │
│  │  Connected via MCP Server (sandbox)         │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │         Tenant Context Middleware         │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                SQLite Database                        │
│         Single DB, Shared Schema, tenant_id          │
└─────────────────────────────────────────────────────┘
```

## Multi-Tenant Model

```
Tenant (Brand/Business)
  └── Outlet (Location/Booth/Cart)
       └── Users (Cashier/Manager/Owner)
```

- Single database (SQLite), shared schema
- tenant_id column on all operational tables
- outlet_id on location-specific tables
- No row-level security for MVP


## Built-in POS, Self-order, and Kitchen Architecture

Milestone 4 now covers the operational order flow before the AI layer:

```text
Cashier POS ───────┐
Manual cart ───────┼──→ Order Pipeline ──→ Payment/paid state ──→ Stock Engine
Self-order chat ───┘                              │
                                                  ▼
                                          Kitchen / Barista Queue
                                          new → preparing → ready → completed
```

Key principles:

- Cashier POS, manual cart, and self-order chat should use the same order pipeline.
- Payment/order status is separate from kitchen preparation status.
- Stock deduction remains centralized in the stock engine.
- Kitchen queue should receive paid/accepted orders from both cashier and chat channels.
- QR self-order generates an order/chat session scoped by tenant, outlet, and optionally table.

See `docs/ORDER-CHANNELS.md` for Milestone 4 details.

## AI Agent Architecture

### Execution Model

```
┌─────────────────────────────────────────┐
│           TRIGGER SOURCES               │
│                                         │
│  Scheduled    Event-Driven   On-Demand  │
│  (cron)       (stock low,    (owner     │
│               order spike)    clicks)   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           AGENT CORE                    │
│                                         │
│  1. Receive trigger                     │
│  2. Select workflow                     │
│  3. Gather data (structured JSON)       │
│  4. Call AI API                         │
│  5. Parse response                      │
│  6. Save output to DB                   │
│  7. Notify dashboard                    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           OUTPUT                         │
│                                         │
│  • agent_runs (execution log)           │
│  • agent_outputs (results per run)      │
│  • Dashboard renders timeline           │
└─────────────────────────────────────────┘
```

### Workflow Interface

```typescript
interface AgentWorkflow {
  id: string;                    // e.g., "daily-report"
  name: string;                  // e.g., "Daily Report"
  triggers: TriggerType[];       // scheduled | event | on-demand
  schedule?: string;             // cron expression (if scheduled)
  eventCondition?: () => boolean;
  
  gatherData(ctx: TenantContext): Promise<WorkflowInput>;
  buildPrompt(data: WorkflowInput): string;
  parseOutput(aiResponse: string): WorkflowOutput;
  onComplete(output: WorkflowOutput): Promise<void>;
}
```

### Agent Database Tables

```
agent_runs
├── id (UUID)
├── tenant_id
├── outlet_id
├── workflow_id (e.g., "daily-report")
├── trigger_type (scheduled | event | on-demand)
├── status (running | completed | failed)
├── started_at
├── completed_at
├── error_message (nullable)
└── created_at

agent_outputs
├── id (UUID)
├── run_id (FK → agent_runs)
├── tenant_id
├── output_type (report | alert | recommendation | promo)
├── title
├── content (JSON)
├── metadata (JSON, nullable)
└── created_at
```

## DOKU Payment Architecture

### Integration via MCP

```
┌──────────────────────────────────────────┐
│         Coffeelot Backend                 │
│                                          │
│  Order checkout                          │
│       │                                  │
│       ▼                                  │
│  Payment Service                         │
│       │                                  │
│       ▼                                  │
│  DOKU MCP Client ──── SSE ────┐         │
│                                │         │
└────────────────────────────────┼─────────┘
                                 │
                    ┌────────────▼──────────┐
                    │  DOKU MCP Server      │
                    │  (sandbox)            │
                    │                       │
                    │  • create_checkout    │
                    │  • generate_qris      │
                    │  • generate_va        │
                    │  • check_status       │
                    └───────────────────────┘
```

### Payment Flow

```
Customer checkout di POS
    │
    ▼
Select payment method (QRIS / VA / e-Wallet)
    │
    ▼
Backend calls DOKU MCP tool
    │
    ├── QRIS → generate_qris → return QR code
    ├── VA → generate_payment_virtual_account → return VA number
    └── e-Wallet → redirect to e-Wallet app
    │
    ▼
Customer pays
    │
    ▼
DOKU callback/polling → payment confirmed
    │
    ▼
Order status → paid → trigger stock deduction → enter kitchen queue
```

### Payment Database Tables

```
payments
├── id (UUID)
├── tenant_id
├── outlet_id
├── order_id (FK → orders)
├── doku_invoice_id
├── payment_method (qris | va_bca | va_bni | ovo | gopay | dana | shopee_pay)
├── amount
├── status (pending | paid | expired | failed)
├── payment_url (nullable)
├── qr_code (nullable)
├── va_number (nullable)
├── paid_at (nullable)
├── expired_at
├── raw_response (JSON)
├── created_at
└── updated_at
```

## Data Flow: Order → Stock Deduction

```
Cashier submits order
    │
    ▼
Create Order (status: draft)
    │
    ▼
Payment via DOKU (QRIS/VA/e-Wallet)
    │
    ▼
Payment confirmed → Order status: paid
    │
    ▼
For each order_item:
    ├── Find product_recipes for product
    ├── Calculate: qty_used × order_item.qty
    ├── Deduct inventory_items.current_stock
    └── Create stock_movement (type: sale)
    
All within a single database transaction.
```

## Data Flow: Agent Daily Report

```
Scheduler triggers "daily-report" workflow
    │
    ▼
Agent Core creates agent_run (status: running)
    │
    ▼
Workflow gathers data:
    ├── Total revenue & orders (today)
    ├── Best selling products
    ├── Critical stock items
    └── Comparison with yesterday
    │
    ▼
Build structured JSON input → Send to AI API
    │
    ▼
Parse AI response (summary, highlights, risks, recommendations)
    │
    ▼
Save to agent_outputs → Dashboard shows new report
```

## POS Connector Architecture

```
┌─────────────────────────────────────┐
│         POS CONNECTOR               │
│                                     │
│  ┌───────────┐  ┌───────────────┐  │
│  │CSV Import │  │ API Sync      │  │
│  │(manual)   │  │ (future)      │  │
│  └─────┬─────┘  └───────┬───────┘  │
│        └────────┬────────┘          │
│          ┌──────▼──────┐            │
│          │ Data Mapper │            │
│          │ & Validator │            │
│          └──────┬──────┘            │
│          ┌──────▼──────┐            │
│          │ Import to   │            │
│          │ local DB    │            │
│          └─────────────┘            │
└─────────────────────────────────────┘
```

For MVP: CSV import only.

## API Design Principles

- All endpoints tenant-aware
- Tenant context from header: x-tenant-id, x-outlet-id
- For MVP: use demo env variables
- RESTful naming
- Zod validation on all request bodies
- Consistent error response format
- Agent endpoints: /api/agent/*
- Payment endpoints: /api/payments/*

## Folder Responsibilities

| Folder | Responsibility |
|--------|---------------|
| apps/web | UI components, pages, client state |
| apps/api | Routes, services, business logic, agent core |
| packages/shared | Types, constants, utilities shared between apps |
| prisma | Schema, migrations, seed |
| modules | Specs & documentation per feature module |
| docs | Architecture, conventions, decisions |
| scripts | Dev utilities, data scripts |
