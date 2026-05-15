import { chatCompletionJson } from "./ai-client";
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


type StructuredInsight = {
  summary: string;
  performance_status: "poor" | "fair" | "good" | "excellent";
  highlights: string[];
  risks: Array<{ title: string; description: string; severity: "low" | "medium" | "high" }>;
  restock_recommendations: Array<{ item_name: string; recommended_qty: number; unit: string; reason: string }>;
  sales_opportunities: Array<{ title: string; description: string; expected_impact: "low" | "medium" | "high" }>;
  next_best_actions: string[];
  owner_message: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function insightToContent(insight: StructuredInsight, provider: string) {
  const lines = [
    `AI Insight: ${insight.summary}`,
    `Performance: ${insight.performance_status}`,
    insight.highlights.length ? `Highlights:\n${insight.highlights.map((item) => `- ${item}`).join("\n")}` : "Highlights: -",
    insight.risks.length ? `Risks:\n${insight.risks.map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.description}`).join("\n")}` : "Risks: no major risk detected",
    insight.restock_recommendations.length ? `Restock recommendations:\n${insight.restock_recommendations.map((item) => `- ${item.item_name}: ${item.recommended_qty} ${item.unit} — ${item.reason}`).join("\n")}` : "Restock recommendations: none",
    insight.sales_opportunities.length ? `Sales opportunities:\n${insight.sales_opportunities.map((item) => `- [${item.expected_impact}] ${item.title}: ${item.description}`).join("\n")}` : "Sales opportunities: none",
    insight.next_best_actions.length ? `Next best actions:\n${insight.next_best_actions.map((item) => `- ${item}`).join("\n")}` : "Next best actions: monitor operations",
    `Owner message: ${insight.owner_message}`,
    provider === "llm" ? "Source: LLM insight" : "Source: rule-based fallback",
  ];
  return lines.join("\n\n");
}

function fallbackInsight(snapshot: Awaited<ReturnType<typeof buildInsightSnapshot>>): StructuredInsight {
  const risks: StructuredInsight["risks"] = [];
  if (snapshot.criticalStock.length > 0) {
    risks.push({ title: "Stok kritis", description: `${snapshot.criticalStock.length} item perlu dicek: ${snapshot.criticalStock.map((item) => item.name).join(", ")}.`, severity: "high" });
  }
  if (snapshot.yesterday.totalRevenue > 0 && snapshot.today.totalRevenue < snapshot.yesterday.totalRevenue * 0.7) {
    risks.push({ title: "Revenue turun", description: `Revenue hari ini turun lebih dari 30% dibanding kemarin (${formatCurrency(snapshot.today.totalRevenue)} vs ${formatCurrency(snapshot.yesterday.totalRevenue)}).`, severity: "medium" });
  }
  if (snapshot.today.totalOrders === 0) risks.push({ title: "Belum ada order paid", description: "Belum ada transaksi paid yang tercatat hari ini.", severity: "medium" });

  const restock = snapshot.criticalStock.map((item) => ({
    item_name: item.name,
    recommended_qty: Math.max(item.minimumStock * 2 - item.currentStock, item.minimumStock),
    unit: item.unit,
    reason: `Stock ${item.currentStock} ${item.unit}, minimum ${item.minimumStock} ${item.unit}.`,
  }));
  const best = snapshot.today.bestSellers[0] ?? snapshot.yesterday.bestSellers[0];
  const activeProduct = snapshot.products.find((product) => product.name !== best?.[0]) ?? snapshot.products[0];
  return {
    summary: snapshot.today.totalOrders > 0 ? `Hari ini ada ${snapshot.today.totalOrders} order paid dengan revenue ${formatCurrency(snapshot.today.totalRevenue)}.` : "Belum ada order paid hari ini; fokus ke kesiapan stok dan dorong menu unggulan.",
    performance_status: risks.some((risk) => risk.severity === "high") ? "poor" : snapshot.today.totalOrders > 0 ? "fair" : "poor",
    highlights: best ? [`Menu terlaris: ${best[0]} (${best[1].qty} terjual).`] : ["Data penjualan masih minim, cocok untuk persiapan operasional."],
    risks,
    restock_recommendations: restock,
    sales_opportunities: activeProduct ? [{ title: `Dorong ${activeProduct.name}`, description: `Jadikan ${activeProduct.name} sebagai rekomendasi kasir/chat untuk menambah variasi penjualan.`, expected_impact: "medium" }] : [],
    next_best_actions: [
      restock.length ? "Restock item kritis sebelum rush hour." : "Pastikan stok pembuka aman sebelum rush hour.",
      "Cek pembayaran pending dan kitchen queue.",
      activeProduct ? `Siapkan promo ringan untuk ${activeProduct.name}.` : "Pantau menu yang mulai bergerak hari ini.",
    ],
    owner_message: "Coffeelot sudah cek data operasional; prioritasnya jaga stok aman dan dorong menu yang paling mudah dijual hari ini.",
  };
}

async function buildInsightSnapshot(input: AgentRunInput) {
  const [today, yesterday, inventory, products] = await Promise.all([
    salesSnapshot(input),
    salesSnapshot(input, -1),
    prisma.inventoryItem.findMany({ where: { tenantId: input.tenantId, outletId: input.outletId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { tenantId: input.tenantId, isActive: true, OR: [{ outletId: null }, { outletId: input.outletId }] }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  const criticalStock = inventory
    .filter((item) => Number(item.currentStock) <= Number(item.minimumStock))
    .map((item) => ({ id: item.id, name: item.name, unit: item.unit, currentStock: Number(item.currentStock), minimumStock: Number(item.minimumStock) }));
  return {
    date: today.start.toISOString().slice(0, 10),
    today: { totalRevenue: today.totalRevenue, totalOrders: today.totalOrders, averageOrderValue: today.averageOrderValue, bestSellers: today.bestSellers },
    yesterday: { totalRevenue: yesterday.totalRevenue, totalOrders: yesterday.totalOrders, averageOrderValue: yesterday.averageOrderValue, bestSellers: yesterday.bestSellers },
    criticalStock,
    products: products.map((product) => ({ id: product.id, name: product.name, category: product.category, price: Number(product.price) })),
  };
}

function normalizeInsight(value: Partial<StructuredInsight> | null | undefined, fallback: StructuredInsight): StructuredInsight {
  const allowedStatus = ["poor", "fair", "good", "excellent"];
  const normalized = value && typeof value === "object" ? value : {};
  return {
    summary: typeof normalized.summary === "string" && normalized.summary.trim() ? normalized.summary : fallback.summary,
    performance_status: allowedStatus.includes(normalized.performance_status ?? "") ? normalized.performance_status! : fallback.performance_status,
    highlights: Array.isArray(normalized.highlights) ? normalized.highlights.filter((item): item is string => typeof item === "string") : fallback.highlights,
    risks: Array.isArray(normalized.risks)
      ? normalized.risks.map((risk) => ({
          title: typeof risk.title === "string" ? risk.title : "Operational risk",
          description: typeof risk.description === "string" ? risk.description : "Review this signal manually.",
          severity: ["low", "medium", "high"].includes(risk.severity) ? risk.severity : "medium",
        }))
      : fallback.risks,
    restock_recommendations: Array.isArray(normalized.restock_recommendations)
      ? normalized.restock_recommendations.map((item) => ({
          item_name: typeof item.item_name === "string" ? item.item_name : "Unknown item",
          recommended_qty: typeof item.recommended_qty === "number" ? item.recommended_qty : 0,
          unit: typeof item.unit === "string" ? item.unit : "unit",
          reason: typeof item.reason === "string" ? item.reason : "Review stock level.",
        }))
      : fallback.restock_recommendations,
    sales_opportunities: Array.isArray(normalized.sales_opportunities)
      ? normalized.sales_opportunities.map((item) => ({
          title: typeof item.title === "string" ? item.title : "Sales opportunity",
          description: typeof item.description === "string" ? item.description : "Review this opportunity manually.",
          expected_impact: ["low", "medium", "high"].includes(item.expected_impact) ? item.expected_impact : "medium",
        }))
      : fallback.sales_opportunities,
    next_best_actions: Array.isArray(normalized.next_best_actions) ? normalized.next_best_actions.filter((item): item is string => typeof item === "string") : fallback.next_best_actions,
    owner_message: typeof normalized.owner_message === "string" && normalized.owner_message.trim() ? normalized.owner_message : fallback.owner_message,
  };
}

async function generateLlmInsight(input: AgentRunInput) {
  const snapshot = await buildInsightSnapshot(input);
  const fallback = fallbackInsight(snapshot);
  const result = await chatCompletionJson<StructuredInsight>({
    fallback,
    messages: [
      {
        role: "system",
        content: `Kamu adalah AI Insight Agent untuk pemilik coffee shop/F&B kecil. Nilai data operasional harian dan beri insight Bahasa Indonesia yang ringkas, praktis, dan langsung bisa dieksekusi. Output wajib JSON valid dengan field: summary, performance_status (poor|fair|good|excellent), highlights array, risks array {title,description,severity low|medium|high}, restock_recommendations array {item_name,recommended_qty,unit,reason}, sales_opportunities array {title,description,expected_impact low|medium|high}, next_best_actions array, owner_message. Jangan tambah teks di luar JSON.`,
      },
      { role: "user", content: JSON.stringify(snapshot) },
    ],
  });
  return { insight: normalizeInsight(result.data, fallback), provider: result.provider, reason: "reason" in result ? result.reason : undefined, snapshot };
}

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
  const { insight, provider, reason, snapshot } = await generateLlmInsight(input);
  const title = `AI daily insight — ${snapshot.date}`;
  return {
    outputType: "report",
    title,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, insight, snapshot }),
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
  const { insight, provider, reason, snapshot } = await generateLlmInsight(input);
  const riskCount = insight.risks.length;
  return {
    outputType: riskCount > 0 ? "alert" : "report",
    title: riskCount > 0 ? `AI risk detection — ${riskCount} signal(s)` : "AI risk detection — all clear",
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, insight, snapshot }),
    requiresApproval: false,
  };
}

async function runPromoGeneration(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const { insight, provider, reason, snapshot } = await generateLlmInsight(input);
  const primary = insight.sales_opportunities[0];
  const title = primary ? `AI promo idea — ${primary.title}` : "AI promo idea — review sales opportunity";
  return {
    outputType: "promo",
    title,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, insight, snapshot }),
    requiresApproval: true,
  };
}

async function runMorningBriefing(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const { insight, provider, reason, snapshot } = await generateLlmInsight(input);
  return {
    outputType: "briefing",
    title: `AI morning briefing — ${new Date().toISOString().slice(0, 10)}`,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, insight, snapshot }),
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
