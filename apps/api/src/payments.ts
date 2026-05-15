import type { DokuPaymentMethod, PaymentStatus } from "@coffeelot/shared";

type CreateSandboxPaymentInput = {
  paymentId: string;
  orderId: string;
  amount: number;
  method: DokuPaymentMethod;
};

export type SandboxPaymentPayload = {
  dokuInvoiceId: string;
  paymentUrl: string | null;
  qrCode: string | null;
  vaNumber: string | null;
  rawResponse: string;
};

export function createSandboxPayment(input: CreateSandboxPaymentInput): SandboxPaymentPayload {
  const baseUrl = process.env.DOKU_MCP_URL ?? "https://api-sandbox.doku.com/doku-mcp-server/mcp";
  const dokuInvoiceId = `DOKU-SANDBOX-${input.paymentId}`;
  const paymentUrl = `${baseUrl.replace(/\/sse$/, "")}/pay/${dokuInvoiceId}`;
  const qrCode = input.method === "qris" ? `QRIS:${dokuInvoiceId}:${input.amount}` : null;
  const vaNumber = input.method.startsWith("va_") ? `8808${input.orderId.replace(/\D/g, "").slice(-8).padStart(8, "0")}` : null;

  return {
    dokuInvoiceId,
    paymentUrl,
    qrCode,
    vaNumber,
    rawResponse: JSON.stringify({ provider: "doku-sandbox-placeholder", dokuInvoiceId, method: input.method, amount: input.amount }),
  };
}

export function normalizePaymentStatus(value: string | undefined | null): PaymentStatus {
  const normalized = value?.toLowerCase() ?? "pending";
  if (["paid", "success", "settlement", "capture", "completed"].includes(normalized)) return "paid";
  if (["expired"].includes(normalized)) return "expired";
  if (["failed", "deny", "denied", "cancel", "cancelled", "canceled"].includes(normalized)) return "failed";
  return "pending";
}
