import { Elysia, t } from "elysia";
import { isDokuPaymentMethod, isPaymentMethod } from "@coffeelot/shared";
import { resolveTenantContext } from "./context";
import { prisma } from "./db";
import { ApiError, statusFromError, toErrorEnvelope } from "./errors";
import { createDokuMcpPayment, listDokuMcpTools } from "./doku-mcp";
import { getDokuTransactionStatus } from "./payment-reconciliation";
import { createSandboxPayment, normalizePaymentStatus } from "./payments";
import { AGENT_WORKFLOWS, runAgentWorkflow, type AgentTriggerType, type AgentWorkflowId } from "./agent-workflows";
import { startAgentScheduler } from "./agent-scheduler";

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "127.0.0.1";

function invoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.floor(Math.random() * 10_000).toString().padStart(4, "0");
  return `CLT-${date}-${suffix}`;
}

const allowedOrigins = new Set([
  "https://coffeelot.app",
  "https://www.coffeelot.app",
  "https://app.coffeelot.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function applyCors(origin: string | null, set: { headers?: Record<string, unknown> }) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://coffeelot.app";
  set.headers = {
    ...(set.headers ?? {}),
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-tenant-id,x-outlet-id,authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

type PaymentRecord = Awaited<ReturnType<typeof prisma.payment.findFirstOrThrow>>;

function runAgentEventWorkflow(input: { tenantId: string; outletId: string; workflowId: AgentWorkflowId; eventName: string; orderId?: string }) {
  const enabled = process.env.AGENT_EVENT_TRIGGERS_ENABLED !== "false";
  if (!enabled) return;
  setTimeout(async () => {
    try {
      const result = await runAgentWorkflow({ tenantId: input.tenantId, outletId: input.outletId, workflowId: input.workflowId, triggerType: "event" });
      console.log(`Agent event ${input.eventName} ran ${input.workflowId}: ${result.run.status}`);
    } catch (error) {
      console.error(`Agent event ${input.eventName} failed ${input.workflowId}`, error instanceof Error ? error.message : error);
    }
  }, 0).unref();
}

async function triggerPaidOrderAgentEvents(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { tenantId: true, outletId: true } });
  if (!order) return;

  if (process.env.AGENT_EVENT_PAID_ORDER_DAILY_REPORT_ENABLED !== "false") {
    runAgentEventWorkflow({ tenantId: order.tenantId, outletId: order.outletId, workflowId: "daily_report", eventName: "paid_order", orderId });
  }

  const inventory = await prisma.inventoryItem.findMany({ where: { tenantId: order.tenantId, outletId: order.outletId } });
  const hasLowStock = inventory.some((item) => Number(item.currentStock) <= Number(item.minimumStock));
  if (hasLowStock) {
    runAgentEventWorkflow({ tenantId: order.tenantId, outletId: order.outletId, workflowId: "restock_alert", eventName: "low_stock_after_paid_order", orderId });
  }
}


async function getOrderStockRequirements(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const productIds = [...new Set(order.items.map((item) => item.productId))];
  const recipes = await tx.productRecipe.findMany({
    where: { tenantId: order.tenantId, productId: { in: productIds } },
    include: { inventoryItem: true },
  });
  const requirements = new Map<string, { inventoryItemId: string; name: string; unit: string; required: number; available: number; lines: string[] }>();
  for (const item of order.items) {
    for (const recipe of recipes.filter((candidate) => candidate.productId === item.productId)) {
      const current = requirements.get(recipe.inventoryItemId) ?? {
        inventoryItemId: recipe.inventoryItemId,
        name: recipe.inventoryItem.name,
        unit: recipe.inventoryItem.unit,
        required: 0,
        available: Number(recipe.inventoryItem.currentStock),
        lines: [],
      };
      const qty = Number(recipe.qtyUsed) * item.qty;
      current.required += qty;
      current.lines.push(`${item.qty}× ${item.productName}`);
      requirements.set(recipe.inventoryItemId, current);
    }
  }
  return { order, requirements: [...requirements.values()] };
}

async function assertSufficientStockForOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const { requirements } = await getOrderStockRequirements(tx, orderId);
  const insufficient = requirements.filter((item) => item.available < item.required);
  if (insufficient.length > 0) {
    throw new ApiError("INSUFFICIENT_STOCK", `Insufficient stock: ${insufficient.map((item) => `${item.name} needs ${item.required} ${item.unit}, available ${item.available} ${item.unit}`).join("; ")}`, 409);
  }
}

