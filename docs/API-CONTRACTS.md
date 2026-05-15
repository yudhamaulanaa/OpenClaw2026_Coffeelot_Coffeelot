# API Contracts

All endpoints prefixed with `/api`.
Every request must include tenant context via headers (`x-tenant-id`, `x-outlet-id`) or env fallback (`DEMO_TENANT_ID`, `DEMO_OUTLET_ID`).

## Error Envelope

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

## Context

### GET /api/context

Returns resolved tenant and outlet for current request.

**Response 200:**
```json
{
  "tenant": { "id": "uuid", "name": "string" },
  "outlet": { "id": "uuid", "name": "string" }
}
```

### GET /api/outlets

Returns all outlets for current tenant.

**Response 200:**
```json
[{ "id": "uuid", "name": "string", "address": "string | null" }]
```

---

## Products

### GET /api/products

List all products for current tenant.

### GET /api/products/pos

List active products for POS (is_active = true, outlet-scoped).

### POST /api/products

Create product.

**Body:**
```json
{
  "name": "string (required)",
  "category": "string (required)",
  "price": "number >= 0 (required)",
  "is_active": "boolean (default: true)",
  "outlet_id": "uuid (optional, null = shared catalog)"
}
```

### PATCH /api/products/:id

Update product (partial body).

### DELETE /api/products/:id

Soft-disable product (sets is_active = false).

---

## Inventory

### GET /api/inventory

List inventory items for current tenant + outlet. Includes computed `low_stock` boolean.

### POST /api/inventory

Create inventory item.

**Body:**
```json
{
  "name": "string (required)",
  "unit": "string (required)",
  "current_stock": "number >= 0 (required)",
  "minimum_stock": "number >= 0 (required)"
}
```

### PATCH /api/inventory/:id

Update inventory item (name, unit, minimum_stock).

### POST /api/inventory/:id/restock

Restock inventory item.

**Body:**
```json
{ "qty": "number > 0 (required)", "note": "string (optional)" }
```

**Response 200:**
```json
{ "item": { "...updated item..." }, "movement": { "...stock_movement..." } }
```

---

## Recipes

### GET /api/products/:id/recipes

List recipe lines for a product.

### POST /api/products/:id/recipes

Upsert (replace all) recipe lines.

**Body:**
```json
{ "lines": [{ "inventory_item_id": "uuid", "qty_used": "number > 0" }] }
```

### PATCH /api/products/:id/recipes

Add single recipe line.

**Body:**
```json
{ "inventory_item_id": "uuid", "qty_used": "number > 0" }
```

---

## Orders

### POST /api/orders

Create paid order (full checkout). Atomic: order + items + invoice + stock deduction.

**Body:**
```json
{
  "payment_method": "cash | qris | transfer",
  "discount": "number >= 0 (optional)",
  "customer_id": "uuid (optional)",
  "notes": "string (optional)",
  "items": [{ "product_id": "uuid", "qty": "integer >= 1", "notes": "string (optional)" }]
}
```

**Response 200:**
```json
{
  "order": {
    "id": "uuid",
    "invoice_number": "CLT-YYYYMMDD-NNNN",
    "order_status": "paid",
    "payment_method": "cash",
    "subtotal": "Decimal",
    "discount": "Decimal",
    "total": "Decimal"
  },
  "items": [{ "product_id": "uuid", "product_name": "string", "qty": 1, "unit_price": "Decimal", "total_price": "Decimal" }]
}
```

**Errors:**
- `INVALID_PAYLOAD` — validation failure
- `INACTIVE_PRODUCT` — product disabled
- `INSUFFICIENT_STOCK` — not enough ingredient stock

### POST /api/orders/draft

Create draft order (no invoice, no stock deduction). Draft/manual/chat orders should later converge into the same order pipeline.

### POST /api/orders/:id/cancel

Cancel draft order.

### GET /api/orders

List orders (newest first).

### GET /api/orders/:id

Get single order with items.

---

## Kitchen / Barista Queue (Planned Milestone 4)

### GET /api/kitchen/orders

List paid/accepted orders that are not completed.

**Query Parameters:**
- `status` optional: `new | preparing | ready | completed`

### PATCH /api/kitchen/orders/:id/status

Update preparation status.

**Body:**
```json
{ "prep_status": "new | preparing | ready | completed" }
```

**Response 200:**
```json
{ "id": "uuid", "prep_status": "preparing", "updated_at": "ISO8601" }
```

---

## Self-order / Chat Cart (Planned Milestone 4)

### POST /api/order-links

Create QR/self-order link for an outlet/table.

**Body:**
```json
{ "outlet_id": "uuid", "table_label": "A1 (optional)" }
```

### POST /api/chat-carts

Create chat cart session from QR/chat entry.

### POST /api/chat-carts/:id/items

Add product/custom item to chat cart.

### PATCH /api/chat-carts/:id/items/:itemId

Update quantity/notes.

### DELETE /api/chat-carts/:id/items/:itemId

Remove item from chat cart.

### POST /api/chat-carts/:id/submit

