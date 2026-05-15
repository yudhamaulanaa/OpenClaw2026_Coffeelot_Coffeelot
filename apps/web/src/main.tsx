import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import type { DokuPaymentMethod, KitchenOrder, PaymentMethod, PosProduct } from "@coffeelot/shared";
import "./style.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.coffeelot.app/api";
const TENANT_ID = import.meta.env.VITE_DEMO_TENANT_ID ?? "demo-tenant-kopi-jagoan";
const OUTLET_ID = import.meta.env.VITE_DEMO_OUTLET_ID ?? "demo-outlet-booth-ciputat";

type CartLine = {
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  notes?: string;
};

type InventoryStatusItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number | string;
  minimumStock: number | string;
  low_stock?: boolean;
};


type ProjectedStockItem = InventoryStatusItem & {
  reserved: number;
  projected: number;
  insufficient: boolean;
};

function projectedStockItems(inventoryItems: InventoryStatusItem[], products: PosProduct[], cart: CartLine[]): ProjectedStockItem[] {
  const reserved = new Map<string, number>();
  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const line of cart) {
    if (!line.productId) continue;
    const product = productMap.get(line.productId);
    for (const recipe of product?.recipes ?? []) {
      reserved.set(recipe.inventoryItemId, (reserved.get(recipe.inventoryItemId) ?? 0) + Number(recipe.qtyUsed) * line.qty);
    }
  }
  return inventoryItems.map((item) => {
    const current = Number(item.currentStock);
    const itemReserved = reserved.get(item.id) ?? 0;
    const projected = current - itemReserved;
    return { ...item, reserved: itemReserved, projected, insufficient: projected < 0 };
  });
}

type PaymentResult = {
  id?: string;
  payment_url?: string | null;
  paymentUrl?: string | null;
  qr_code?: string | null;
  qrCode?: string | null;
  va_number?: string | null;
  vaNumber?: string | null;
  status?: string;
};

function paymentUrl(payment: PaymentResult) {
  return payment.payment_url ?? payment.paymentUrl ?? null;
}

function qrCode(payment: PaymentResult) {
  return payment.qr_code ?? payment.qrCode ?? null;
}

function vaNumber(payment: PaymentResult) {
  return payment.va_number ?? payment.vaNumber ?? null;
}

type ChatCartSession = {
  id: string;
  tableLabel?: string | null;
  customerName?: string | null;
  status: string;
};

type OrderDetail = KitchenOrder & { updatedAt?: string };

type AgentOutput = {
  id: string;
  outputType: string;
  title: string;
  content: string;
  createdAt: string;
  metadata?: string | null;
  requiresApproval?: boolean;
  approved?: boolean | null;
  approvedAt?: string | null;
};


type AgentInsight = {
  summary?: string;
  performance_status?: "poor" | "fair" | "good" | "excellent";
  highlights?: string[];
  risks?: Array<{ title?: string; description?: string; severity?: "low" | "medium" | "high" }>;
  restock_recommendations?: Array<{ item_name?: string; recommended_qty?: number; unit?: string; reason?: string }>;
  sales_opportunities?: Array<{ title?: string; description?: string; expected_impact?: "low" | "medium" | "high" }>;
  next_best_actions?: string[];
  owner_message?: string;
};

function parseAgentMetadata(metadata?: string | null): { provider?: string; reason?: string; workflowFocus?: string; insight?: AgentInsight } | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { provider?: string; reason?: string; workflowFocus?: string; insight?: AgentInsight };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="insight-section">
      <strong>{title}</strong>
      <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
    </div>
  );
}

