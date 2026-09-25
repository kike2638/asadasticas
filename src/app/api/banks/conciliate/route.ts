import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parseBankCSV } from "@/lib/banks/parser";
import { matchTransactions } from "@/lib/banks/matcher";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const role = h.get("x-user-role");
  const userId = h.get("x-user-id");
  if (!tenantId || !userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const previewOnly = form.get("preview") === "true";

  if (!file) return NextResponse.json({ error: "CSV requerido" }, { status: 400 });

  const text = await file.text();
  const parsed = parseBankCSV(text);

  // Facturas pendientes de esta ASADA
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } },
    include: { subscriber: true },
    take: 500,
    orderBy: { fechaVencimiento: "asc" },
  });

  const pendingInvoices = invoices.map(inv => ({
    id: inv.id,
    subscriberId: inv.subscriberId,
    nis: inv.subscriber.nis,
    subscriberName: inv.subscriber.name,
    total: Number(inv.total),
    saldo: Number((inv as any).saldoPendiente ?? inv.total),
    periodo: inv.periodoFacturacion,
    vencimiento: inv.fechaVencimiento.toISOString().slice(0, 10),
  }));

  // Para superadmin: también carga suscripciones pendientes
  let pendingSubs: any[] | undefined;
  if (role === "PLATFORM_OWNER") {
    const subs = await prisma.saaSSubscription.findMany({ where: { status: "PENDING" }, include: { tenant: true }, take: 100 });
    pendingSubs = subs.map(s => ({ id: s.id, tenantSlug: s.tenant.slug, tenantName: s.tenant.name, periodo: s.periodo, monto: Number(s.monto) }));
  }

  const matches = matchTransactions(parsed.transactions, pendingInvoices, pendingSubs);

  if (previewOnly) {
    return NextResponse.json({
      banco: parsed.banco,
      headers: parsed.headers,
      warnings: parsed.warnings,
      count: parsed.count,
      pendingInvoices: pendingInvoices.length,
      matches: matches.slice(0, 100),
      summary: {
        auto: matches.filter(m => m.suggestedAction === "AUTO_MATCH").length,
        review: matches.filter(m => m.suggestedAction === "REVIEW").length,
        ignore: matches.filter(m => m.suggestedAction === "IGNORE").length,
        ingresos: parsed.transactions.filter(t => t.monto > 0).length,
        totalIngresos: parsed.transactions.filter(t => t.monto > 0).reduce((a, t) => a + t.monto, 0),
      },
    });
  }

  // Ejecución real: crear pagos para los AUTO_MATCH (con referencia del banco)
  const body = await request.formData(); // ya leída, pero usamos matches previos
  // El cliente debe llamar a /api/banks/execute con índices confirmados
  return NextResponse.json({ preview: true, banco: parsed.banco, matches, warnings: parsed.warnings });
}
