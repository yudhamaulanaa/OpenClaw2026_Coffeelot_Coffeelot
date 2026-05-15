# Coffeelot — Order Channels & Kitchen Flow

This document captures the updated MVP scope for Milestone 4.

## Milestone 4 Scope

Built-in POS is not only a cashier screen. For MVP it covers three order channels and one operational preparation flow:

1. **Cashier POS** — staff creates orders from product grid or manual cart/custom item input.
2. **Self-order via chat** — customer scans QR, builds cart in chat, then order enters Coffeelot.
3. **Kitchen / Barista queue** — paid/accepted orders are prepared by barista through a simple status board.
4. **Operational reports** — all order channels feed the same order/inventory/reporting layer.

## Order Channels

### 1. Cashier POS

- Product grid
- Category filter
- Cart management
- Manual cart/custom item input for fast cashier orders
- Discount
- Payment method selection
- Checkout creates order
- Stock deduction happens only when order becomes paid

### 2. Self-order via Chat

MVP concept:

```text
Customer scans QR
    ↓
Chat session starts
    ↓
Customer browses menu / selects item
    ↓
Chat cart is created
    ↓
Customer confirms order
    ↓
Payment is generated (Milestone 5)
    ↓
Payment confirmed
    ↓
Order enters POS + Kitchen queue
    ↓
Stock deduction runs through the same stock engine
```

Required pieces:

- QR order link generator
- QR per outlet/table/session
- Chat cart session model/API
- Chat cart add/update/remove item flow
- Submit chat cart into order pipeline
- Route chat order into POS order list and kitchen queue

### 3. Manual Cart / Custom Item Input

Used when cashier needs to sell something not yet in catalog or create a quick custom charge.

MVP rules:

- Custom item should carry name, qty, unit price, and optional note.
- Custom item does not deduct recipe-based stock unless mapped to a real product later.
- Custom item must still appear in invoice/reporting.

## Kitchen / Barista Queue

Kitchen display is part of Milestone 4 because checkout alone is not enough for coffee shop operations.

Status flow:

```text
new → preparing → ready → completed
```

Recommended behavior:

- Queue shows paid/accepted orders that are not completed.
- Barista can click status actions per order.
- UI highlights waiting time/order age.
- Tablet-friendly layout.
- Kitchen queue includes both cashier POS orders and self-order chat orders.

## Separation of Statuses

Keep payment/order lifecycle separate from preparation lifecycle.

Recommended model:

- `order_status`: commercial/payment lifecycle
  - `draft`
  - `pending_payment`
  - `paid`
  - `cancelled`

- `prep_status`: kitchen/barista lifecycle
  - `new`
  - `preparing`
  - `ready`
  - `completed`

This avoids mixing “has the customer paid?” with “has the barista made it?”.

## Milestone 5 Dependency: Payment

DOKU Payment Integration is now Milestone 5, immediately after POS/Kitchen/Self-order foundation.

Payment should support:

- QRIS
- Virtual Account
- E-wallet/payment link where available
- Payment status polling/callback
- Payment confirmation that changes order to paid
- Stock deduction after paid confirmation
- Order entering kitchen queue after paid confirmation

## Webchat Browser Flow

A customer-facing MVP webchat order screen is available at:

```text
https://coffeelot.app/chat
```

Optional query parameters:

```text
https://coffeelot.app/chat?table=A1&name=Yudha
```

Current flow:

1. Customer enters name/table label.
2. Customer picks catalog products and adjusts quantities.
3. Frontend creates a `chat-carts` session with `source_channel=webchat`.
4. Frontend adds cart items to the session.
5. Frontend submits the cart into an order with `order_channel=chat` and `order_status=pending_payment`.
6. Frontend creates a DOKU payment using QRIS or VA BCA.
7. After checkout, `/chat` switches to a focused payment-only page. If VA BCA is selected, the page highlights only the Bank BCA VA number plus the payment check button.
8. Customer/operator can press `Check Pembayaran` to refresh local payment status.
9. After payment becomes `paid`, `/chat` switches from payment instructions to a customer order-status panel.
10. Payment confirmation is handled by callback when available, with reconciliation/polling as fallback.

Next improvement: QR order links should generate customer URLs that open `/chat?table=<label>` directly.
