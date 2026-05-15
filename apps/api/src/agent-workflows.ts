import { prisma } from "./db";

export const AGENT_WORKFLOWS = ["daily_report", "restock_alert", "risk_detection", "promo_generation", "morning_briefing"] as const;
export type AgentWorkflowId = (typeof AGENT_WORKFLOWS)[number];
export type AgentTriggerType = "scheduled" | "event" | "on_demand";

type AgentWorkflowOutput = {
  outputType: "report" | "alert" | "recommendation" | "promo" | "briefing";
  title: string;
  content: string;
  metadata: string;
  requiresApproval: boolean;
};

export type AgentRunInput = {
  tenantId: string;
  outletId: string;
  workflowId: AgentWorkflowId;
  triggerType?: AgentTriggerType;
};

function dayRange(offsetDays = 0) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function salesSnapshot(input: AgentRunInput, offsetDays = 0) {
  const { start, end } = dayRange(offsetDays);
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
  return { start, end, orders, totalRevenue, totalOrders, averageOrderValue, bestSellers };
}

async function runDailyReport(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const snapshot = await salesSnapshot(input);
  const title = `Daily report — ${snapshot.start.toISOString().slice(0, 10)}`;
  const content = [
    `Revenue: ${snapshot.totalRevenue}`,
    `Orders: ${snapshot.totalOrders}`,
    `Average order value: ${Math.round(snapshot.averageOrderValue)}`,
    snapshot.bestSellers.length ? `Best sellers: ${snapshot.bestSellers.map(([name, data]) => `${name} (${data.qty})`).join(", ")}` : "Best sellers: no paid orders yet",
  ].join("\n");
  return {
    outputType: "report",
    title,
    content,
    metadata: JSON.stringify({ totalRevenue: snapshot.totalRevenue, totalOrders: snapshot.totalOrders, averageOrderValue: snapshot.averageOrderValue, bestSellers: snapshot.bestSellers }),
    requiresApproval: false,
  };
}

async function runRestockAlert(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const items = await prisma.inventoryItem.findMany({ where: { tenantId: input.tenantId, outletId: input.outletId }, orderBy: { name: "asc" } });
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

async function runRiskDetection(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const today = await salesSnapshot(input);
  const yesterday = await salesSnapshot(input, -1);
  const inventory = await prisma.inventoryItem.findMany({ where: { tenantId: input.tenantId, outletId: input.outletId }, orderBy: { name: "asc" } });
  const lowStock = inventory.filter((item) => Number(item.currentStock) <= Number(item.minimumStock));
  const revenueDrop = yesterday.totalRevenue > 0 ? (yesterday.totalRevenue - today.totalRevenue) / yesterday.totalRevenue : 0;
  const risks: string[] = [];
  if (lowStock.length > 0) risks.push(`${lowStock.length} inventory item(s) at/below minimum: ${lowStock.map((item) => item.name).join(", ")}.`);
  if (yesterday.totalRevenue > 0 && revenueDrop >= 0.3) risks.push(`Revenue is down ${Math.round(revenueDrop * 100)}% vs yesterday so far.`);
  if (today.totalOrders === 0) risks.push("No paid orders recorded today yet.");
  if (today.averageOrderValue > 0 && today.averageOrderValue < 15_000) risks.push(`Average order value is low at ${Math.round(today.averageOrderValue)}.`);
  return {
    outputType: risks.length > 0 ? "alert" : "report",
    title: risks.length > 0 ? `Risk detection — ${risks.length} signal(s)` : "Risk detection — all clear",
    content: risks.length > 0 ? risks.map((risk) => `- ${risk}`).join("\n") : "No major operational risks detected from today's sales/inventory snapshot.",
    metadata: JSON.stringify({ risks, totalRevenue: today.totalRevenue, yesterdayRevenue: yesterday.totalRevenue, lowStock: lowStock.map((item) => item.name) }),
    requiresApproval: false,
  };
}

async function runPromoGeneration(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const snapshot = await salesSnapshot(input);
  const products = await prisma.product.findMany({ where: { tenantId: input.tenantId, isActive: true, OR: [{ outletId: null }, { outletId: input.outletId }] }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const soldNames = new Set(snapshot.bestSellers.map(([name]) => name));
  const candidate = products.find((product) => !soldNames.has(product.name)) ?? products[0];
  const title = candidate ? `Promo idea — push ${candidate.name}` : "Promo idea — no active products";
  const content = candidate
    ? [`Suggested promo: Bundle ${candidate.name} with a best-seller for the next slow hour.`, "Example copy: 'Tambah menu pendamping hari ini dan hemat di jam santai.'", "Action: review margin before publishing."].join("\n")
    : "No active products available for promo generation.";
  return {
    outputType: "promo",
    title,
    content,
    metadata: JSON.stringify({ candidateProductId: candidate?.id, candidateProductName: candidate?.name, bestSellers: snapshot.bestSellers }),
    requiresApproval: true,
  };
}

async function runMorningBriefing(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const yesterday = await salesSnapshot(input, -1);
  const restock = await runRestockAlert(input);
  const critical = JSON.parse(restock.metadata).critical as Array<{ name: string; currentStock: number; minimumStock: number; unit: string }>;
  const topSeller = yesterday.bestSellers[0];
  const content = [
    `Yesterday revenue: ${yesterday.totalRevenue}`,
    `Yesterday orders: ${yesterday.totalOrders}`,
    topSeller ? `Top seller yesterday: ${topSeller[0]} (${topSeller[1].qty})` : "Top seller yesterday: no paid orders",
    critical.length ? `Restock focus: ${critical.map((item) => `${item.name} (${item.currentStock}/${item.minimumStock} ${item.unit})`).join(", ")}` : "Restock focus: all clear",
    "Operator note: check opening stock, prep queue, and payment reconciliation before rush hour.",
  ].join("\n");
  return {
    outputType: "briefing",
    title: `Morning briefing — ${new Date().toISOString().slice(0, 10)}`,
    content,
    metadata: JSON.stringify({ yesterdayRevenue: yesterday.totalRevenue, yesterdayOrders: yesterday.totalOrders, topSeller, critical }),
    requiresApproval: false,
  };
}

async function executeWorkflow(input: AgentRunInput) {
  if (input.workflowId === "daily_report") return runDailyReport(input);
  if (input.workflowId === "restock_alert") return runRestockAlert(input);
  if (input.workflowId === "risk_detection") return runRiskDetection(input);
  if (input.workflowId === "promo_generation") return runPromoGeneration(input);
  if (input.workflowId === "morning_briefing") return runMorningBriefing(input);
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