async function deductStockForPaidOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const existingSaleMovement = await tx.stockMovement.findFirst({ where: { orderId, movementType: "sale" } });
  if (existingSaleMovement) return { deducted: false, reason: "already_deducted" };

  const { order, requirements } = await getOrderStockRequirements(tx, orderId);
  const insufficient = requirements.filter((item) => item.available < item.required);
  if (insufficient.length > 0) {
    throw new ApiError("INSUFFICIENT_STOCK", `Insufficient stock: ${insufficient.map((item) => `${item.name} needs ${item.required} ${item.unit}, available ${item.available} ${item.unit}`).join("; ")}`, 409);
  }

  let movements = 0;
  for (const requirement of requirements) {
    const stockBefore = requirement.available;
    const stockAfter = stockBefore - requirement.required;
    await tx.inventoryItem.update({ where: { id: requirement.inventoryItemId }, data: { currentStock: stockAfter } });
    await tx.stockMovement.create({
      data: {
        tenantId: order.tenantId,
        outletId: order.outletId,
        inventoryItemId: requirement.inventoryItemId,
        movementType: "sale",
        qty: requirement.required,
        stockBefore,
        stockAfter,
        orderId: order.id,
        note: `Sale deduction: ${requirement.lines.join(", ")}`,
      },
    });
    movements += 1;
  }
  return { deducted: movements > 0, movements };
}

async function markPaymentFromProviderStatus(payment: PaymentRecord, status: string, rawResponse: unknown) {
  const paidAt = status === "paid" ? new Date() : payment.paidAt;
  const wasAlreadyPaid = payment.status === "paid" && Boolean(payment.paidAt);
  const updatedPayment = await prisma.$transaction(async (tx) => {
    const savedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        paidAt,
        rawResponse: JSON.stringify(rawResponse),
      },
    });

    if (status === "paid") {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { orderStatus: "paid" },
      });
      await deductStockForPaidOrder(tx, payment.orderId);
    }

    return savedPayment;
  });

  if (status === "paid" && !wasAlreadyPaid) {
    await triggerPaidOrderAgentEvents(payment.orderId);
  }

  return updatedPayment;
}

async function reconcilePayment(payment: PaymentRecord) {
  const invoice = payment.dokuInvoiceId;
  if (!invoice) throw new ApiError("INVALID_PAYLOAD", "Payment does not have a DOKU invoice reference", 400);

  const provider = await getDokuTransactionStatus(invoice);
  const shouldUpdate = payment.status !== provider.status || (provider.status === "paid" && !payment.paidAt);
  const updated = shouldUpdate
    ? await markPaymentFromProviderStatus(payment, provider.status, { source: "doku-mcp-reconcile", provider })
    : payment;

  return { payment: updated, provider, updated: shouldUpdate };
}

