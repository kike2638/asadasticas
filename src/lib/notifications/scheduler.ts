// src/lib/notifications/scheduler.ts - Cola recordatorios ASADA
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, templateVencimiento, templateMorosidad, templatePagoRecibido } from "./whatsapp";
import { formatCRC } from "@/lib/saas/pricing";

export type ReminderTipo = "RECORDATORIO_5" | "VENCIMIENTO_HOY" | "MOROSO_7" | "MOROSO_15" | "MOROSO_30" | "CORTE_AVISO";

export interface ReminderItem {
  invoiceId: string;
  subscriberId: string;
  subscriberName: string;
  telefono: string;
  nis: string;
  periodo: string;
  total: number;
  vencimiento: Date;
  dias: number; // + = por vencer, - = vencida
  tipo: ReminderTipo;
  mensaje: string;
}

function daysDiff(a: Date, b: Date): number {
  return Math.ceil((a.getTime() - b.getTime()) / 86400000);
}

export async function buildReminderQueue(tenantId: string): Promise<ReminderItem[]> {
  const facturas = await prisma.invoice.findMany({
    where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } },
    include: { subscriber: true },
    take: 500,
  });

  const cfg: any = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const asadaNombre = cfg?.whatsappNombre ?? tenant?.name ?? "tu ASADA";
  const sinpe = cfg?.sinpeNumero ? `${cfg.sinpeNumero}${cfg.sinpeNombre ? ` (${cfg.sinpeNombre})` : ""}` : undefined;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const queue: ReminderItem[] = [];

  for (const inv of facturas) {
    const sub = inv.subscriber;
    if (!sub.telefono) continue;
    const venc = new Date(inv.fechaVencimiento); venc.setHours(0, 0, 0, 0);
    const dias = daysDiff(venc, hoy); // +5 = vence en 5 días, -7 = 7 días vencida

    let tipo: ReminderTipo | null = null;
    if (dias === 5 || dias === 3) tipo = "RECORDATORIO_5";
    else if (dias === 0) tipo = "VENCIMIENTO_HOY";
    else if (dias === -7) tipo = "MOROSO_7";
    else if (dias === -15) tipo = "MOROSO_15";
    else if (dias === -30) tipo = "MOROSO_30";
    else if (dias === -45) tipo = "CORTE_AVISO";

    if (!tipo) continue;

    // Evita duplicado: ya enviado mismo tipo para esta factura hoy
    const yaEnviado = await prisma.notificationLog.findFirst({
      where: { tenantId, invoiceId: inv.id, tipo, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    if (yaEnviado) continue;

    const totalStr = formatCRC(Number(inv.total));
    let mensaje = "";
    if (tipo === "RECORDATORIO_5" || tipo === "VENCIMIENTO_HOY") {
      mensaje = templateVencimiento(sub.name, inv.periodoFacturacion, totalStr, venc.toLocaleDateString("es-CR"), sub.nis, asadaNombre, cfg?.sinpeNumero ?? sinpe);
    } else if (tipo.startsWith("MOROSO")) {
      const diasMora = Math.abs(dias);
      mensaje = templateMorosidad(sub.name, totalStr, diasMora, asadaNombre, cfg?.sinpeNumero);
      if (tipo === "CORTE_AVISO") mensaje += `\n\n🚰 Aviso de corte programado. Regularice en 48h.`;
    }

    queue.push({
      invoiceId: inv.id,
      subscriberId: sub.id,
      subscriberName: sub.name,
      telefono: sub.telefono,
      nis: sub.nis,
      periodo: inv.periodoFacturacion,
      total: Number(inv.total),
      vencimiento: venc,
      dias,
      tipo,
      mensaje,
    });
  }

  return queue.sort((a, b) => a.dias - b.dias);
}

export async function sendReminders(tenantId: string, tipos?: ReminderTipo[], limit = 50): Promise<{ enviados: number; fallidos: number; detalles: any[] }> {
  const queue = await buildReminderQueue(tenantId);
  const filtrada = tipos ? queue.filter(q => tipos.includes(q.tipo)) : queue;
  const batch = filtrada.slice(0, limit);

  let enviados = 0, fallidos = 0;
  const detalles: any[] = [];

  for (const item of batch) {
    try {
      const res = await sendWhatsApp(item.telefono, item.mensaje, tenantId);
      await prisma.notificationLog.create({
        data: {
          tenantId, subscriberId: item.subscriberId, invoiceId: item.invoiceId,
          tipo: item.tipo, canal: "WHATSAPP", destino: item.telefono, mensaje: item.mensaje,
          status: res.success ? (res.modo === "simulado" ? "SIMULADO" : "SENT") : "FAILED",
        },
      });
      if (res.success) enviados++; else fallidos++;
      detalles.push({ nis: item.nis, tipo: item.tipo, status: res.success ? "SENT" : "FAILED", modo: res.modo });
    } catch (e: any) {
      fallidos++;
      detalles.push({ nis: item.nis, tipo: item.tipo, status: "FAILED", error: e.message });
    }
  }

  return { enviados, fallidos, detalles };
}
