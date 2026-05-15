# Database Schema

Database: SQLite (via Prisma ORM)
Source of truth: `prisma/schema.prisma`

## Conventions

- UUID primary keys (generated via `uuid()`)
- `created_at` / `updated_at` as DateTime
- Money: Decimal. Quantities: Decimal.
- Every operational table carries `tenant_id`
- `outlet_id` on outlet-specific tables
- `outlet_id` nullable on `products` to support shared catalog

## Enums

| Enum | Values |
|------|--------|
| `Role` | `owner`, `manager`, `cashier` |
| `OrderStatus` | `draft`, `pending_payment`, `paid`, `cancelled` |
| `PaymentMethod` | `cash`, `qris`, `transfer` |
| `MovementType` | `sale`, `restock`, `adjustment`, `waste` |
| `BusinessType` | `coffee_shop`, `food_stall`, `booth`, `cart`, `other` |
| `TenantStatus` | `active`, `inactive` |
| `AgentRunStatus` | `running`, `completed`, `failed` |
| `AgentOutputType` | `report`, `alert`, `recommendation`, `promo`, `briefing` |
| `AgentTriggerType` | `scheduled`, `event`, `on_demand` |
| `PaymentStatus` | `pending`, `paid`, `expired`, `failed` |
| `PrepStatus` | `new`, `preparing`, `ready`, `completed` |
| `OrderChannel` | `cashier`, `manual`, `chat`, `connector` |

## Tables — Foundation

### tenants

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| name | String | NOT NULL |
| business_type | String | NOT NULL |
| status | String | NOT NULL, default `active` |
| timezone | String | NOT NULL, default `Asia/Jakarta` |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| email | String | NOT NULL, UNIQUE |
| name | String | NOT NULL |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

### tenant_users

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| user_id | String | NOT NULL, FK → users.id |
| role | String | NOT NULL |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

**Unique:** `(tenant_id, user_id)`

### outlets

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| name | String | NOT NULL |
| address | String | nullable |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

## Tables — Products & Inventory

### products

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | nullable, FK → outlets.id |
| name | String | NOT NULL |
| category | String | NOT NULL |
| price | Decimal | NOT NULL |
| is_active | Boolean | NOT NULL, default true |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

**Note:** `outlet_id = NULL` means shared catalog (available to all outlets).

### inventory_items

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| name | String | NOT NULL |
| unit | String | NOT NULL (gram, ml, pcs, liter, kg) |
| current_stock | Decimal | NOT NULL |
| minimum_stock | Decimal | NOT NULL |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

### product_recipes

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| product_id | String | NOT NULL, FK → products.id |
| inventory_item_id | String | NOT NULL, FK → inventory_items.id |
| qty_used | Decimal | NOT NULL |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

**Unique:** `(product_id, inventory_item_id)`

### customers

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| name | String | NOT NULL |
| phone | String | nullable |
| email | String | nullable |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

## Tables — Orders

### orders

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| customer_id | String | nullable, FK → customers.id |
| invoice_number | String | nullable (null until paid) |
| order_status | String | NOT NULL |
| prep_status | String | NOT NULL, default `new` |
| order_channel | String | NOT NULL, default `cashier` |
| table_label | String | nullable (for QR/table self-order) |
| payment_method | String | NOT NULL |
| subtotal | Decimal | NOT NULL |
| discount | Decimal | NOT NULL, default 0 |
| total | Decimal | NOT NULL |
| notes | String | nullable |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

**Unique:** `(tenant_id, invoice_number)`

### order_items

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL |
| order_id | String | NOT NULL, FK → orders.id |
| product_id | String | NOT NULL, FK → products.id |
| product_name | String | NOT NULL (snapshot at sale time) |
| qty | Int | NOT NULL |
| unit_price | Decimal | NOT NULL |
| total_price | Decimal | NOT NULL |
| notes | String | nullable |
| created_at | DateTime | NOT NULL, default now |

### stock_movements

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| inventory_item_id | String | NOT NULL, FK → inventory_items.id |
| movement_type | String | NOT NULL |
| qty | Decimal | NOT NULL |
| stock_before | Decimal | NOT NULL |
| stock_after | Decimal | NOT NULL |
| order_id | String | nullable, FK → orders.id |
| note | String | nullable |
| created_at | DateTime | NOT NULL, default now |

## Tables — Self-order / Chat Cart (Planned Milestone 4)

### chat_cart_sessions

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| table_label | String | nullable |
| status | String | NOT NULL (`active`, `submitted`, `expired`, `cancelled`) |
| customer_name | String | nullable |
| customer_contact | String | nullable |
| source_channel | String | nullable (`telegram`, `whatsapp`, `web`, etc.) |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