function AgentInsightCard({ metadata }: { metadata?: string | null }) {
  const parsed = parseAgentMetadata(metadata);
  const insight = parsed?.insight;
  if (!insight) return null;
  const status = insight.performance_status ?? "fair";
  return (
    <div className="agent-insight-card">
      <div className="insight-head">
        <span className={`insight-status ${status}`}>{status}</span>
        <small>{parsed?.provider === "llm" ? "LLM Insight" : "Fallback Insight"}{parsed?.reason ? ` • ${parsed.reason}` : ""}</small>
      </div>
      {insight.summary ? <p>{insight.summary}</p> : null}
      <InsightList title="Highlights" items={insight.highlights} />
      {insight.risks?.length ? (
        <div className="insight-section">
          <strong>Risks</strong>
          <ul>{insight.risks.map((risk, index) => <li key={`risk-${index}`}><span className={`risk-dot ${risk.severity ?? "medium"}`}>{risk.severity ?? "medium"}</span> {risk.title}: {risk.description}</li>)}</ul>
        </div>
      ) : null}
      {insight.restock_recommendations?.length ? (
        <div className="insight-section">
          <strong>Restock</strong>
          <ul>{insight.restock_recommendations.map((item, index) => <li key={`restock-${index}`}>{item.item_name}: {item.recommended_qty} {item.unit} — {item.reason}</li>)}</ul>
        </div>
      ) : null}
      {insight.sales_opportunities?.length ? (
        <div className="insight-section">
          <strong>Sales opportunities</strong>
          <ul>{insight.sales_opportunities.map((item, index) => <li key={`opportunity-${index}`}><span className={`risk-dot ${item.expected_impact ?? "medium"}`}>{item.expected_impact ?? "medium"}</span> {item.title}: {item.description}</li>)}</ul>
        </div>
      ) : null}
      <InsightList title="Next best actions" items={insight.next_best_actions} />
      {insight.owner_message ? <blockquote>{insight.owner_message}</blockquote> : null}
    </div>
  );
}


type BookingInsight = {
  summary?: string;
  availability_status?: "safe" | "watch" | "tight" | "full";
  current_available_seats?: number;
  peak_reserved_seats_next_2h?: number;
  risks?: Array<{ title?: string; description?: string; severity?: "low" | "medium" | "high" }>;
  arrival_watchlist?: Array<{ customer_name?: string; party_size?: number; booking_start?: string; action?: string }>;
  seat_actions?: string[];
  owner_message?: string;
};

function parseBookingMetadata(metadata?: string | null): { provider?: string; reason?: string; bookingInsight?: BookingInsight } | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { provider?: string; reason?: string; bookingInsight?: BookingInsight };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function BookingInsightCard({ metadata }: { metadata?: string | null }) {
  const parsed = parseBookingMetadata(metadata);
  const insight = parsed?.bookingInsight;
  if (!insight) return null;
  const status = insight.availability_status ?? "safe";
  return (
    <div className="agent-insight-card booking-insight-card">
      <div className="insight-head">
        <span className={`insight-status ${status}`}>{status}</span>
        <small>{parsed?.provider === "llm" ? "LLM Booking Insight" : "Fallback Booking Insight"}{parsed?.reason ? ` • ${parsed.reason}` : ""}</small>
      </div>
      {insight.summary ? <p>{insight.summary}</p> : null}
      <div className="seat-metrics">
        <span><strong>{insight.current_available_seats ?? 0}</strong><small>seat tersedia sekarang</small></span>
        <span><strong>{insight.peak_reserved_seats_next_2h ?? 0}</strong><small>peak reserved 2 jam</small></span>
      </div>
      {insight.risks?.length ? (
        <div className="insight-section"><strong>Seat risks</strong><ul>{insight.risks.map((risk, index) => <li key={`booking-risk-${index}`}><span className={`risk-dot ${risk.severity ?? "medium"}`}>{risk.severity ?? "medium"}</span> {risk.title}: {risk.description}</li>)}</ul></div>
      ) : null}
      {insight.arrival_watchlist?.length ? (
        <div className="insight-section"><strong>Arrival watchlist</strong><ul>{insight.arrival_watchlist.map((item, index) => <li key={`arrival-${index}`}>{item.customer_name} ({item.party_size} pax) — {item.booking_start ? new Date(item.booking_start).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "soon"}: {item.action}</li>)}</ul></div>
      ) : null}
      <InsightList title="Seat actions" items={insight.seat_actions} />
      {insight.owner_message ? <blockquote>{insight.owner_message}</blockquote> : null}
    </div>
  );
}

