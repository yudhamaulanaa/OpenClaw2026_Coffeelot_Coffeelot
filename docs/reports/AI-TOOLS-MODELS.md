# AI Tools / Models Used

## Runtime AI Model

Coffeelot uses an OpenAI-compatible Chat Completions API for LLM-backed operational insight generation.

Runtime configuration keys:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_TIMEOUT_MS`

Verified runtime model during the MVP build:

- `gpt-5.5` through an OpenAI-compatible provider endpoint.

Secrets are runtime-only and are not committed to the repository.

## LLM-Backed Agent Workflows

The following workflows can call the LLM and persist structured JSON insight metadata:

1. `daily_report`
2. `risk_detection`
3. `promo_generation`
4. `morning_briefing`
5. `booking_seat_insight`
6. `menu_engineering`
7. `demand_forecast`
8. `prep_planning`
9. `kitchen_sla`
10. `payment_reconciliation_insight`

`restock_alert` is primarily rule-based using inventory thresholds.

## Structured Output Schema

General business insights include:

- `summary`
- `performance_status`
- `highlights`
- `risks`
- `restock_recommendations`
- `sales_opportunities`
- `next_best_actions`
- `owner_message`

Booking insights include:

- `summary`
- `availability_status`
- `current_available_seats`
- `peak_reserved_seats_next_2h`
- `risks`
- `arrival_watchlist`
- `seat_actions`
- `owner_message`

The frontend renders these structured fields as cards and comparison table rows in `/agent`.

## Fallback AI / Reproducibility

If no AI provider is configured, or if the provider fails, Coffeelot falls back to deterministic rule-based insights. This keeps the project reproducible for judges without requiring secret API keys.

Fallback logic uses operational snapshots including:

- paid orders
- revenue
- average order value
- best sellers
- critical inventory
- menu performance
- recipe stock risks
- active kitchen queue
- pending payments
- booking seat availability

## Supporting AI/Agent Tools

### OpenClaw

OpenClaw was used as the autonomous AI development/runtime assistant for project implementation, documentation, deployment checks, and iterative build workflows.

### DOKU MCP Tools

Coffeelot integrates with the DOKU MCP sandbox to support payment-related operations:

- QRIS payment creation
- Virtual Account payment creation
- DOKU Checkout/payment link style flow
- transaction lookup by invoice number for reconciliation

DOKU MCP is not an LLM model, but it is a supporting tool in the agentic operational workflow because payment status becomes part of Coffeelot's operational intelligence.

## AI Safety / Control

- Promo outputs require approval before use.
- Secrets are never committed.
- Important external/customer-facing actions are designed to remain human-approved.
- LLM output is normalized before persistence and display.
- Fallback mode avoids total workflow failure if the LLM provider is unavailable.
