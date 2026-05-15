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
  const baseUrl = process.env.DOKU_MCP_URL ?? "https://mcp-sandbox.doku.com/sse";
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

export function normalizePaymentStatus(value: string): PaymentStatus {
  if (["paid", "success", "settlement", "capture"].includes(value)) return "paid";
  if (["expired"].includes(value)) return "expired";
  if (["failed", "deny", "cancel"].includes(value)) return "failed";
  return "pending";
}
