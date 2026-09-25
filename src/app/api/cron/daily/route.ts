import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reintentosPendientes } from "@/lib/fiscal/hacienda-client";
import { notificarVencimientos } from "@/lib/notifications/whatsapp";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "dev-cron-secret";
  if (auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true, slug: true } });
  const results: any[] = [];

  // SaaS: trials vencidos pasan a SUSPENDED (reactivacion al validar SINPE como PAID)
  const trialsVencidos = await prisma.tenant.findMany({
    where: { status: "ACTIVE", subscriptionStatus: "TRIAL", trialEndsAt: { lt: new Date() } },
    select: { id: true, slug: true },
  });
  for (const t of trialsVencidos) {
    await prisma.tenant.update({ where: { id: t.id }, data: { status: "SUSPENDED", subscriptionStatus: "PAST_DUE" } });
  }
  const suspendidos = new Set(trialsVencidos.map(t => t.id));

  for (const t of tenants) {
    if (suspendidos.has(t.id)) {
      results.push({ tenant: t.slug, accion: "TRIAL_VENCIDO_SUSPENDIDO" });
      continue;
    }
    const pendientes = await reintentosPendientes(t.id);
    const notif = await notificarVencimientos(t.id).catch(() => ({ total: 0, enviados: 0 }));
    const morosos30 = await prisma.invoice.count({ where: { tenantId: t.id, status: { in: ["PENDING", "PARTIAL"] }, fechaVencimiento: { lt: new Date(Date.now() - 30 * 86400000) } } });
    const morosos60 = await prisma.invoice.findMany({
      where: { tenantId: t.id, status: { in: ["PENDING"] }, fechaVencimiento: { lt: new Date(Date.now() - 60 * 86400000) } },
      include: { subscriber: true }, take: 10,
    });

    // SaaS: genera suscripción del periodo si no existe
    const periodo = new Date().toISOString().slice(0, 7);
    const count = await prisma.subscriber.count({ where: { tenantId: t.id } });
    const { calculateSubscription } = await import("@/lib/saas/pricing");
    const calc = calculateSubscription(count);
    try {
      await prisma.saaSSubscription.upsert({
        where: { tenantId_periodo: { tenantId: t.id, periodo } as any },
        update: {},
        create: {
          tenantId: t.id, periodo, abonadosCount: count, plan: "BASIC" as any, monto: calc.montoCRC, montoUSD: calc.montoUSD, status: "PENDING",
          fechaVencimiento: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5),
        } as any,
      });
    } catch {}

    // Recordatorios automáticos (solo si tiene teléfono)
    let notifRecordatorios = 0;
    try {
      const { sendReminders } = await import("@/lib/notifications/scheduler");
      const r = await sendReminders(t.id, undefined, 30);
      notifRecordatorios = r.enviados;
    } catch {}

    results.push({ tenant: t.slug, haciendaPendientes: pendientes, whatsappEnviados: (notif as any).enviados, recordatorios: notifRecordatorios, morosos30, morosos60: morosos60.length, saas: { periodo, abonados: count, monto: calc.montoCRC } });
  }

  return NextResponse.json({ success: true, fecha: new Date().toISOString().slice(0, 10), tenants: results.length, trialsSuspendidos: trialsVencidos.length, detalle: results });
}

export async function POST(req: Request) { return GET(req); }