Submit chat cart into order pipeline. For online payment, this should create `pending_payment`; after DOKU confirmation it becomes `paid` and enters kitchen queue.

---

## Reports

### GET /api/reports/daily?date=YYYY-MM-DD

Daily sales summary.

**Response 200:**
```json
{
  "total_revenue": "Decimal",
  "total_orders": 0,
  "average_order_value": "Decimal",
  "best_selling_products": [{ "product_name": "string", "qty_sold": 0, "total_sales": "Decimal" }],
  "critical_stock": [{ "name": "string", "current_stock": "Decimal", "minimum_stock": "Decimal", "unit": "string" }]
}
```

### GET /api/reports/best-sellers?date=YYYY-MM-DD&limit=5

Top selling products.

### GET /api/reports/critical-stock

Inventory items where current_stock <= minimum_stock.

### GET /api/reports/recent-orders?limit=10

Recent paid orders.

### GET /api/reports/revenue-trend?days=7

Daily revenue for last N days.

### GET /api/reports/payment-methods?date=YYYY-MM-DD

Revenue grouped by payment method.

---

## AI Reports

### POST /api/reports/ai-generate

Generate AI daily insight. Falls back to rule-based insight on AI failure.

**Body:**
```json
{ "date": "YYYY-MM-DD (optional, defaults to today)" }
```

**Response 200:**
```json
{
  "id": "uuid",
  "report_date": "ISO date",
  "ai_summary": "string",
  "ai_recommendations": {
    "summary": "string",
    "performance_status": "poor | fair | good | excellent",
    "highlights": ["string"],
    "risks": [{ "title": "string", "description": "string", "severity": "low | medium | high" }],
    "restock_recommendations": [{ "item_name": "string", "recommended_qty": 0, "unit": "string", "reason": "string" }],
    "sales_opportunities": [{ "title": "string", "description": "string", "expected_impact": "low | medium | high" }],
    "next_best_actions": ["string"],
    "owner_message": "string",
    "is_fallback": false
  }
}
```

### GET /api/reports/ai

List stored AI reports.

### GET /api/reports/ai/:id

Get single AI report.

---

## Agent (NEW)

### GET /api/agent/runs

List agent execution history.

**Response 200:**
```json
[{
  "id": "uuid",
  "workflow_id": "daily-report",
  "trigger_type": "scheduled",
  "status": "completed",
  "started_at": "ISO8601",
  "completed_at": "ISO8601"
}]
```

### GET /api/agent/runs/:id

Get single agent run with outputs.

### POST /api/agent/trigger/:workflowId

Manually trigger a workflow (on-demand).

**Response 200:**
```json
{ "run_id": "uuid", "status": "running" }
```

### GET /api/agent/outputs

List agent outputs (timeline for dashboard).

**Query Parameters:**
- `type` (optional): filter by output_type
- `limit` (optional): defaults to 20

**Response 200:**
```json
[{
  "id": "uuid",
  "run_id": "uuid",
  "output_type": "alert",
  "title": "Stok Susu Kritis",
  "content": { "...structured JSON..." },
  "requires_approval": false,
  "created_at": "ISO8601"
}]
```

### POST /api/agent/outputs/:id/approve

Approve a human-approved action.

**Response 200:**
```json
{ "id": "uuid", "approved": true, "approved_at": "ISO8601" }
```

### POST /api/agent/outputs/:id/reject

Reject a human-approved action.

**Response 200:**
```json
{ "id": "uuid", "approved": false }
```

---

## Payment (DOKU) (NEW)

### POST /api/payments/create

Create payment for an order via DOKU. In sandbox, Coffeelot calls the DOKU MCP Server and maps QRIS / Virtual Account responses into the payment record. If MCP is unavailable, the endpoint can fall back to the local sandbox placeholder and stores the fallback reason in `raw_response`.

**Body:**
```json
{
  "order_id": "uuid (required)",
  "payment_method": "qris | va_bca | va_bni | ovo | gopay | dana | shopee_pay (required)"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "payment_method": "qris",
  "amount": "Decimal",
  "status": "pending",
  "payment_url": "string | null",
  "qr_code": "string | null",
  "va_number": "string | null",
  "expired_at": "ISO8601"
}
```

### GET /api/payments/:id/status

Check payment status (polls DOKU).

**Response 200:**
```json
{
  "id": "uuid",
  "status": "pending | paid | expired | failed",
  "paid_at": "ISO8601 | null"
}
```

### POST /api/payments/callback

DOKU webhook callback (payment confirmation).

**Note:** This endpoint is called by DOKU, not by frontend. Invalid payloads without a payment/provider reference return `400`; unknown references return `404`. Signature verification is still pending until callback signing details are confirmed.


### GET /api/payments/doku/tools

Inspect available DOKU MCP tools for the configured runtime credentials. Intended for integration diagnostics.

**Response 200:**
```json
{
  "ok": true,
  "count": 35,
  "tools": []
}
```

### GET /api/payments?order_id=uuid

Get payment(s) for an order.
