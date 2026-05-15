#!/usr/bin/env python3
"""Generate a simple 5-slide PDF pitch deck without external dependencies."""
from __future__ import annotations

from pathlib import Path

OUT = Path("docs/reports/OpenClaw2026_Coffeelot_Coffeelot.pdf")
PAGE_W = 842
PAGE_H = 595

slides = [
    {
        "title": "Coffeelot ☕",
        "subtitle": "AI Business Intelligence & Operations Agent for Coffee Shops",
        "bullets": [
            "Combines POS, self-order, DOKU payment, inventory, booking, kitchen queue, and LLM insight.",
            "Turns daily transactions into operational decisions.",
            "Built for coffee shops and small F&B owners.",
        ],
        "footer": "From daily transactions to autonomous operational intelligence.",
    },
    {
        "title": "Problem",
        "subtitle": "F&B owners still operate blind",
        "bullets": [
            "POS records sales but does not explain what to do next.",
            "Inventory, payment, kitchen queue, booking, and reports are disconnected.",
            "Dashboards show charts; owners still interpret everything manually.",
            "Owners need operational decisions, not just raw data.",
        ],
        "footer": "Coffeelot changes reports into recommendations.",
    },
    {
        "title": "Solution",
        "subtitle": "One AI-native operating layer",
        "bullets": [
            "Commerce: POS, /chat self-order, QRIS/VA BCA/DOKU Checkout, kitchen queue.",
            "Operations: inventory, recipe stock deduction, booking seats, payment reconciliation.",
            "Intelligence: daily report, risk detection, promo, booking insight, BI pack.",
            "Autonomy: scheduler, event triggers, approval flow, /agent dashboard.",
        ],
        "footer": "Live: coffeelot.app • coffeelot.app/chat • coffeelot.app/agent",
    },
    {
        "title": "Product Demo",
        "subtitle": "From order to AI insight",
        "bullets": [
            "Create order from POS or /chat customer self-order.",
            "Generate QRIS or VA BCA payment via DOKU sandbox.",
            "Reconcile payment, update kitchen queue, and deduct recipe inventory.",
            "Run 11 workflows: daily report, booking seat, menu engineering, demand forecast, kitchen SLA, and more.",
            "/agent shows structured insight cards and comparison table.",
        ],
        "footer": "Operational signals become LLM-powered business intelligence.",
    },
    {
        "title": "Impact + Roadmap",
        "subtitle": "Beyond POS: an owner copilot",
        "bullets": [
            "Traditional POS records sales; Coffeelot explains sales and recommends actions.",
            "MVP foundation complete: POS, payment, inventory, booking, Agent Core, BI Insight Pack.",
            "Next: rate limiter, /chat UX polish, QR table generator, booking UI, BI charts, COGS/margin, POS connector.",
            "Coffeelot keeps the owner in control with human-approved actions.",
        ],
        "footer": "Coffeelot turns coffee shop data into decisions.",
    },
]


def esc(text: str) -> str:
    # PDF core fonts do not support emoji; replace known symbol.
    text = text.replace("☕", "Coffee")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_line(x: int, y: int, text: str, size: int = 18, font: str = "F1") -> str:
    return f"BT /{font} {size} Tf {x} {y} Td ({esc(text)}) Tj ET\n"


def wrap(text: str, max_chars: int = 88) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 > max_chars:
            if current:
                lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines


def slide_stream(slide: dict[str, object], idx: int) -> str:
    parts = []
    # Background and accent bar
    parts.append("0.98 0.95 0.89 rg 0 0 842 595 re f\n")
    parts.append("0.44 0.25 0.13 rg 0 545 842 50 re f\n")
    parts.append(text_line(48, 562, f"OpenClaw2026_Coffeelot_Coffeelot", 14, "F2"))
    parts.append(text_line(735, 562, f"{idx}/5", 14, "F2"))
    parts.append(text_line(48, 485, str(slide["title"]), 34, "F2"))
    parts.append(text_line(48, 448, str(slide["subtitle"]), 20, "F1"))
    y = 395
    for bullet in slide["bullets"]:  # type: ignore[index]
        lines = wrap(str(bullet), 82)
        if lines:
            parts.append(text_line(70, y, "• " + lines[0], 17, "F1"))
            y -= 25
            for line in lines[1:]:
                parts.append(text_line(92, y, line, 17, "F1"))
                y -= 25
        y -= 10
    parts.append("0.93 0.85 0.75 rg 48 52 746 54 re f\n")
    parts.append(text_line(66, 73, str(slide["footer"]), 16, "F2"))
    return "".join(parts)


def pdf() -> bytes:
    objects: list[bytes] = []

    def add(obj: str | bytes) -> int:
        if isinstance(obj, str):
            obj = obj.encode("latin-1", errors="replace")
        objects.append(obj)
        return len(objects)

    catalog_id = add("<< /Type /Catalog /Pages 2 0 R >>")
    pages_placeholder_id = add(b"")
    font1_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    page_ids = []
    for idx, slide in enumerate(slides, 1):
        stream = slide_stream(slide, idx).encode("latin-1", errors="replace")
        stream_id = add(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"endstream")
        page_id = add(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font1_id} 0 R /F2 {font2_id} 0 R >> >> "
            f"/Contents {stream_id} 0 R >>"
        )
        page_ids.append(page_id)
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_placeholder_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects)+1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(f"trailer\n<< /Size {len(objects)+1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(out)


OUT.write_bytes(pdf())
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
