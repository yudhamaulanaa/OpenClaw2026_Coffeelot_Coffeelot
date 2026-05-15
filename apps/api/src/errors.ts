import type { ApiErrorCode, ApiErrorEnvelope } from "@coffeelot/shared";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function toErrorEnvelope(error: unknown): ApiErrorEnvelope {
  if (error instanceof ApiError) {
    return { error: { code: error.code, message: error.message, details: error.details } };
  }

  if (error instanceof Error && error.message === "MISSING_CONTEXT") {
    return { error: { code: "MISSING_CONTEXT", message: "Missing tenant/outlet context" } };
  }

  return { error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
}

export function statusFromError(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  if (error instanceof Error && error.message === "MISSING_CONTEXT") return 400;
  return 500;
}
