import type { TenantContext } from "@coffeelot/shared";

type HeaderBag = Headers | Record<string, string | undefined>;

function getHeader(headers: HeaderBag, key: string): string | undefined {
  if (headers instanceof Headers) return headers.get(key) ?? undefined;
  return headers[key] ?? headers[key.toLowerCase()];
}

export function resolveTenantContext(headers: HeaderBag): TenantContext {
  const tenantId = getHeader(headers, "x-tenant-id") ?? process.env.DEMO_TENANT_ID;
  const outletId = getHeader(headers, "x-outlet-id") ?? process.env.DEMO_OUTLET_ID;

  if (!tenantId || !outletId) {
    throw new Error("MISSING_CONTEXT");
  }

  return { tenantId, outletId };
}