type AgentRun = {
  id: string;
  workflowId: string;
  triggerType: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  outputs: AgentOutput[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
      "x-outlet-id": OUTLET_ID,
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function readSearchParam(name: string) {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}


function AppNavbar({ active }: { active: "pos" | "chat" | "agent" }) {
  const links = [
    { id: "pos", href: "/", label: "POS" },
    { id: "chat", href: "/chat", label: "Chat Order" },
    { id: "agent", href: "/agent", label: "Agent" },
  ] as const;
  return (
    <nav className="app-navbar">
      <a className="brand" href="/">☕ Coffeelot</a>
      <div>
        {links.map((link) => (
          <a key={link.id} href={link.href} className={active === link.id ? "active" : ""}>{link.label}</a>
        ))}
      </div>
    </nav>
  );
}

function PaymentBox({ payment, method, onCheck, checking }: { payment: PaymentResult | null; method?: DokuPaymentMethod; onCheck?: () => void; checking?: boolean }) {
  if (!payment) return null;
  const url = paymentUrl(payment);
  const qr = qrCode(payment);
  const va = vaNumber(payment);
  const isVaBca = method === "va_bca" || Boolean(va);
  const statusText = payment.status === "paid" ? "Pembayaran diterima" : payment.status ?? "pending";
  return (
    <div className={`payment-box ${payment.status === "paid" ? "paid" : ""}`}>
      <strong>{payment.status === "paid" ? "Payment paid" : "Payment pending"}</strong>
      {isVaBca && va ? (
        <div className="va-instructions">
          <span>Bayar ke Virtual Account</span>
          <strong>Bank BCA</strong>
          <code>{va}</code>
          <small>Gunakan nomor VA BCA di atas dari m-BCA/ATM/internet banking. Status akan berubah otomatis, atau tekan Check Pembayaran.</small>
        </div>
      ) : null}
      {url ? <a href={url} target="_blank">Open payment link</a> : null}
      {qr ? (
        <div className="qr-display">
          <QRCodeSVG value={qr} size={220} level="M" includeMargin />
          <small>Scan QRIS untuk bayar</small>
        </div>
      ) : null}
      <span>Status: {statusText}</span>
      {onCheck ? <button className="secondary-button" onClick={onCheck} disabled={checking}>{checking ? "Checking..." : "Check Pembayaran"}</button> : null}
    </div>
  );
}

function App() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryStatusItem[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState(0);
  const [message, setMessage] = useState("Ready");
  const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<DokuPaymentMethod | undefined>();
  const [checkingLastPayment, setCheckingLastPayment] = useState(false);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const projectedStock = useMemo(() => projectedStockItems(inventoryItems, products, cart), [inventoryItems, products, cart]);
  const hasInsufficientProjectedStock = projectedStock.some((item) => item.insufficient);

  async function load() {
    const [posProducts, queue, inventory] = await Promise.all([
      api<PosProduct[]>("/products/pos"),
      api<KitchenOrder[]>("/kitchen/orders"),
      api<InventoryStatusItem[]>("/inventory"),
    ]);
    setProducts(posProducts);
    setKitchenOrders(queue);
    setInventoryItems(inventory);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => {
      load().catch((error) => setMessage(error.message));
    }, 5_000);
    return () => window.clearInterval(timer);
  }, []);

  function addProduct(product: PosProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) return current.map((line) => (line.productId === product.id ? { ...line, qty: line.qty + 1 } : line));
      return [...current, { productId: product.id, name: product.name, qty: 1, unitPrice: Number(product.price) }];
    });
  }

  function addManualItem() {
    if (!manualName || manualPrice <= 0) return;
    setCart((current) => [...current, { name: manualName, qty: 1, unitPrice: manualPrice }]);
    setManualName("");
    setManualPrice(0);
  }

  async function checkout() {
    const catalogItems = cart.filter((item) => item.productId);
    if (catalogItems.length !== cart.length) {
      setMessage("Custom item checkout needs API support; remove manual items for now.");
      return;
    }
    const result = await api<{ order: { id: string } }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        payment_method: paymentMethod,
        items: catalogItems.map((item) => ({ product_id: item.productId, qty: item.qty, notes: item.notes })),
      }),
    });
    if (paymentMethod === "qris" || paymentMethod === "transfer") {
      const payment = await api<PaymentResult>("/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: result.order.id, payment_method: paymentMethod === "qris" ? "qris" : "va_bca" }),
      });
      setLastPayment(payment);
      setLastPaymentMethod(paymentMethod === "qris" ? "qris" : "va_bca");
    } else {
      setLastPayment(null);
      setLastPaymentMethod(undefined);
    }
    setCart([]);
    setMessage("Checkout complete. Order masuk kitchen queue.");
    await load();
  }

  async function updatePrepStatus(orderId: string, prep_status: KitchenOrder["prepStatus"]) {
    await api(`/kitchen/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ prep_status }) });
    await load();
  }

  async function checkLastPaymentStatus() {
    if (!lastPayment?.id) return;
    setCheckingLastPayment(true);
    try {
      const reconcile = await api<{ payment?: { status?: string; paidAt?: string | null }; provider?: { status?: string } }>(`/payments/${lastPayment.id}/reconcile`, { method: "POST" });
      const nextStatus = reconcile.payment?.status ?? reconcile.provider?.status ?? lastPayment.status ?? "pending";
      setLastPayment((current) => current ? { ...current, status: nextStatus } : current);
      setMessage(nextStatus === "paid" ? "Pembayaran sudah diterima." : `Status pembayaran: ${nextStatus}`);
      await load();
    } finally {
      setCheckingLastPayment(false);
    }
  }

  return (
    <main className="shell">
      <AppNavbar active="pos" />
      <section className="header">
        <div>
          <p className="eyebrow">Coffeelot POS</p>
          <h1>Cashier, cart, checkout, and kitchen queue</h1>
        </div>
        <span>{message}</span>
      </section>

      <section className="grid">
        <div className="panel products">
          <h2>Product Grid</h2>
          {categories.map((category) => (
            <div key={category}>
              <h3>{category}</h3>
              <div className="product-grid">
                {products.filter((product) => product.category === category).map((product) => (
                  <button key={product.id} onClick={() => addProduct(product)}>
                    <strong>{product.name}</strong>
                    <span>{money(Number(product.price))}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="panel cart">
          <h2>Cart</h2>
          {cart.map((item, index) => (
            <div className="cart-line" key={`${item.name}-${index}`}>
              <span>{item.name} × {item.qty}</span>
              <strong>{money(item.qty * item.unitPrice)}</strong>
            </div>
          ))}
          <div className="manual">
            <input placeholder="Custom item" value={manualName} onChange={(event) => setManualName(event.target.value)} />
            <input type="number" placeholder="Price" value={manualPrice || ""} onChange={(event) => setManualPrice(Number(event.target.value))} />
            <button onClick={addManualItem}>Add Manual</button>
          </div>
          <label>
            Payment
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
              <option value="transfer">VA BCA</option>
            </select>
          </label>
          <div className="total">Total {money(total)}</div>
          {hasInsufficientProjectedStock ? <small className="stock-warning">Stok sementara tidak cukup. Kurangi qty cart sebelum checkout.</small> : null}
          <button className="checkout" disabled={cart.length === 0 || hasInsufficientProjectedStock} onClick={checkout}>Checkout</button>
          <PaymentBox payment={lastPayment} method={lastPaymentMethod} onCheck={() => checkLastPaymentStatus().catch((error) => setMessage(error.message))} checking={checkingLastPayment} />
        </div>
      </section>


      <section className="panel stock-status">
        <h2>Status Stock</h2>
        <small>Auto-refresh setiap 5 detik.</small>
        <div className="stock-grid">
          {projectedStock.map((item) => {
            const current = Number(item.currentStock);
            const minimum = Number(item.minimumStock);
            const low = item.low_stock ?? current <= minimum;
            const projectedLow = item.projected <= minimum;
            return (
              <article key={item.id} className={item.insufficient ? "stock-card low insufficient" : projectedLow ? "stock-card low" : "stock-card"}>
                <strong>{item.name}</strong>
                <span>{current} {item.unit}</span>
                {item.reserved > 0 ? <small>Di cart: -{item.reserved} {item.unit}</small> : null}
                <small>Temporary setelah cart: {item.projected} {item.unit}</small>
                <small>Minimum {minimum} {item.unit}</small>
                <em>{item.insufficient ? "STOCK TIDAK CUKUP" : projectedLow ? "LOW STOCK" : low ? "LOW STOCK" : "OK"}</em>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel kitchen">
        <h2>Kitchen / Barista Queue</h2>
        <small>Status kitchen auto-refresh setiap 5 detik.</small>
        <div className="queue">
          {kitchenOrders.map((order) => (
            <article key={order.id}>
              <strong>{order.invoiceNumber ?? order.id}</strong>
              <span>{order.prepStatus}</span>
              <ul>{order.items.map((item) => <li key={`${order.id}-${item.productName}`}>{item.qty}× {item.productName}</li>)}</ul>
              <div className="actions">
                {(["new", "preparing", "ready", "completed"] as const).map((status) => (
                  <button key={status} onClick={() => updatePrepStatus(order.id, status)}>{status}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


type InsightComparisonRow = {
  key: string;
  workflowId: string;
  outputType: string;
  title: string;
  provider: string;
  status: string;
  summary: string;
  risks: number;
  opportunities: number;
  actions: number;
  ownerMessage: string;
  createdAt: string;
};

function latestInsightRows(runs: AgentRun[]): InsightComparisonRow[] {
  const rows: InsightComparisonRow[] = [];
  for (const run of runs) {
    for (const output of run.outputs) {
      const agent = parseAgentMetadata(output.metadata);
      const booking = parseBookingMetadata(output.metadata);
      if (agent?.insight) {
        rows.push({
          key: output.id,
          workflowId: agent.workflowFocus ?? run.workflowId,
          outputType: output.outputType,
          title: output.title,
          provider: agent.provider ?? "unknown",
          status: agent.insight.performance_status ?? "-",
          summary: agent.insight.summary ?? output.content.slice(0, 140),
          risks: agent.insight.risks?.length ?? 0,
          opportunities: agent.insight.sales_opportunities?.length ?? 0,
          actions: agent.insight.next_best_actions?.length ?? 0,
          ownerMessage: agent.insight.owner_message ?? "-",
          createdAt: output.createdAt,
        });
      } else if (booking?.bookingInsight) {
        rows.push({
          key: output.id,
          workflowId: run.workflowId,
          outputType: output.outputType,
          title: output.title,
          provider: booking.provider ?? "unknown",
          status: booking.bookingInsight.availability_status ?? "-",
          summary: booking.bookingInsight.summary ?? output.content.slice(0, 140),
          risks: booking.bookingInsight.risks?.length ?? 0,
          opportunities: booking.bookingInsight.arrival_watchlist?.length ?? 0,
          actions: booking.bookingInsight.seat_actions?.length ?? 0,
          ownerMessage: booking.bookingInsight.owner_message ?? "-",
          createdAt: output.createdAt,
        });
      }
    }
  }
  const latestByWorkflow = new Map<string, InsightComparisonRow>();
  for (const row of rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    if (!latestByWorkflow.has(row.workflowId)) latestByWorkflow.set(row.workflowId, row);
  }
  return [...latestByWorkflow.values()];
}

function AgentInsightComparisonTable({ runs }: { runs: AgentRun[] }) {
  const rows = latestInsightRows(runs);
  return (
    <section className="panel insight-comparison-panel">
      <div className="agent-run-head">
        <h2>Insight comparison</h2>
        <small>Latest AI-generated output per workflow. Use this to compare focus and avoid repetitive insight.</small>
      </div>
      {rows.length === 0 ? <p>No structured insights yet. Run workflows first.</p> : (
        <div className="insight-table-wrap">
          <table className="insight-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Summary</th>
                <th>Signals</th>
                <th>Owner message</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.workflowId.replaceAll("_", " ")}</strong></td>
                  <td>{row.outputType}</td>
                  <td><span className={row.provider === "llm" ? "provider-pill llm" : "provider-pill fallback"}>{row.provider}</span></td>
                  <td><span className={`insight-status ${row.status}`}>{row.status}</span></td>
                  <td>{row.summary}</td>
                  <td><small>{row.risks} risk • {row.opportunities} opp/watch • {row.actions} action</small></td>
                  <td>{row.ownerMessage}</td>
                  <td><small>{new Date(row.createdAt).toLocaleString("id-ID")}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AgentDashboard() {
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [message, setMessage] = useState("Ready");
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);

  async function loadAgentData() {
    const [workflowResponse, runResponse] = await Promise.all([
      api<{ workflows: string[] }>("/agent/workflows"),
      api<AgentRun[]>("/agent/runs"),
    ]);
    setWorkflows(workflowResponse.workflows);
    setRuns(runResponse);
  }

  useEffect(() => {
    loadAgentData().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => loadAgentData().catch((error) => setMessage(error.message)), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  async function runWorkflow(workflowId: string) {
    setRunningWorkflow(workflowId);
    setMessage(`Running ${workflowId}...`);
    try {
      await api("/agent/runs", { method: "POST", body: JSON.stringify({ workflow_id: workflowId, trigger_type: "on_demand" }) });
      await loadAgentData();
      setMessage(`${workflowId} completed`);
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function approveOutput(outputId: string, action: "approve" | "reject") {
    await api(`/agent/outputs/${outputId}/approval`, { method: "PATCH", body: JSON.stringify({ action }) });
    await loadAgentData();
    setMessage(action === "approve" ? "Agent output approved." : "Agent output rejected.");
  }

  return (
    <main className="shell">
      <AppNavbar active="agent" />
      <section className="header">
        <div>
          <p className="eyebrow">Coffeelot Agent</p>
          <h1>Agent dashboard & activity timeline</h1>
        </div>
        <span>{message}</span>
      </section>

      <section className="panel agent-controls">
        <h2>Run workflow</h2>
        <div className="agent-workflows">
          {workflows.map((workflow) => (
            <button key={workflow} onClick={() => runWorkflow(workflow).catch((error) => setMessage(error.message))} disabled={Boolean(runningWorkflow)}>
              {runningWorkflow === workflow ? "Running..." : workflow.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </section>

      <AgentInsightComparisonTable runs={runs} />

      <section className="panel agent-timeline">
        <h2>Activity timeline</h2>
        {runs.length === 0 ? <p>No agent runs yet.</p> : null}
        {runs.map((run) => (
          <article key={run.id} className="agent-run-card">
            <div className="agent-run-head">
              <strong>{run.workflowId.replaceAll("_", " ")}</strong>
              <span className={run.status === "completed" ? "status-ok" : run.status === "failed" ? "status-bad" : "status-warn"}>{run.status}</span>
            </div>
            <small>{new Date(run.startedAt).toLocaleString("id-ID")} • {run.triggerType}</small>
            {run.errorMessage ? <code>{run.errorMessage}</code> : null}
            {run.outputs.map((output) => (
              <div key={output.id} className="agent-output-card">
                <div className="agent-output-head">
                  <strong>{output.title}</strong>
                  <em>{output.outputType}</em>
                </div>
                {output.requiresApproval ? (
                  <div className="approval-row">
                    <span className={output.approved === true ? "approval approved" : output.approved === false ? "approval rejected" : "approval pending"}>
                      {output.approved === true ? "Approved" : output.approved === false ? "Rejected" : "Needs approval"}
                    </span>
                    {output.approved == null ? (
                      <div>
                        <button onClick={() => approveOutput(output.id, "approve").catch((error) => setMessage(error.message))}>Approve</button>
                        <button className="secondary-button" onClick={() => approveOutput(output.id, "reject").catch((error) => setMessage(error.message))}>Reject</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <AgentInsightCard metadata={output.metadata} />
                <BookingInsightCard metadata={output.metadata} />
                <details>
                  <summary>Raw output</summary>
                  <pre>{output.content}</pre>
                </details>
              </div>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

function WebChatOrder() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryStatusItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState(readSearchParam("name"));
  const [tableLabel, setTableLabel] = useState(readSearchParam("table") || readSearchParam("meja"));
  const [paymentMethod, setPaymentMethod] = useState<DokuPaymentMethod>("qris");
  const [session, setSession] = useState<ChatCartSession | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedOrderStatus, setSubmittedOrderStatus] = useState<string | null>(null);
  const [submittedPrepStatus, setSubmittedPrepStatus] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [message, setMessage] = useState("Pilih menu untuk mulai order.");

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);
  const projectedStock = useMemo(() => projectedStockItems(inventoryItems, products, cart), [inventoryItems, products, cart]);
  const hasInsufficientProjectedStock = projectedStock.some((item) => item.insufficient);

  useEffect(() => {
    Promise.all([api<PosProduct[]>("/products/pos"), api<InventoryStatusItem[]>("/inventory")])
      .then(([nextProducts, nextInventory]) => { setProducts(nextProducts); setInventoryItems(nextInventory); })
      .catch((error) => setMessage(error.message));
  }, []);

  function addProduct(product: PosProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) return current.map((line) => (line.productId === product.id ? { ...line, qty: line.qty + 1 } : line));
      return [...current, { productId: product.id, name: product.name, qty: 1, unitPrice: Number(product.price) }];
    });
  }

  function changeQty(index: number, delta: number) {
    setCart((current) => current.flatMap((line, lineIndex) => {
      if (lineIndex !== index) return [line];
      const qty = line.qty + delta;
      return qty <= 0 ? [] : [{ ...line, qty }];
    }));
  }

  async function submitChatOrder() {
    if (cart.length === 0) return;
    if (hasInsufficientProjectedStock) {
      setMessage("Stok sementara tidak cukup. Kurangi qty sebelum checkout.");
      return;
    }
    setMessage("Membuat order chat...");
    const createdSession = await api<ChatCartSession>("/chat-carts", {
      method: "POST",
      body: JSON.stringify({
        table_label: tableLabel || undefined,
        customer_name: customerName || undefined,
        source_channel: "webchat",
      }),
    });
    setSession(createdSession);

    for (const item of cart) {
      await api(`/chat-carts/${createdSession.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          product_id: item.productId,
          item_name: item.name,
          qty: item.qty,
          unit_price: item.unitPrice,
          notes: item.notes,
        }),
      });
    }

    const result = await api<{ order: { id: string; total: number; orderStatus?: string; prepStatus?: string } }>(`/chat-carts/${createdSession.id}/submit`, { method: "POST" });
    setSubmittedOrderId(result.order.id);
    setSubmittedOrderStatus(result.order.orderStatus ?? "pending_payment");
    setSubmittedPrepStatus(result.order.prepStatus ?? "new");

    const createdPayment = await api<PaymentResult>("/payments/create", {
      method: "POST",
      body: JSON.stringify({ order_id: result.order.id, payment_method: paymentMethod }),
    });
    setPayment(createdPayment);
    setCart([]);
    setMessage("Order terkirim. Silakan lanjut pembayaran.");
  }

  async function checkPaymentStatus({ silent = false } = {}) {
    if (!payment?.id) return;
    if (!silent) setCheckingPayment(true);
    try {
      const reconcile = await api<{ payment?: { status?: string; paidAt?: string | null }; provider?: { status?: string } }>(`/payments/${payment.id}/reconcile`, { method: "POST" });
      const nextStatus = reconcile.payment?.status ?? reconcile.provider?.status ?? payment.status ?? "pending";
      setPayment((current) => current ? { ...current, status: nextStatus } : current);
      if (nextStatus === "paid") {
        setSubmittedOrderStatus("paid");
        if (submittedOrderId) {
          const order = await api<OrderDetail>(`/orders/${submittedOrderId}`);
          setOrderDetail(order);
          setSubmittedPrepStatus(order.prepStatus);
        }
        if (!silent) setMessage("Pembayaran diterima. Pesanan sedang diproses.");
      } else if (!silent) {
        setMessage(`Status pembayaran: ${nextStatus}`);
      }
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  }


  useEffect(() => {
    if (!payment?.id || payment.status === "paid") return;
    const timer = window.setInterval(() => {
      checkPaymentStatus({ silent: true }).catch((error) => setMessage(error.message));
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [payment?.id, payment?.status, submittedOrderId]);

  useEffect(() => {
    if (!submittedOrderId || payment?.status !== "paid") return;
    let cancelled = false;
    const loadOrder = async () => {
      const order = await api<OrderDetail>(`/orders/${submittedOrderId}`);
      if (cancelled) return;
      setOrderDetail(order);
      setSubmittedOrderStatus(order.orderStatus);
      setSubmittedPrepStatus(order.prepStatus);
    };
    loadOrder().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => loadOrder().catch((error) => setMessage(error.message)), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [submittedOrderId, payment?.status]);

  const locked = Boolean(payment);

  return (
    <main className="chat-shell">
      <AppNavbar active="chat" />
      <section className="chat-hero">
        <p className="eyebrow">Coffeelot Webchat Order</p>
        <h1>Pesan kopi dari meja kamu</h1>
        <span>{message}</span>
      </section>

      <section className="chat-layout">
        <div className="panel products">
          <div className="chat-fields">
            <input placeholder="Nama customer" value={customerName} disabled={locked} onChange={(event) => setCustomerName(event.target.value)} />
            <input placeholder="No meja / pickup label" value={tableLabel} disabled={locked} onChange={(event) => setTableLabel(event.target.value)} />
          </div>
          {categories.map((category) => (
            <div key={category}>
              <h2>{category}</h2>
              <div className="product-grid chat-product-grid">
                {products.filter((product) => product.category === category).map((product) => (
                  <button key={product.id} disabled={locked} onClick={() => addProduct(product)}>
                    <strong>{product.name}</strong>
                    <span>{money(Number(product.price))}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="panel chat-cart">
          <h2>Order kamu</h2>
          {customerName ? <div className="customer-badge">Pemesan: <strong>{customerName}</strong></div> : null}
          {cart.length === 0 && !locked ? <p>Belum ada item.</p> : null}
          {cart.map((item, index) => (
            <div className="cart-line chat-cart-line" key={`${item.name}-${index}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{money(item.unitPrice)} × {item.qty}</span>
              </div>
              <div className="qty-actions">
                <button disabled={locked} onClick={() => changeQty(index, -1)}>-</button>
                <button disabled={locked} onClick={() => changeQty(index, 1)}>+</button>
              </div>
            </div>
          ))}
          <label>
            Pembayaran
            <select value={paymentMethod} disabled={locked} onChange={(event) => setPaymentMethod(event.target.value as DokuPaymentMethod)}>
              <option value="qris">QR / QRIS</option>
              <option value="va_bca">VA BCA</option>
            </select>
          </label>
          <div className="total">Total {money(total)}</div>
          {hasInsufficientProjectedStock && !locked ? <small className="stock-warning">Stok sementara tidak cukup. Kurangi qty sebelum checkout.</small> : null}
          <button className="checkout" disabled={cart.length === 0 || locked || hasInsufficientProjectedStock} onClick={() => submitChatOrder().catch((error) => setMessage(error.message))}>{locked ? "Order terkirim" : "Kirim order"}</button>
          {!locked && cart.length > 0 ? (
            <div className="temporary-stock">
              <strong>Temporary stock setelah cart</strong>
              {projectedStock.filter((item) => item.reserved > 0).map((item) => (
                <small key={item.id} className={item.insufficient ? "stock-warning" : ""}>{item.name}: {Number(item.currentStock)} - {item.reserved} = {item.projected} {item.unit}</small>
              ))}
            </div>
          ) : null}
          {session ? <small>Chat session: {session.id}</small> : null}
          {submittedOrderId ? <small>Order: {submittedOrderId}</small> : null}
          {payment?.status === "paid" ? (
            <div className="order-status-box">
              <strong>Status pesanan</strong>
              <span>Pemesan: {customerName || "Customer"}</span>
              <span>Pembayaran: lunas</span>
              <span>Order: {orderDetail?.orderStatus ?? submittedOrderStatus ?? "diproses"}</span>
              <span>Dapur/barista: {orderDetail?.prepStatus ?? submittedPrepStatus ?? "new"}</span>
              <small>Status pembayaran dan pesanan otomatis diperbarui setiap 5 detik.</small>
            </div>
          ) : payment ? (
            <PaymentBox payment={payment} method={paymentMethod} onCheck={() => checkPaymentStatus().catch((error) => setMessage(error.message))} checking={checkingPayment} />
          ) : null}

        </aside>
      </section>
    </main>
  );
}

const route = window.location.pathname;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {route.startsWith("/chat") ? <WebChatOrder /> : route.startsWith("/agent") ? <AgentDashboard /> : <App />}
  </StrictMode>,
);
