const allowedOrigins = new Set([
  "https://coffeelot.app",
  "https://www.coffeelot.app",
  "https://app.coffeelot.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function applyCors(origin: string | null, set: { headers?: Record<string, unknown> }) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://coffeelot.app";
  set.headers = {
    ...(set.headers ?? {}),
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-tenant-id,x-outlet-id,authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
