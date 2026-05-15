import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
      {qr ? <code>{qr}</code> : null}
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
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState(0);
  const [message, setMessage] = useState("Ready");
  const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<DokuPaymentMethod | undefined>();
  const [checkingLastPayment, setCheckingLastPayment] = useState(false);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);

  async function load() {
    const [posProducts, queue] = await Promise.all([
      api<PosProduct[]>("/products/pos"),
      api<KitchenOrder[]>("/kitchen/orders"),
    ]);
    setProducts(posProducts);
    setKitchenOrders(queue);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
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
      const status = await api<{ id: string; status: string; paid_at?: string | null }>(`/payments/${lastPayment.id}/status`);
      setLastPayment((current) => current ? { ...current, status: status.status } : current);
      setMessage(status.status === "paid" ? "Pembayaran sudah diterima." : `Status pembayaran: ${status.status}`);
    } finally {
      setCheckingLastPayment(false);
    }
  }

  return (
    <main className="shell">
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
          <button className="checkout" disabled={cart.length === 0} onClick={checkout}>Checkout</button>
          <PaymentBox payment={lastPayment} method={lastPaymentMethod} onCheck={() => checkLastPaymentStatus().catch((error) => setMessage(error.message))} checking={checkingLastPayment} />
        </div>
      </section>

      <section className="panel kitchen">
        <h2>Kitchen / Barista Queue</h2>
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

function WebChatOrder() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState(readSearchParam("name"));
  const [tableLabel, setTableLabel] = useState(readSearchParam("table") || readSearchParam("meja"));
  const [paymentMethod, setPaymentMethod] = useState<DokuPaymentMethod>("qris");
  const [session, setSession] = useState<ChatCartSession | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedOrderStatus, setSubmittedOrderStatus] = useState<string | null>(null);
  const [submittedPrepStatus, setSubmittedPrepStatus] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [message, setMessage] = useState("Pilih menu untuk mulai order.");

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);

  useEffect(() => {
    api<PosProduct[]>("/products/pos").then(setProducts).catch((error) => setMessage(error.message));
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

  async function checkPaymentStatus() {
    if (!payment?.id) return;
    setCheckingPayment(true);
    try {
      const status = await api<{ id: string; status: string; paid_at?: string | null }>(`/payments/${payment.id}/status`);
      setPayment((current) => current ? { ...current, status: status.status } : current);
      if (status.status === "paid") {
        setSubmittedOrderStatus("paid");
        setMessage("Pembayaran diterima. Pesanan sedang diproses.");
      } else {
        setMessage(`Status pembayaran: ${status.status}`);
      }
    } finally {
      setCheckingPayment(false);
    }
  }

  return (
    <main className="chat-shell">
      <section className="chat-hero">
        <p className="eyebrow">Coffeelot Webchat Order</p>
        <h1>Pesan kopi dari meja kamu</h1>
        <span>{message}</span>
      </section>

      <section className="chat-layout">
        <div className="panel products">
          <div className="chat-fields">
            <input placeholder="Nama customer" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <input placeholder="No meja / pickup label" value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} />
          </div>
          {categories.map((category) => (
            <div key={category}>
              <h2>{category}</h2>
              <div className="product-grid chat-product-grid">
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

        <aside className="panel chat-cart">
          <h2>Order kamu</h2>
          {cart.length === 0 ? <p>Belum ada item.</p> : null}
          {cart.map((item, index) => (
            <div className="cart-line chat-cart-line" key={`${item.name}-${index}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{money(item.unitPrice)} × {item.qty}</span>
              </div>
              <div className="qty-actions">
                <button onClick={() => changeQty(index, -1)}>-</button>
                <button onClick={() => changeQty(index, 1)}>+</button>
              </div>
            </div>
          ))}
          <label>
            Pembayaran
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as DokuPaymentMethod)}>
              <option value="qris">QR / QRIS</option>
              <option value="va_bca">VA BCA</option>
            </select>
          </label>
          <div className="total">Total {money(total)}</div>
          <button className="checkout" disabled={cart.length === 0} onClick={() => submitChatOrder().catch((error) => setMessage(error.message))}>Kirim order</button>
          {session ? <small>Chat session: {session.id}</small> : null}
          {submittedOrderId ? <small>Order: {submittedOrderId}</small> : null}
          {payment?.status === "paid" ? (
            <div className="order-status-box">
              <strong>Status pesanan</strong>
              <span>Pembayaran: lunas</span>
              <span>Order: {submittedOrderStatus === "paid" ? "dibayar" : submittedOrderStatus ?? "diproses"}</span>
              <span>Dapur/barista: {submittedPrepStatus ?? "new"}</span>
              <small>Simpan halaman ini untuk cek status pesanan. Setelah barista update antrean, status dapur akan ikut ditampilkan di versi berikutnya.</small>
            </div>
          ) : (
            <PaymentBox payment={payment} method={paymentMethod} onCheck={() => checkPaymentStatus().catch((error) => setMessage(error.message))} checking={checkingPayment} />
          )}
        </aside>
      </section>
    </main>
  );
}

const route = window.location.pathname;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {route.startsWith("/chat") ? <WebChatOrder /> : <App />}
  </StrictMode>,
);