async function reconcilePendingPayments(limit = 20) {
  const payments = await prisma.payment.findMany({
    where: {
      status: "pending",
      dokuInvoiceId: { not: null },
      expiredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results = [];
  for (const payment of payments) {
    try {
      results.push({ id: payment.id, ...(await reconcilePayment(payment)) });
    } catch (error) {
      results.push({ id: payment.id, error: error instanceof Error ? error.message : "Unknown reconcile error" });
    }
  }
  return results;
}

export const app = new Elysia({ prefix: "/api" })
  .onRequest(({ request, set }) => {
    applyCors(request.headers.get("origin"), set);
  })
  .options("/*", ({ request, set }) => {
    applyCors(request.headers.get("origin"), set);
    set.status = 204;
    return "";
  })
  .onError(({ error, set }) => {
    set.status = statusFromError(error);
    return toErrorEnvelope(error);
  })
  .get("/health", () => ({ ok: true, service: "coffeelot-api" }))
  .get("/context", async ({ headers }) => {
    const ctx = resolveTenantContext(headers);
    const [tenant, outlet] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId }, select: { id: true, name: true } }),
      prisma.outlet.findUniqueOrThrow({ where: { id: ctx.outletId }, select: { id: true, name: true } }),
    ]);
    return { tenant, outlet };
  })
  .get("/outlets", async ({ headers }) => {
    const { tenantId } = resolveTenantContext(headers);
    return prisma.outlet.findMany({
      where: { tenantId },
      select: { id: true, name: true, address: true },
      orderBy: { name: "asc" },
    });
  })
  .get("/products", async ({ headers }) => {
    const { tenantId } = resolveTenantContext(headers);
    return prisma.product.findMany({ where: { tenantId }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  })
  .get("/products/pos", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    return prisma.product.findMany({
      where: { tenantId, isActive: true, OR: [{ outletId: null }, { outletId }] },
      include: {
        recipes: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, unit: true, currentStock: true, minimumStock: true },
            },
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  })
  .post(
    "/products",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      return prisma.product.create({
        data: {
          tenantId,
          outletId: body.outlet_id ?? outletId ?? null,
          name: body.name,
          category: body.category,
          price: body.price,
          isActive: body.is_active ?? true,
        },
      });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        category: t.String({ minLength: 1 }),
        price: t.Number({ minimum: 0 }),
        is_active: t.Optional(t.Boolean()),
        outlet_id: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .patch(
    "/products/:id",
    async ({ headers, params, body }) => {
      const { tenantId } = resolveTenantContext(headers);
      await prisma.product.findFirstOrThrow({ where: { id: params.id, tenantId } });
      return prisma.product.update({
        where: { id: params.id },
        data: {
          name: body.name,
          category: body.category,
          price: body.price,
          isActive: body.is_active,
          outletId: body.outlet_id,
        },
      });
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        category: t.Optional(t.String({ minLength: 1 })),
        price: t.Optional(t.Number({ minimum: 0 })),
        is_active: t.Optional(t.Boolean()),
        outlet_id: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .delete("/products/:id", async ({ headers, params }) => {
    const { tenantId } = resolveTenantContext(headers);
    await prisma.product.findFirstOrThrow({ where: { id: params.id, tenantId } });
    return prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
  })
  .get("/inventory", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const items = await prisma.inventoryItem.findMany({ where: { tenantId, outletId }, orderBy: { name: "asc" } });
    return items.map((item) => ({ ...item, low_stock: Number(item.currentStock) <= Number(item.minimumStock) }));
  })
  .post(
    "/inventory/:id/restock",
    async ({ headers, params, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      if (body.qty <= 0) throw new ApiError("INVALID_PAYLOAD", "qty must be greater than 0");
      return prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findFirstOrThrow({ where: { id: params.id, tenantId, outletId } });
        const stockBefore = Number(item.currentStock);
        const stockAfter = stockBefore + body.qty;
        const updated = await tx.inventoryItem.update({ where: { id: item.id }, data: { currentStock: stockAfter } });
        const movement = await tx.stockMovement.create({
          data: { tenantId, outletId, inventoryItemId: item.id, movementType: "restock", qty: body.qty, stockBefore, stockAfter, note: body.note },
        });
        return { item: updated, movement };
      });
    },
    { body: t.Object({ qty: t.Number({ exclusiveMinimum: 0 }), note: t.Optional(t.String()) }) },
  )
  .post(
    "/orders",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      if (!isPaymentMethod(body.payment_method)) throw new ApiError("INVALID_PAYLOAD", "Invalid payment_method");
      if (body.items.length === 0) throw new ApiError("INVALID_PAYLOAD", "At least one order item is required");

      const result = await prisma.$transaction(async (tx) => {
        const productIds = body.items.map((item) => item.product_id);
        const products = await tx.product.findMany({ where: { tenantId, id: { in: productIds }, isActive: true } });
        if (products.length !== productIds.length) throw new ApiError("INACTIVE_PRODUCT", "One or more products are inactive or missing");

        const productMap = new Map(products.map((product) => [product.id, product]));
        const subtotal = body.items.reduce((sum, item) => {
          const product = productMap.get(item.product_id)!;
          return sum + Number(product.price) * item.qty;
        }, 0);
        const discount = body.discount ?? 0;
        const total = Math.max(0, subtotal - discount);

        const order = await tx.order.create({
          data: {
            tenantId,
            outletId,
            customerId: body.customer_id,
            invoiceNumber: invoiceNumber(),
            orderStatus: "paid",
            prepStatus: "new",
            orderChannel: "cashier",
            paymentMethod: body.payment_method,
            subtotal,
            discount,
            total,
            notes: body.notes,
            items: {
              create: body.items.map((item) => {
                const product = productMap.get(item.product_id)!;
                return {
                  tenantId,
                  productId: product.id,
                  productName: product.name,
                  qty: item.qty,
                  unitPrice: Number(product.price),
                  totalPrice: Number(product.price) * item.qty,
                  notes: item.notes,
                };
              }),
            },
          },
          include: { items: true },
        });

        await deductStockForPaidOrder(tx, order.id);
        return { order, items: order.items };
      });
      await triggerPaidOrderAgentEvents(result.order.id);
      return result;
    },
    {
      body: t.Object({
        payment_method: t.String(),
        discount: t.Optional(t.Number({ minimum: 0 })),
        customer_id: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        items: t.Array(t.Object({ product_id: t.String(), qty: t.Integer({ minimum: 1 }), notes: t.Optional(t.String()) })),
      }),
    },
  )
  .get("/orders", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    return prisma.order.findMany({ where: { tenantId, outletId }, include: { items: true }, orderBy: { createdAt: "desc" } });
  })
  .get("/orders/:id", async ({ headers, params }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    return prisma.order.findFirstOrThrow({ where: { id: params.id, tenantId, outletId }, include: { items: true } });
  })


  .get("/kitchen/orders", async ({ headers, query }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const status = query.status as string | undefined;
    return prisma.order.findMany({
      where: {
        tenantId,
        outletId,
        orderStatus: "paid",
        prepStatus: status ?? { not: "completed" },
      },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
  })
  .patch(
    "/kitchen/orders/:id/status",
    async ({ headers, params, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      const allowed = ["new", "preparing", "ready", "completed"];
      if (!allowed.includes(body.prep_status)) throw new ApiError("INVALID_PAYLOAD", "Invalid prep_status");
      await prisma.order.findFirstOrThrow({ where: { id: params.id, tenantId, outletId } });
      return prisma.order.update({
        where: { id: params.id },
        data: { prepStatus: body.prep_status },
        select: { id: true, prepStatus: true, updatedAt: true },
      });
    },
    { body: t.Object({ prep_status: t.String() }) },
  )
  .post(
    "/order-links",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      const token = `qr-${outletId}-${body.table_label ?? "general"}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      return prisma.qrOrderLink.create({
        data: { tenantId, outletId: body.outlet_id ?? outletId, tableLabel: body.table_label, token, isActive: true },
      });
    },
    { body: t.Object({ outlet_id: t.Optional(t.String()), table_label: t.Optional(t.String()) }) },
  )
  .post(
    "/chat-carts",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      return prisma.chatCartSession.create({
        data: {
          tenantId,
          outletId,
          tableLabel: body.table_label,
          customerName: body.customer_name,
          customerContact: body.customer_contact,
          sourceChannel: body.source_channel ?? "chat",
          status: "active",
        },
        include: { items: true },
      });
    },
    {
      body: t.Object({
        table_label: t.Optional(t.String()),
        customer_name: t.Optional(t.String()),
        customer_contact: t.Optional(t.String()),
        source_channel: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/chat-carts/:id/items",
    async ({ params, body }) => {
      const product = body.product_id ? await prisma.product.findUnique({ where: { id: body.product_id } }) : null;
      return prisma.chatCartItem.create({
        data: {
          sessionId: params.id,
          productId: body.product_id,
          itemName: product?.name ?? body.item_name,
          qty: body.qty,
          unitPrice: product ? Number(product.price) : body.unit_price,
          notes: body.notes,
        },
      });
    },
    { body: t.Object({ product_id: t.Optional(t.String()), item_name: t.String(), qty: t.Integer({ minimum: 1 }), unit_price: t.Number({ minimum: 0 }), notes: t.Optional(t.String()) }) },
  )
  .delete("/chat-carts/:id/items/:itemId", async ({ params }) => {
    return prisma.chatCartItem.delete({ where: { id: params.itemId } });
  })
  .post("/chat-carts/:id/submit", async ({ headers, params }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const session = await prisma.chatCartSession.findFirstOrThrow({ where: { id: params.id, tenantId, outletId }, include: { items: true } });
    const subtotal = session.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0);
    const order = await prisma.order.create({
      data: {
        tenantId,
        outletId,
        invoiceNumber: null,
        orderStatus: "pending_payment",
        prepStatus: "new",
        orderChannel: "chat",
        tableLabel: session.tableLabel,
        paymentMethod: "qris",
        subtotal,
        discount: 0,
        total: subtotal,
        notes: `Chat cart ${session.id}`,
        items: {
          create: session.items.map((item) => ({
            tenantId,
            productId: item.productId ?? "demo-product-es-kopi-susu",
            productName: item.itemName,
            qty: item.qty,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.unitPrice) * item.qty,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });
    await prisma.chatCartSession.update({ where: { id: session.id }, data: { status: "submitted" } });
    return { order, items: order.items };
  })

  .post(
    "/payments/create",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      if (!isDokuPaymentMethod(body.payment_method)) throw new ApiError("INVALID_PAYLOAD", "Invalid DOKU payment_method");

      const order = await prisma.order.findFirstOrThrow({ where: { id: body.order_id, tenantId, outletId } });
      await prisma.$transaction((tx) => assertSufficientStockForOrder(tx, order.id));
      const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

      const payment = await prisma.payment.create({
        data: {
          tenantId,
          outletId,
          orderId: order.id,
          paymentMethod: body.payment_method,
          amount: Number(order.total),
          status: "pending",
          expiredAt,
        },
      });

      let providerPayment;
      try {
        providerPayment = await createDokuMcpPayment({
          paymentId: payment.id,
          orderId: order.id,
          invoiceNumber: order.invoiceNumber ?? payment.id,
          amount: Number(order.total),
          method: body.payment_method,
          callbackUrl: process.env.DOKU_CALLBACK_URL,
          returnUrl: process.env.DOKU_RETURN_URL,
        });
      } catch (error) {
        const sandbox = createSandboxPayment({
          paymentId: payment.id,
          orderId: order.id,
          amount: Number(order.total),
          method: body.payment_method,
        });
        providerPayment = {
          ...sandbox,
          rawResponse: JSON.stringify({
            provider: "doku-sandbox-placeholder",
            fallbackReason: error instanceof Error ? error.message : "DOKU MCP payment creation failed",
            sandbox: JSON.parse(sandbox.rawResponse),
          }),
        };
      }

      return prisma.payment.update({
        where: { id: payment.id },
        data: {
          dokuInvoiceId: providerPayment.dokuInvoiceId,
          paymentUrl: providerPayment.paymentUrl,
          qrCode: providerPayment.qrCode,
          vaNumber: providerPayment.vaNumber,
          rawResponse: providerPayment.rawResponse,
        },
      });
    },
    { body: t.Object({ order_id: t.String(), payment_method: t.String() }) },
  )
  .get("/payments/doku/tools", async () => {
    try {
      const tools = await listDokuMcpTools({ refresh: true });
      return { ok: true, count: tools.length, tools };
    } catch (error) {
      throw new ApiError("DOKU_MCP_UNAVAILABLE", error instanceof Error ? error.message : "Unable to list DOKU MCP tools", 502);
    }
  })
  .get("/payments", async ({ headers, query }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    return prisma.payment.findMany({
      where: { tenantId, outletId, orderId: query.order_id as string | undefined },
      orderBy: { createdAt: "desc" },
    });
  })
  .get("/payments/:id/status", async ({ headers, params }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const payment = await prisma.payment.findFirstOrThrow({ where: { id: params.id, tenantId, outletId } });
    if (payment.status === "pending" && payment.expiredAt < new Date()) {
      return prisma.payment.update({ where: { id: payment.id }, data: { status: "expired" }, select: { id: true, status: true, paidAt: true } });
    }
    return { id: payment.id, status: payment.status, paid_at: payment.paidAt };
  })
  .post("/payments/:id/reconcile", async ({ headers, params }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const payment = await prisma.payment.findFirstOrThrow({ where: { id: params.id, tenantId, outletId } });
    return reconcilePayment(payment);
  })
  .post("/payments/reconcile-pending", async ({ query }) => {
    const limit = Math.min(Number(query.limit ?? 20), 50);
    const results = await reconcilePendingPayments(limit);
    return { ok: true, count: results.length, results };
  })
  .post(
    "/payments/callback",
    async ({ body }) => {
      const callbackBody = body as Record<string, unknown>;
      const paymentId = typeof callbackBody.payment_id === "string" ? callbackBody.payment_id : undefined;
      const dokuInvoiceId = typeof callbackBody.doku_invoice_id === "string" ? callbackBody.doku_invoice_id : undefined;
      const providerReference =
        dokuInvoiceId ??
        (typeof callbackBody.invoice_number === "string" ? callbackBody.invoice_number : undefined) ??
        (typeof callbackBody.transaction_id === "string" ? callbackBody.transaction_id : undefined) ??
        (typeof callbackBody.reference_id === "string" ? callbackBody.reference_id : undefined);
      if (!paymentId && !providerReference) throw new ApiError("INVALID_CALLBACK", "Missing payment_id or provider reference", 400);

      const statusValue =
        (typeof callbackBody.status === "string" ? callbackBody.status : undefined) ??
        (typeof callbackBody.transaction_status === "string" ? callbackBody.transaction_status : undefined) ??
        (typeof callbackBody.payment_status === "string" ? callbackBody.payment_status : undefined);
      const status = normalizePaymentStatus(statusValue);
      const payment = await prisma.payment.findFirst({
        where: { OR: [{ id: paymentId ?? "" }, { dokuInvoiceId: providerReference ?? "" }] },
      });
      if (!payment) throw new ApiError("PAYMENT_NOT_FOUND", "Payment not found for callback reference", 404);

      const updated = await markPaymentFromProviderStatus(payment, status, { source: "doku-callback", body });

      return { ok: true, payment: updated };
    },
    { body: t.Record(t.String(), t.Unknown()) },
  )
  .get("/reports/recent-orders", async ({ headers, query }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const limit = Math.min(Number(query.limit ?? 10), 50);
    return prisma.order.findMany({
      where: { tenantId, outletId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  })
  .get("/reports/daily", async ({ headers, query }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const day = query.date ? new Date(`${query.date}T00:00:00.000Z`) : new Date();
    day.setUTCHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);

    const orders = await prisma.order.findMany({
      where: { tenantId, outletId, orderStatus: "paid", createdAt: { gte: day, lt: next } },
      include: { items: true },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;
    const productSales = new Map<string, { product_name: string; qty_sold: number; total_sales: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const current = productSales.get(item.productName) ?? { product_name: item.productName, qty_sold: 0, total_sales: 0 };
        current.qty_sold += item.qty;
        current.total_sales += Number(item.totalPrice);
        productSales.set(item.productName, current);
      }
    }

    const inventory = await prisma.inventoryItem.findMany({ where: { tenantId, outletId } });
    return {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_order_value: totalOrders === 0 ? 0 : totalRevenue / totalOrders,
      best_selling_products: [...productSales.values()].sort((a, b) => b.qty_sold - a.qty_sold),
      critical_stock: inventory
        .filter((item) => Number(item.currentStock) <= Number(item.minimumStock))
        .map((item) => ({ name: item.name, current_stock: Number(item.currentStock), minimum_stock: Number(item.minimumStock), unit: item.unit })),
    };
  })
  .get("/agent/workflows", () => ({ workflows: AGENT_WORKFLOWS }))
  .post(
    "/agent/runs",
    async ({ headers, body }) => {
      const { tenantId, outletId } = resolveTenantContext(headers);
      if (!AGENT_WORKFLOWS.includes(body.workflow_id as AgentWorkflowId)) throw new ApiError("INVALID_PAYLOAD", "Unknown agent workflow");
      const triggerType = (body.trigger_type ?? "on_demand") as AgentTriggerType;
      if (!["scheduled", "event", "on_demand"].includes(triggerType)) throw new ApiError("INVALID_PAYLOAD", "Unknown agent trigger_type");
      return runAgentWorkflow({ tenantId, outletId, workflowId: body.workflow_id as AgentWorkflowId, triggerType });
    },
    { body: t.Object({ workflow_id: t.String(), trigger_type: t.Optional(t.String()) }) },
  )
  .get("/agent/runs", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    return prisma.agentRun.findMany({ where: { tenantId, outletId }, include: { outputs: true }, orderBy: { createdAt: "desc" }, take: 50 });
  })
  .get("/agent/outputs", async ({ headers }) => {
    const { tenantId } = resolveTenantContext(headers);
    return prisma.agentOutput.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50 });
  })
  .patch(
    "/agent/outputs/:id/approval",
    async ({ headers, params, body }) => {
      const { tenantId } = resolveTenantContext(headers);
      const approved = body.action === "approve";
      if (!["approve", "reject"].includes(body.action)) throw new ApiError("INVALID_PAYLOAD", "Unknown approval action");
      const output = await prisma.agentOutput.findFirst({ where: { id: params.id, tenantId } });
      if (!output) throw new ApiError("NOT_FOUND", "Agent output not found", 404);
      if (!output.requiresApproval) throw new ApiError("INVALID_PAYLOAD", "Agent output does not require approval", 400);
      return prisma.agentOutput.update({
        where: { id: output.id },
        data: { approved, approvedAt: new Date() },
      });
    },
    { body: t.Object({ action: t.String() }) },
  )
  .get("/reports/critical-stock", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const items = await prisma.inventoryItem.findMany({ where: { tenantId, outletId }, orderBy: { name: "asc" } });
    return items.filter((item) => Number(item.currentStock) <= Number(item.minimumStock));
  });

app.listen({ hostname: host, port });
console.log(`Coffeelot API listening on http://${host}:${port}`);
startAgentScheduler();

const reconcileIntervalMs = Number(process.env.PAYMENT_RECONCILE_INTERVAL_MS ?? 60_000);
const reconcileEnabled = process.env.PAYMENT_RECONCILE_ENABLED !== "false";
if (reconcileEnabled && reconcileIntervalMs > 0) {
  setInterval(async () => {
    try {
      const results = await reconcilePendingPayments(20);
      const updated = results.filter((result) => "updated" in result && result.updated).length;
      if (updated > 0) console.log(`Payment reconciliation updated ${updated} payment(s)`);
    } catch (error) {
      console.error("Payment reconciliation failed", error instanceof Error ? error.message : error);
    }
  }, reconcileIntervalMs).unref();
}
