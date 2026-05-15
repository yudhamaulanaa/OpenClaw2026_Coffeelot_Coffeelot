import type { DokuPaymentMethod } from "@coffeelot/shared";

export type DokuMcpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type DokuMcpPaymentInput = {
  paymentId: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  method: DokuPaymentMethod;
  customerName?: string | null;
  callbackUrl?: string;
  returnUrl?: string;
};

export type DokuMcpPaymentPayload = {
  dokuInvoiceId: string;
  paymentUrl: string | null;
  qrCode: string | null;
  vaNumber: string | null;
  rawResponse: string;
  provider: "doku-mcp";
  toolName: string;
};

type JsonRpcResponse<T = unknown> = {
  jsonrpc?: string;
  id?: number | string;
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
};

let protocolVersion: string | null = null;
let cachedTools: DokuMcpTool[] | null = null;

function dokuMcpUrl() {
  return process.env.DOKU_MCP_URL ?? "https://api-sandbox.doku.com/doku-mcp-server/mcp";
}

function dokuMcpHeaders() {
  const clientId = process.env.DOKU_CLIENT_ID;
  const apiKey = process.env.DOKU_API_KEY;
  const explicitAuthorization = process.env.DOKU_AUTHORIZATION;

  if (!clientId) throw new Error("DOKU_CLIENT_ID is not configured");
  if (!apiKey && !explicitAuthorization) throw new Error("DOKU_API_KEY or DOKU_AUTHORIZATION is not configured");

  const authorization = explicitAuthorization ?? `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
  const headers: Record<string, string> = {
    "Client-Id": clientId,
    Authorization: authorization,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (protocolVersion) headers["mcp-protocol-version"] = protocolVersion;
  return headers;
}

function parseMcpResponse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  const lastJsonLine = dataLines.reverse().find((line) => line.startsWith("{"));
  if (lastJsonLine) return JSON.parse(lastJsonLine);

  throw new Error(`Unsupported MCP response format: ${trimmed.slice(0, 120)}`);
}

async function callMcpRpc<T = unknown>(method: string, params: Record<string, unknown> = {}, id = 1): Promise<T> {
  const response = await fetch(dokuMcpUrl(), {
    method: "POST",
    headers: dokuMcpHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`DOKU MCP ${method} failed (${response.status}): ${text.slice(0, 500)}`);

  const rpc = parseMcpResponse(text) as JsonRpcResponse<T>;
  if (rpc.error) throw new Error(`DOKU MCP ${method} error: ${rpc.error.message ?? JSON.stringify(rpc.error)}`);
  return rpc.result as T;
}

export async function callDokuMcpTool(name: string, toolRequest: Record<string, unknown>) {
  if (!protocolVersion) await initializeDokuMcp();
  return callMcpRpc(
    "tools/call",
    {
      name,
      arguments: { toolRequest },
    },
    Date.now(),
  );
}

export async function initializeDokuMcp() {
  const result = await callMcpRpc<{ protocolVersion?: string; serverInfo?: unknown }>("initialize", {}, 0);
  protocolVersion = result.protocolVersion ?? protocolVersion;
  return result;
}

export async function listDokuMcpTools({ refresh = false } = {}) {
  if (cachedTools && !refresh) return cachedTools;
  if (!protocolVersion) await initializeDokuMcp();

  const result = await callMcpRpc<{ tools?: DokuMcpTool[] }>("tools/list", {}, 1);
  cachedTools = result.tools ?? [];
  return cachedTools;
}

function dokuVaChannel(method: DokuPaymentMethod) {
  const channels: Partial<Record<DokuPaymentMethod, string>> = {
    va_bca: "VIRTUAL_ACCOUNT_BCA",
    va_bni: "VIRTUAL_ACCOUNT_BNI",
  };
  return channels[method];
}

function buildToolRequest(input: DokuMcpPaymentInput, toolName: string) {
  const amount = Math.round(input.amount);
  const customerName = input.customerName ?? "Coffeelot Customer";

  if (toolName === "create_qris_payment") {
    return {
      amount: amount.toFixed(2),
      partnerReferenceNo: input.invoiceNumber,
    };
  }

  if (toolName === "create_virtual_account_payment") {
    const channel = dokuVaChannel(input.method);
    if (!channel) throw new Error(`DOKU MCP virtual account channel is not mapped for ${input.method}`);
    return {
      amount: amount.toFixed(2),
      channel,
      trxId: input.invoiceNumber,
      virtualAccountName: customerName,
    };
  }

  return {
    amount: String(amount),
    currency: "IDR",
    invoiceNumber: input.invoiceNumber,
    customerName,
  };
}

function pickTool(tools: DokuMcpTool[], method: DokuPaymentMethod) {
  const exactName = method === "qris" ? "create_qris_payment" : method.startsWith("va_") ? "create_virtual_account_payment" : "create_doku_direct_checkout";
  const exact = tools.find((tool) => tool.name === exactName);
  if (exact) return exact;

  return tools.find((tool) => tool.name === "create_doku_direct_checkout") ?? null;
}

function deepFindString(value: unknown, matcher: (value: string, key?: string) => boolean, key?: string): string | null {
  if (typeof value === "string") return matcher(value, key) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindString(item, matcher, key);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const [childKey, item] of Object.entries(value as Record<string, unknown>)) {
      const found = deepFindString(item, matcher, childKey);
      if (found) return found;
    }
  }
  return null;
}

function findStringByKey(value: unknown, keys: string[]): string | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  return deepFindString(value, (text, key) => Boolean(key && wanted.has(key.toLowerCase()) && text.trim()));
}

function unwrapToolResult(result: unknown): unknown {
  const content = (result as { content?: unknown })?.content;
  if (Array.isArray(content)) {
    const textPart = content.find((item) => typeof item === "object" && item && "text" in item) as { text?: string } | undefined;
    if (textPart?.text) {
      try {
        return JSON.parse(textPart.text);
      } catch {
        return textPart.text;
      }
    }
  }
  return result;
}

export async function createDokuMcpPayment(input: DokuMcpPaymentInput): Promise<DokuMcpPaymentPayload> {
  const tools = await listDokuMcpTools();
  const selected = pickTool(tools, input.method);
  if (!selected) throw new Error("No suitable DOKU MCP payment tool found");

  const result = await callMcpRpc(
    "tools/call",
    {
      name: selected.name,
      arguments: {
        toolRequest: buildToolRequest(input, selected.name),
      },
    },
    2,
  );

  const unwrapped = unwrapToolResult(result);
  const toolError = (result as { isError?: boolean })?.isError || (typeof unwrapped === "object" && unwrapped && "error" in unwrapped);
  if (toolError) throw new Error(`DOKU MCP ${selected.name} failed: ${JSON.stringify(unwrapped).slice(0, 500)}`);

  const rawResponse = JSON.stringify({ tool: selected.name, result: unwrapped });
  const paymentUrl =
    findStringByKey(unwrapped, ["paymentUrl", "payment_url", "checkoutUrl", "checkout_url", "redirectUrl", "redirect_url", "qrImageUrl", "howToPayPage"]) ??
    deepFindString(unwrapped, (value) => /^https?:\/\//.test(value) && /doku|payment|checkout|pay/i.test(value));
  const qrCode = findStringByKey(unwrapped, ["qrContent", "qrCode", "qr_code"]);
  const vaNumber = findStringByKey(unwrapped, ["virtualAccountNo", "virtual_account_no", "vaNumber", "va_number"])
    ?.replace(/\s/g, "") ?? null;
  const dokuInvoiceId = findStringByKey(unwrapped, ["invoiceNumber", "invoice_number", "referenceNo", "reference_no", "trxId", "partnerReferenceNo"]) ??
    `DOKU-MCP-${input.paymentId}`;

  return {
    provider: "doku-mcp",
    toolName: selected.name,
    dokuInvoiceId,
    paymentUrl,
    qrCode,
    vaNumber,
    rawResponse,
  };
}
