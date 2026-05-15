import { prisma } from "./db";

export const AGENT_WORKFLOWS = ["daily_report", "restock_alert"] as const;
export type AgentWorkflowId = (typeof AGENT_WORKFLOWS)[number];
export type AgentTriggerType = "scheduled" | "event" | "on_demand";

export type AgentRunInput = {
  tenantId: string;
  outletId: string;
  workflowId: AgentWorkflowId;
  triggerType?: AgentTriggerType;
};

function todayRange() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function runDailyReport(input: AgentRunInput) {
  const { start, end } = todayRange();
  const orders = await prisma.order.findMany({
    where: { tenantId: input.tenantId, outletId: input.outletId, orderStatus: "paid", createdAt: { gte: start, lt: end } },
    include: { items: true },
  });
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
  const productSales = new Map<string, { qty: number; total: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = productSales.get(item.productName) ?? { qty: 0, total: 0 };
      current.qty += item.qty;
      current.total += Number(item.totalPrice);
      productSales.set(item.productName, current);
    }
  }
  const bestSellers = [...productSales.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const title = `Daily report — ${start.toISOString().slice(0, 10)}`;
  const content = [
    `Revenue: ${totalRevenue}`,
    `Orders: ${totalOrders}`,
    `Average order value: ${Math.round(averageOrderValue)}`,
    bestSellers.length ? `Best sellers: ${bestSellers.map(([name, data]) => `${name} (${data.qty})`).join(", ")}` : "Best sellers: no paid orders yet",
  ].join("\n");
  return {
    outputType: "report",
    title,
    content,
    metadata: JSON.stringify({ totalRevenue, totalOrders, averageOrderValue, bestSellers }),
    requiresApproval: false,
  };
}

async function runRestockAlert(input: AgentRunInput) {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId: input.tenantId, outletId: input.outletId },
    orderBy: { name: "asc" },
  });
  const critical = items.filter((item) => Number(item.currentStock) <= Number(item.minimumStock));
  const title = critical.length > 0 ? `Restock alert — ${critical.length} item(s)` : "Restock alert — all clear";
  const content = critical.length > 0
    ? critical.map((item) => `${item.name}: ${Number(item.currentStock)} ${item.unit} left, minimum ${Number(item.minimumStock)} ${item.unit}`).join("\n")
    : "All inventory items are above minimum stock.";
  return {
    outputType: "alert",
    title,
    content,
    metadata: JSON.stringify({ critical: critical.map((item) => ({ id: item.id, name: item.name, unit: item.unit, currentStock: Number(item.currentStock), minimumStock: Number(item.minimumStock) })) }),
    requiresApproval: false,
  };
}

async function executeWorkflow(input: AgentRunInput) {
  if (input.workflowId === "daily_report") return runDailyReport(input);
  if (input.workflowId === "restock_alert") return runRestockAlert(input);
  throw new Error(`Unknown workflow ${input.workflowId}`);
}

export async function runAgentWorkflow(input: AgentRunInput) {
  const startedAt = new Date();
  const run = await prisma.agentRun.create({
    data: {
      tenantId: input.tenantId,
      outletId: input.outletId,
      workflowId: input.workflowId,
      triggerType: input.triggerType ?? "on_demand",
      status: "running",
      startedAt,
    },
  });

  try {
    const output = await executeWorkflow(input);
    const completed = await prisma.$transaction(async (tx) => {
      const savedOutput = await tx.agentOutput.create({
        data: {
          runId: run.id,
          tenantId: input.tenantId,
          outputType: output.outputType,
          title: output.title,
          content: output.content,
          metadata: output.metadata,
          requiresApproval: output.requiresApproval,
        },
      });
      const savedRun = await tx.agentRun.update({ where: { id: run.id }, data: { status: "completed", completedAt: new Date() } });
      return { run: savedRun, outputs: [savedOutput] };
    });
    return completed;
  } catch (error) {
    const failed = await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Unknown agent workflow error" },
    });
    return { run: failed, outputs: [] };
  }
}