### chat_cart_items

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| session_id | String | NOT NULL, FK → chat_cart_sessions.id |
| product_id | String | nullable, FK → products.id |
| item_name | String | NOT NULL snapshot |
| qty | Int | NOT NULL |
| unit_price | Decimal | NOT NULL |
| notes | String | nullable |
| created_at | DateTime | NOT NULL, default now |

### qr_order_links

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| table_label | String | nullable |
| token | String | NOT NULL, UNIQUE |
| is_active | Boolean | NOT NULL, default true |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

These tables are planned for Milestone 4 and should feed the same `orders` and `order_items` pipeline after chat cart confirmation.

## Tables — AI Agent

### agent_runs

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| workflow_id | String | NOT NULL (e.g., "daily-report") |
| trigger_type | String | NOT NULL (scheduled, event, on_demand) |
| status | String | NOT NULL (running, completed, failed) |
| started_at | DateTime | NOT NULL |
| completed_at | DateTime | nullable |
| error_message | String | nullable |
| created_at | DateTime | NOT NULL, default now |

### agent_outputs

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| run_id | String | NOT NULL, FK → agent_runs.id |
| tenant_id | String | NOT NULL, FK → tenants.id |
| output_type | String | NOT NULL (report, alert, recommendation, promo, briefing) |
| title | String | NOT NULL |
| content | String (JSON) | NOT NULL |
| metadata | String (JSON) | nullable |
| requires_approval | Boolean | NOT NULL, default false |
| approved | Boolean | nullable |
| approved_at | DateTime | nullable |
| created_at | DateTime | NOT NULL, default now |

### ai_reports (legacy, from POS)

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| report_date | DateTime | NOT NULL |
| report_type | String | NOT NULL, default "daily" |
| input_snapshot | String (JSON) | NOT NULL |
| ai_summary | String | NOT NULL |
| ai_recommendations | String (JSON) | NOT NULL |
| created_at | DateTime | NOT NULL, default now |

## Tables — Payment (DOKU)

### payments

| Column | Type | Constraints |
|--------|------|-------------|
| id | String (UUID) | PK |
| tenant_id | String | NOT NULL, FK → tenants.id |
| outlet_id | String | NOT NULL, FK → outlets.id |
| order_id | String | NOT NULL, FK → orders.id |
| doku_invoice_id | String | nullable |
| payment_method | String | NOT NULL (qris, va_bca, va_bni, ovo, gopay, dana, shopee_pay) |
| amount | Decimal | NOT NULL |
| status | String | NOT NULL (pending, paid, expired, failed) |
| payment_url | String | nullable |
| qr_code | String | nullable |
| va_number | String | nullable |
| paid_at | DateTime | nullable |
| expired_at | DateTime | NOT NULL |
| raw_response | String (JSON) | nullable |
| created_at | DateTime | NOT NULL, default now |
| updated_at | DateTime | NOT NULL, auto-updated |

## Relations

```
Tenant 1──* Outlet
Tenant 1──* TenantUser
Tenant 1──* Product
Tenant 1──* InventoryItem
Tenant 1──* Customer
Tenant 1──* Order
Tenant 1──* StockMovement
Tenant 1──* AIReport
Tenant 1──* ProductRecipe
Tenant 1──* AgentRun
Tenant 1──* AgentOutput
Tenant 1──* Payment

User 1──* TenantUser

Outlet 1──* InventoryItem
Outlet 1──* Order
Outlet 1──* StockMovement
Outlet 1──* AIReport
Outlet 1──* Product (outlet-specific)
Outlet 1──* AgentRun
Outlet 1──* Payment

Product 1──* ProductRecipe
Product 1──* OrderItem

InventoryItem 1──* ProductRecipe
InventoryItem 1──* StockMovement

Customer 1──* Order

Order 1──* OrderItem
Order 1──* StockMovement
Order 1──* Payment

AgentRun 1──* AgentOutput
```

## Seed Data (Demo)

### Demo Tenant
- Tenant: "Kopi Jagoan" (coffee_shop, active)
- Outlet: "Booth Ciputat"
- User: "Owner Demo" (owner role)

### Demo Products
- Es Kopi Susu (Rp18.000, Kopi)
- Americano (Rp15.000, Kopi)
- Matcha Latte (Rp22.000, Non-Kopi)
- Croissant (Rp20.000, Snack)
- Roti Bakar (Rp15.000, Snack)

### Demo Inventory
- Biji Kopi (gram, stock: 2000, min: 500)
- Susu (ml, stock: 5000, min: 2000)
- Matcha Powder (gram, stock: 500, min: 200)
- Cup 16oz (pcs, stock: 200, min: 50)
- Es Batu (gram, stock: 10000, min: 3000)

### Demo Recipes
- Es Kopi Susu: Biji Kopi 18g, Susu 120ml, Cup 1pcs, Es Batu 150g
- Americano: Biji Kopi 18g, Cup 1pcs, Es Batu 150g
- Matcha Latte: Matcha 15g, Susu 150ml, Cup 1pcs, Es Batu 100g
