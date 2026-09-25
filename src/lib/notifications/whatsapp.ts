// src/lib/notifications/whatsapp.ts - WhatsApp Cloud API (Meta) - REMITENTE = ASADA
// Si la ASADA tiene whatsappToken/phoneId configurado, sale desde su número.
// Sino fallback a WHATSAPP_TOKEN global (plataforma) o simulado.

const WHATSAPP_API = "https://graph.facebook.com/v18.0";

interface SendResult { success: boolean; id?: string; error?: string; modo: "whatsapp" | "sms" | "simulado"; remitente?: string }

export async function sendWhatsApp(to: string, message: string, tenantId?: string): Promise<SendResult> {
  let token: string | undefined;
  let phoneId: string | undefined;
  let remitente: string | undefined;

  if (tenantId) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const cfg: any = await prisma.tenantConfig.findUnique({ where: { tenantId }, select: { whatsappToken: true, whatsappPhoneId: true, whatsappNumero: true, whatsappNombre: true } });
      if (cfg?.whatsappToken && cfg?.whatsappPhoneId) {
        // Token puede estar encriptado
        try { const { decrypt } = await import("@/lib/crypto"); token = decrypt(cfg.whatsappToken); } catch { token = cfg.whatsappToken; }
        phoneId = cfg.whatsappPhoneId;
        remitente = cfg.whatsappNumero ?? cfg.whatsappNombre;
      }
    } catch {}
  }

  if (!token || !phoneId) {
    token = process.env.WHATSAPP_TOKEN;
    phoneId = process.env.WHATSAPP_PHONE_ID;
    remitente = remitente ?? process.env.WHATSAPP_NUMERO ?? "plataforma";
  }

  // Modo simulado si no hay credenciales (dev)
  if (!token || !phoneId) {
    console.log(`[WhatsApp SIMULADO ${remitente ?? "ASADA"}] Para ${to}: ${message.slice(0, 80)}...`);
    return { success: true, id: `sim_${Date.now()}`, modo: "simulado", remitente };
  }

  const normalized = to.replace(/\D/g, "");
  const formatted = normalized.startsWith("506") ? normalized : `506${normalized.slice(-8)}`;

  try {
    const res = await fetch(`${WHATSAPP_API}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatted,
        type: "text",
        text: { body: message },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "WhatsApp error");
    return { success: true, id: data.messages?.[0]?.id, modo: "whatsapp", remitente };
  } catch (e: any) {
    return { success: false, error: e.message, modo: "whatsapp", remitente };
  }
}

export function templateVencimiento(nombre: string, periodo: string, total: string, vencimiento: string, nis: string, asadaNombre?: string, sinpe?: string): string {
  const asada = asadaNombre ?? "tu ASADA";
  const sinpeLine = sinpe ? `Paga por SINPE Móvil al ${sinpe} con Ref: ${nis}` : `Paga por SINPE Móvil con Ref: ${nis}`;
  return `Hola ${nombre} 👋\n${asada} te recuerda:\n\n💧 Periodo ${periodo} • NIS ${nis}\n💰 Total: ${total}\n📅 Vence: ${vencimiento}\n\n${sinpeLine}\n¿Dudas? Responde este mensaje.`;
}

export function templateMorosidad(nombre: string, deuda: string, dias: number, asadaNombre?: string, sinpe?: string): string {
  const asada = asadaNombre ? ` — ${asadaNombre}` : "";
  const sinpeLine = sinpe ? ` SINPE ${sinpe}` : " SINPE";
  return `⚠️ ${nombre}${asada}, tu servicio tiene ${dias} días de mora.\nDeuda: ${deuda}\n\nEvita el corte - regulariza hoy por${sinpeLine} o en oficina.\nConvenios disponibles.`;
}

export function templatePagoRecibido(nombre: string, monto: string, saldo: string): string {
  return `✅ ${nombre}, pago recibido: ${monto}\nSaldo pendiente: ${saldo}\n¡Gracias por estar al día! 💧`;
}

// Batch: notificar vencimientos del periodo (llamar desde cron 5 días antes de vencimiento)
export async function notificarVencimientos(tenantId: string) {
  const { prisma } = await import("@/lib/prisma");
  const facturas = await prisma.invoice.findMany({
    where: { tenantId, status: "PENDING", fechaVencimiento: { gte: new Date(), lte: new Date(Date.now() + 5 * 86400000) } },
    include: { subscriber: true },
    take: 100,
  });
  let enviados = 0;
  for (const f of facturas) {
    if (!f.subscriber.telefono) continue;
    const msg = templateVencimiento(f.subscriber.name, f.periodoFacturacion, `¢${f.total}`, f.fechaVencimiento.toLocaleDateString("es-CR"), f.subscriber.nis);
    const r = await sendWhatsApp(f.subscriber.telefono, msg);
    if (r.success) enviados++;
  }
  return { total: facturas.length, enviados };
}
