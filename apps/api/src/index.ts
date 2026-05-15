import { Elysia, t } from "elysia";
import { isPaymentMethod } from "@coffeelot/shared";
import { resolveTenantContext } from "./context";
import { prisma } from "./db";
import { ApiError, statusFromError, toErrorEnvelope } from "./errors";

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "127.0.0.1";

function invoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.floor(Math.random() * 10_000).toString().padStart(4, "0");
  return `CLT-${date}-${suffix}`;
}

export const app = new Elysia({ prefix: "/api" })
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

      return prisma.$transaction(async (tx) => {
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

        return { order, items: order.items };
      });
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
  .get("/reports/critical-stock", async ({ headers }) => {
    const { tenantId, outletId } = resolveTenantContext(headers);
    const items = await prisma.inventoryItem.findMany({ where: { tenantId, outletId }, orderBy: { name: "asc" } });
    return items.filter((item) => Number(item.currentStock) <= Number(item.minimumStock));
  });

app.listen({ hostname: host, port });
console.log(`Coffeelot API listening on http://${host}:${port}`);
