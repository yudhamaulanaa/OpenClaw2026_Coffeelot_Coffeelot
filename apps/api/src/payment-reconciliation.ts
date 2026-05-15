import { normalizePaymentStatus } from "./payments";

export type ReconciledProviderStatus = {
  invoiceNumber: string;
  status: ReturnType<typeof normalizePaymentStatus>;
  providerStatus: string | null;
  rawResponse: unknown;
};

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function firstStringByKey(value: unknown, keys: string[]): string | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const visit = (node: unknown, key?: string): string | null => {
    if (typeof node === "string") return key && wanted.has(key.toLowerCase()) ? node : null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item, key);
        if (found) return found;
      }
    }
    if (node && typeof node === "object") {
      for (const [childKey, child] of Object.entries(node as Record<string, unknown>)) {
        const found = visit(child, childKey);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(value);
}

export function extractDokuCheckoutInvoice(rawResponse: string | null | undefined) {
  if (!rawResponse) return null;
  const raw = safeJsonParse(rawResponse);
  return firstStringByKey(raw, ["invoiceNumber", "invoice_number", "partnerReferenceNo", "trxId"]);
}

function unwrapMcpToolResult(result: unknown) {
  const content = (result as { content?: unknown })?.content;
  if (Array.isArray(content)) {
    const textPart = content.find((item) => typeof item === "object" && item && "text" in item) as { text?: string } | undefined;
    if (textPart?.text) return safeJsonParse(textPart.text);
  }
  return result;
}

function providerStatusFromTransaction(raw: unknown): string | null {
  const summaryStatus = firstStringByKey(raw, ["status"]);
  return summaryStatus;
}

export function normalizeDokuProviderStatus(providerStatus: string | null | undefined) {
  const normalized = providerStatus?.toLowerCase();
  if (["success", "paid", "settlement", "capture", "completed", "00"].includes(normalized ?? "")) return "paid";
  if (["expired"].includes(normalized ?? "")) return "expired";
  if (["failed", "deny", "denied", "cancel", "cancelled", "canceled", "06"].includes(normalized ?? "")) return "failed";
  return normalizePaymentStatus(providerStatus);
}

export async function getDokuTransactionStatus(invoiceNumber: string): Promise<ReconciledProviderStatus> {
  const { callDokuMcpTool } = await import("./doku-mcp");
  const result = await callDokuMcpTool("get_transaction_by_invoice_number", { invoiceNumber });
  const rawResponse = unwrapMcpToolResult(result);
  const providerStatus = providerStatusFromTransaction(rawResponse);
  return {
    invoiceNumber,
    status: normalizeDokuProviderStatus(providerStatus),
    providerStatus,
    rawResponse,
  };
}
