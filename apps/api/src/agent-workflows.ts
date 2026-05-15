import { chatCompletionJson } from "./ai-client";
import { getSeatAvailabilitySnapshot } from "./booking-seat-service";
import { prisma } from "./db";

export const AGENT_WORKFLOWS = ["daily_report", "restock_alert", "risk_detection", "promo_generation", "morning_briefing", "booking_seat_insight"] as const;
export type AgentWorkflowId = (typeof AGENT_WORKFLOWS)[number];
export type AgentTriggerType = "scheduled" | "event" | "on_demand";

type AgentWorkflowOutput = {
  outputType: "report" | "alert" | "recommendation" | "promo" | "briefing" | "booking_insight";
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

type InsightWorkflowFocus = "daily_report" | "risk_detection" | "promo_generation" | "morning_briefing";

function workflowInsightPrompt(focus: InsightWorkflowFocus) {
  const base = "Output wajib JSON valid dengan field: summary, performance_status (poor|fair|good|excellent), highlights array, risks array {title,description,severity low|medium|high}, restock_recommendations array {item_name,recommended_qty,unit,reason}, sales_opportunities array {title,description,expected_impact low|medium|high}, next_best_actions array, owner_message. Jangan tambah teks di luar JSON.";
  const prompts: Record<InsightWorkflowFocus, string> = {
    daily_report: `Kamu adalah Daily Business Analyst untuk pemilik coffee shop/F&B kecil. Fokus HANYA pada ringkasan performa hari ini vs kemarin: revenue, order count, average order value, best seller, dan 2-3 keputusan operasional paling penting. Jangan membuat copy promo panjang. Jangan melebih-lebihkan risiko kecuali datanya jelas. Buat owner_message seperti laporan harian singkat. ${base}`,
    risk_detection: `Kamu adalah Operational Risk Auditor untuk coffee shop/F&B kecil. Fokus HANYA pada risiko yang bisa mengganggu operasi: stock kritis, revenue drop, order kosong, AOV rendah, dependency produk, dan sinyal yang butuh tindakan cepat. Summary harus berupa tingkat risiko, bukan laporan penjualan umum. Highlights boleh minim; risks wajib tajam dan diberi severity. Next actions harus berupa mitigasi. Jangan membuat ide promo kecuali untuk mitigasi risiko sepi. ${base}`,
    promo_generation: `Kamu adalah Promo Strategist untuk coffee shop/F&B kecil. Fokus HANYA pada peluang penjualan dan campaign yang bisa dipublish setelah approval owner. Buat sales_opportunities konkret: menu target, angle promo, contoh copy singkat, timing, dan expected impact. Risks hanya risiko promo seperti margin, stok, atau cannibalization. Restock hanya muncul jika promo butuh stok. Owner_message harus mengingatkan bahwa promo perlu approval. ${base}`,
    morning_briefing: `Kamu adalah Opening Shift Briefing Assistant untuk coffee shop/F&B kecil. Fokus HANYA pada briefing sebelum operasional: apa yang harus dicek saat buka, stock/prep priority, menu yang perlu didorong, payment/kitchen readiness, dan potensi rush hour. Summary harus seperti briefing pagi untuk owner/shift lead. Jangan menulis laporan akhir hari atau copy promo panjang. ${base}`,
  };
  return prompts[focus];
}

function workflowFallbackTone(insight: StructuredInsight, focus: InsightWorkflowFocus): StructuredInsight {
  if (focus === "risk_detection") {
    return {
      ...insight,
      summary: insight.risks.length ? `Terdeteksi ${insight.risks.length} risiko operasional yang perlu dicek.` : "Tidak ada risiko besar dari snapshot sales/stok saat ini.",
      highlights: insight.highlights.slice(0, 1),
      sales_opportunities: [],
      owner_message: insight.risks.length ? "Prioritasnya mitigasi risiko sebelum mengembangkan promo atau eksperimen penjualan." : "Operasional terlihat aman; lanjut monitor stok, order, dan pembayaran pending.",
    };
  }
  if (focus === "promo_generation") {
    return {
      ...insight,
      summary: "Rekomendasi promo dibuat dari menu aktif, best seller, dan peluang mendorong menu yang belum dominan.",
      risks: insight.risks.filter((risk) => risk.title.toLowerCase().includes("stok") || risk.title.toLowerCase().includes("stock")),
      next_best_actions: insight.sales_opportunities.length ? ["Review margin dan stok sebelum approve promo.", "Pilih 1 copy promo untuk diuji di jam sepi.", "Pantau efek promo terhadap order dan AOV."] : insight.next_best_actions,
      owner_message: "Promo ini masih perlu approval owner sebelum dipakai ke customer.",
    };
  }
  if (focus === "morning_briefing") {
    return {
      ...insight,
      summary: "Briefing pembukaan: cek kesiapan stok, kitchen/barista, pembayaran, dan menu yang perlu didorong hari ini.",
      next_best_actions: ["Cek stok kritis dan prep bahan sebelum rush hour.", "Pastikan QRIS/VA dan kitchen queue siap.", "Brief kasir untuk mendorong menu peluang hari ini."],
      owner_message: "Sebelum buka, pastikan stok aman, antrean operasional siap, dan tim tahu menu prioritas hari ini.",
    };
  }
  return insight;
}

async function generateLlmInsight(input: AgentRunInput, focus: InsightWorkflowFocus) {
  const snapshot = await buildInsightSnapshot(input);
  const fallback = workflowFallbackTone(fallbackInsight(snapshot), focus);
  const result = await chatCompletionJson<StructuredInsight>({
    fallback,
    messages: [
      {
        role: "system",
        content: workflowInsightPrompt(focus),
      },
      { role: "user", content: JSON.stringify(snapshot) },
    ],
  });
  return { insight: normalizeInsight(result.data, fallback), provider: result.provider, reason: "reason" in result ? result.reason : undefined, snapshot, workflowFocus: focus };
}

type BookingSeatInsight = {
  summary: string;
  availability_status: "safe" | "watch" | "tight" | "full";
  current_available_seats: number;
  peak_reserved_seats_next_2h: number;
  risks: Array<{ title: string; description: string; severity: "low" | "medium" | "high" }>;
  arrival_watchlist: Array<{ customer_name: string; party_size: number; booking_start: string; action: string }>;
  seat_actions: string[];
  owner_message: string;
};

function bookingInsightToContent(insight: BookingSeatInsight, provider: string) {
  return [
    `Booking Insight: ${insight.summary}`,
    `Availability: ${insight.availability_status}`,
    `Current available seats: ${insight.current_available_seats}`,
    `Peak reserved seats next 2h: ${insight.peak_reserved_seats_next_2h}`,
    insight.risks.length ? `Risks:\n${insight.risks.map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.description}`).join("\n")}` : "Risks: no major seating risk detected",
    insight.arrival_watchlist.length ? `Arrival watchlist:\n${insight.arrival_watchlist.map((item) => `- ${item.customer_name} (${item.party_size} pax) at ${item.booking_start}: ${item.action}`).join("\n")}` : "Arrival watchlist: none",
    insight.seat_actions.length ? `Seat actions:\n${insight.seat_actions.map((item) => `- ${item}`).join("\n")}` : "Seat actions: keep normal floor monitoring",
    `Owner message: ${insight.owner_message}`,
    provider === "llm" ? "Source: LLM booking insight" : "Source: rule-based fallback",
  ].join("\n\n");
}

function fallbackBookingInsight(snapshot: Awaited<ReturnType<typeof getSeatAvailabilitySnapshot>>): BookingSeatInsight {
  const peak = snapshot.nextTwoHours.reduce((max, point) => Math.max(max, point.reservedSeats), snapshot.current.reservedSeats);
  const minAvailable = snapshot.nextTwoHours.reduce((min, point) => Math.min(min, point.availableSeats), snapshot.current.availableSeats);
  const occupancy = snapshot.totalSeats <= 0 ? 0 : peak / snapshot.totalSeats;
  const availability_status: BookingSeatInsight["availability_status"] = minAvailable <= 0 ? "full" : occupancy >= 0.85 ? "tight" : occupancy >= 0.6 ? "watch" : "safe";
  const risks: BookingSeatInsight["risks"] = [];
  if (availability_status === "full") risks.push({ title: "Seat penuh", description: "Ada slot dalam 2 jam ke depan dengan kursi tersedia 0.", severity: "high" });
  if (availability_status === "tight") risks.push({ title: "Seat hampir penuh", description: `Peak reserved ${peak}/${snapshot.totalSeats} seat.`, severity: "medium" });
  const now = Date.parse(snapshot.checkedAt);
  const arrivalWatchlist = snapshot.upcomingBookings
    .filter((booking) => Date.parse(booking.bookingStart) - now <= 30 * 60_000)
    .slice(0, 5)
    .map((booking) => ({ customer_name: booking.customerName, party_size: booking.partySize, booking_start: booking.bookingStart, action: "Siapkan/meja kursi dan tahan seat sampai tamu tiba." }));
  return {
    summary: `Saat ini tersedia ${snapshot.current.availableSeats}/${snapshot.totalSeats} seat. Peak reserved 2 jam ke depan ${peak} seat.`,
    availability_status,
    current_available_seats: snapshot.current.availableSeats,
    peak_reserved_seats_next_2h: peak,
    risks,
    arrival_watchlist: arrivalWatchlist,
    seat_actions: [
      arrivalWatchlist.length ? "Prioritaskan seat untuk booking yang datang <30 menit." : "Pantau booking berikutnya dan jangan release seat terlalu cepat.",
      availability_status === "safe" ? "Masih aman menerima walk-in sesuai kapasitas." : "Batasi walk-in besar sampai booking window lewat.",
      "Update status booking menjadi arrived/completed/no_show agar availability akurat.",
    ],
    owner_message: "Coffeelot menjaga availability seat berdasarkan booking aktif dan jam kedatangan agar seat tidak double-booked.",
  };
}

function normalizeBookingInsight(value: Partial<BookingSeatInsight> | null | undefined, fallback: BookingSeatInsight): BookingSeatInsight {
  const normalized = value && typeof value === "object" ? value : {};
  const allowedStatus = ["safe", "watch", "tight", "full"];
  return {
    summary: typeof normalized.summary === "string" ? normalized.summary : fallback.summary,
    availability_status: allowedStatus.includes(normalized.availability_status ?? "") ? normalized.availability_status! : fallback.availability_status,
    current_available_seats: typeof normalized.current_available_seats === "number" ? normalized.current_available_seats : fallback.current_available_seats,
    peak_reserved_seats_next_2h: typeof normalized.peak_reserved_seats_next_2h === "number" ? normalized.peak_reserved_seats_next_2h : fallback.peak_reserved_seats_next_2h,
    risks: Array.isArray(normalized.risks) ? normalized.risks.map((risk) => ({ title: risk.title ?? "Seat risk", description: risk.description ?? "Review booking availability.", severity: ["low", "medium", "high"].includes(risk.severity) ? risk.severity : "medium" })) : fallback.risks,
    arrival_watchlist: Array.isArray(normalized.arrival_watchlist) ? normalized.arrival_watchlist.map((item) => ({ customer_name: item.customer_name ?? "Customer", party_size: item.party_size ?? 0, booking_start: item.booking_start ?? "", action: item.action ?? "Prepare seats." })) : fallback.arrival_watchlist,
    seat_actions: Array.isArray(normalized.seat_actions) ? normalized.seat_actions.filter((item): item is string => typeof item === "string") : fallback.seat_actions,
    owner_message: typeof normalized.owner_message === "string" ? normalized.owner_message : fallback.owner_message,
  };
}

async function generateBookingSeatInsight(input: AgentRunInput) {
  const snapshot = await getSeatAvailabilitySnapshot({ tenantId: input.tenantId, outletId: input.outletId });
  const fallback = fallbackBookingInsight(snapshot);
  const result = await chatCompletionJson<BookingSeatInsight>({
    fallback,
    messages: [
      {
        role: "system",
        content: `Kamu adalah AI Reservation/Booking Insight Agent untuk coffee shop kecil. Tugasmu menilai okupansi seat dari booking aktif, menghitung sisa seat, menjaga seat availability saat jam booking tamu datang, dan memberi instruksi floor operation. Output wajib JSON valid dengan field: summary, availability_status (safe|watch|tight|full), current_available_seats number, peak_reserved_seats_next_2h number, risks array {title,description,severity low|medium|high}, arrival_watchlist array {customer_name,party_size,booking_start,action}, seat_actions array, owner_message. Jangan tambah teks di luar JSON.`,
      },
      { role: "user", content: JSON.stringify(snapshot) },
    ],
  });
  return { insight: normalizeBookingInsight(result.data, fallback), provider: result.provider, reason: "reason" in result ? result.reason : undefined, snapshot };
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
  const { insight, provider, reason, snapshot, workflowFocus } = await generateLlmInsight(input, "daily_report");
  const title = `AI daily insight — ${snapshot.date}`;
  return {
    outputType: "report",
    title,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, workflowFocus, insight, snapshot }),
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
  const { insight, provider, reason, snapshot, workflowFocus } = await generateLlmInsight(input, "risk_detection");
  const riskCount = insight.risks.length;
  return {
    outputType: riskCount > 0 ? "alert" : "report",
    title: riskCount > 0 ? `AI risk detection — ${riskCount} signal(s)` : "AI risk detection — all clear",
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, workflowFocus, insight, snapshot }),
    requiresApproval: false,
  };
}

async function runPromoGeneration(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const { insight, provider, reason, snapshot, workflowFocus } = await generateLlmInsight(input, "promo_generation");
  const primary = insight.sales_opportunities[0];
  const title = primary ? `AI promo idea — ${primary.title}` : "AI promo idea — review sales opportunity";
  return {
    outputType: "promo",
    title,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, workflowFocus, insight, snapshot }),
    requiresApproval: true,
  };
}

async function runMorningBriefing(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const { insight, provider, reason, snapshot, workflowFocus } = await generateLlmInsight(input, "morning_briefing");
  return {
    outputType: "briefing",
    title: `AI morning briefing — ${new Date().toISOString().slice(0, 10)}`,
    content: insightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, workflowFocus, insight, snapshot }),
    requiresApproval: false,
  };
}

async function runBookingSeatInsight(input: AgentRunInput): Promise<AgentWorkflowOutput> {
  const { insight, provider, reason, snapshot } = await generateBookingSeatInsight(input);
  return {
    outputType: "booking_insight",
    title: `Booking seat insight — ${new Date().toISOString().slice(0, 10)}`,
    content: bookingInsightToContent(insight, provider),
    metadata: JSON.stringify({ provider, reason, bookingInsight: insight, bookingSnapshot: snapshot }),
    requiresApproval: false,
  };
}

async function executeWorkflow(input: AgentRunInput) {
  if (input.workflowId === "daily_report") return runDailyReport(input);
  if (input.workflowId === "restock_alert") return runRestockAlert(input);
  if (input.workflowId === "risk_detection") return runRiskDetection(input);
  if (input.workflowId === "promo_generation") return runPromoGeneration(input);
  if (input.workflowId === "morning_briefing") return runMorningBriefing(input);
  if (input.workflowId === "booking_seat_insight") return runBookingSeatInsight(input);
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
