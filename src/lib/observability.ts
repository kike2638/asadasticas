// src/lib/observability.ts - logs estructurados + métricas
export function log(event: string, meta: Record<string, any> = {}) {
  const entry = { ts: new Date().toISOString(), event, ...meta };
  if (process.env.NODE_ENV === "production") console.log(JSON.stringify(entry));
  else console.log(`[${event}]`, meta);
}

export function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  return fn().finally(() => {
    const ms = Date.now() - t0;
    log("measure", { name, ms });
    if (ms > 1000) log("slow_query", { name, ms });
  });
}

// Sentry stub: si SENTRY_DSN existe, re-exporta
export function captureError(e: any, ctx?: any) {
  console.error("[captureError]", e?.message ?? e, ctx);
  const dsn = process.env.SENTRY_DSN;
  if (dsn) { /* Sentry.captureException(e, { extra: ctx }) */ }
}
