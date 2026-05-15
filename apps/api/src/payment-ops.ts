import { prisma } from "./db";
import { ApiError } from "./errors";
import { getDokuTransactionStatus } from "./payment-reconciliation";
import { runAgentWorkflow, type AgentWorkflowId } from "./agent-workflows";

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

export async function triggerPaidOrderAgentEvents(orderId: string) {
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

export async function assertSufficientStockForOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const { requirements } = await getOrderStockRequirements(tx, orderId);
  const insufficient = requirements.filter((item) => item.available < item.required);
  if (insufficient.length > 0) {
    throw new ApiError("INSUFFICIENT_STOCK", `Insufficient stock: ${insufficient.map((item) => `${item.name} needs ${item.required} ${item.unit}, available ${item.available} ${item.unit}`).join("; ")}`, 409);
  }
}

export async function deductStockForPaidOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
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

export async function markPaymentFromProviderStatus(payment: PaymentRecord, status: string, rawResponse: unknown) {
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

export async function reconcilePayment(payment: PaymentRecord) {
  const invoice = payment.dokuInvoiceId;
  if (!invoice) throw new ApiError("INVALID_PAYLOAD", "Payment does not have a DOKU invoice reference", 400);

  const provider = await getDokuTransactionStatus(invoice);
  const shouldUpdate = payment.status !== provider.status || (provider.status === "paid" && !payment.paidAt);
  const updated = shouldUpdate
    ? await markPaymentFromProviderStatus(payment, provider.status, { source: "doku-mcp-reconcile", provider })
    : payment;

  return { payment: updated, provider, updated: shouldUpdate };
}

export async function reconcilePendingPayments(limit = 20) {
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
