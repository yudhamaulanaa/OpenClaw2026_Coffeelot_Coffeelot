# Devpost Submission Draft

## Team Naming Format

**OpenClaw2026_Coffeelot**

## Repository Naming Format

Recommended final repo name:

**OpenClaw2026_Coffeelot_Coffeelot**

Submission repository:

<https://github.com/yudhamaulanaa/OpenClaw2026_Coffeelot_Coffeelot>

> Action needed before final submission: ensure the GitHub repository is public.

## Project Title

**Coffeelot**

## Project Description

Coffeelot is an AI Business Intelligence & Operations Agent for coffee shops and small F&B businesses. It combines a built-in POS, customer self-order page, DOKU payment integration, inventory control, booking/seat availability, kitchen queue, and LLM-powered agent workflows into one operational intelligence layer.

Traditional POS systems record transactions but leave the owner to manually interpret what happened and what to do next. Coffeelot goes further by transforming operational data into structured AI insights and recommended actions. It can detect stock risks, generate daily reports, propose promotions, monitor kitchen SLA, forecast demand, plan prep, analyze menu performance, reconcile pending payments, and preserve seat availability for bookings.

The MVP includes a live POS page, a customer-facing `/chat` self-order flow, DOKU sandbox payment creation/reconciliation, recipe-based stock deduction, booking capacity protection, and an `/agent` dashboard that displays AI workflow outputs and an insight comparison table.

## GitHub Repository

Current:

<https://github.com/yudhamaulanaa/OpenClaw2026_Coffeelot_Coffeelot>

Required naming:

<https://github.com/yudhamaulanaa/OpenClaw2026_Coffeelot_Coffeelot>

## Demo Video

Pending upload. Recommended final filename/title:

**OpenClaw2026_Coffeelot_Coffeelot Demo**

Maximum length: 2 minutes.

Suggested structure:

1. 0:00–0:15 — Problem and positioning.
2. 0:15–0:40 — POS and customer self-order.
3. 0:40–1:05 — Payment, inventory deduction, kitchen queue.
4. 1:05–1:40 — `/agent` dashboard, LLM insights, BI workflows.
5. 1:40–2:00 — Booking Seat Insight, roadmap, closing.

Use [`COFFEELOT-VIDEO-SCRIPT.md`](COFFEELOT-VIDEO-SCRIPT.md) as the source script, but shorten narration to fit 2 minutes.

## Pitch Deck PDF

[`OpenClaw2026_Coffeelot_Coffeelot.pdf`](OpenClaw2026_Coffeelot_Coffeelot.pdf)

Source markdown:

[`COFFEELOT-PITCHDECK-5SLIDES.md`](COFFEELOT-PITCHDECK-5SLIDES.md)

## AI Tools / Models Used

See [`AI-TOOLS-MODELS.md`](AI-TOOLS-MODELS.md).

Summary:

- OpenAI-compatible Chat Completions API.
- Runtime model configured as `gpt-5.5` through a compatible provider.
- Deterministic fallback insight engine for reproducibility when no provider key is configured.
- Agent workflows use structured JSON output for dashboard rendering and comparison.
- DOKU MCP tools support payment creation/status integration.
- OpenClaw was used as the autonomous development/runtime assistant during build.

## Live Deployment Link

- App: <https://coffeelot.app/>
- Customer self-order: <https://coffeelot.app/chat>
- Agent dashboard: <https://coffeelot.app/agent>
- API health: <https://api.coffeelot.app/api/health>

## Pitch Deck Required Sections Mapping

| Required section | Slide |
|---|---|
| Problem Statement | Slide 2 |
| Solution Overview | Slide 3 |
| AI Agent Architecture | Slide 3 + Slide 4 |
| Tech Stack | Slide 4 |
| Future Impact | Slide 5 |

## Final Submission Checklist

- [ ] GitHub repository public.
- [x] Repository name follows `OpenClaw2026_TeamName_ProjectName`.
- [x] README includes installation/setup instructions.
- [x] Project description drafted.
- [x] AI tools/models list drafted.
- [x] Pitch deck source created with max 5 slides.
- [x] Pitch deck PDF generated with required naming format.
- [ ] Demo video recorded, uploaded, and set to public/viewable.
- [x] Live deployment link available.
