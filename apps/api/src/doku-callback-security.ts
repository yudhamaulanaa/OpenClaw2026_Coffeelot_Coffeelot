import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

function base64Sha256(value: string) {
  return createHash("sha256").update(value).digest("base64");
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateDokuCallbackSignature(input: { request: Request; rawBody: string }) {
  const signatureRequired = process.env.DOKU_CALLBACK_SIGNATURE_REQUIRED !== "false";
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!secretKey) {
    if (signatureRequired) throw new ApiError("DOKU_SIGNATURE_NOT_CONFIGURED", "DOKU_SECRET_KEY is required to validate callback signature", 500);
    return { verified: false, reason: "secret_not_configured" };
  }

  const headers = input.request.headers;
  const clientId = headers.get("client-id");
  const requestId = headers.get("request-id");
  const requestTimestamp = headers.get("request-timestamp");
  const signature = headers.get("signature");
  const configuredClientId = process.env.DOKU_CLIENT_ID;

  if (!clientId || !requestId || !requestTimestamp || !signature) {
    if (signatureRequired) throw new ApiError("INVALID_DOKU_SIGNATURE", "Missing DOKU signature headers", 401);
    return { verified: false, reason: "missing_headers" };
  }

  if (configuredClientId && clientId !== configuredClientId) {
    throw new ApiError("INVALID_DOKU_SIGNATURE", "DOKU Client-Id mismatch", 401);
  }

  const toleranceMs = Number(process.env.DOKU_CALLBACK_SIGNATURE_TOLERANCE_MS ?? 15 * 60 * 1000);
  const timestampMs = Date.parse(requestTimestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > toleranceMs) {
    throw new ApiError("INVALID_DOKU_SIGNATURE", "DOKU callback timestamp is outside tolerance", 401);
  }

  const requestTarget = new URL(input.request.url).pathname;
  const digest = base64Sha256(input.rawBody);
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${requestTimestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join("\n");
  const expectedSignature = `HMACSHA256=${createHmac("sha256", secretKey).update(component).digest("base64")}`;

  if (!safeEquals(signature, expectedSignature)) {
    throw new ApiError("INVALID_DOKU_SIGNATURE", "Invalid DOKU callback signature", 401);
  }

  return { verified: true, requestId, requestTarget, digest };
}

export function parseJsonObject(rawBody: string) {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected JSON object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiError("INVALID_CALLBACK", "Invalid JSON callback payload", 400);
  }
}
