import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { KitchenOrder, PaymentMethod, PosProduct } from "@coffeelot/shared";
import "./style.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001/api";
const TENANT_ID = import.meta.env.VITE_DEMO_TENANT_ID ?? "demo-tenant-kopi-jagoan";
const OUTLET_ID = import.meta.env.VITE_DEMO_OUTLET_ID ?? "demo-outlet-booth-ciputat";

type CartLine = {
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  notes?: string;
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

function App() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState(0);
  const [message, setMessage] = useState("Ready");

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
    await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        payment_method: paymentMethod,
        items: catalogItems.map((item) => ({ product_id: item.productId, qty: item.qty, notes: item.notes })),
      }),
    });
    setCart([]);
    setMessage("Checkout complete. Order masuk kitchen queue.");
    await load();
  }

  async function updatePrepStatus(orderId: string, prep_status: KitchenOrder["prepStatus"]) {
    await api(`/kitchen/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ prep_status }) });
    await load();
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
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <div className="total">Total {money(total)}</div>
          <button className="checkout" disabled={cart.length === 0} onClick={checkout}>Checkout</button>
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
