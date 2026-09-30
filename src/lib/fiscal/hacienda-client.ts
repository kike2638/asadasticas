// src/lib/fiscal/hacienda-client.ts - Cliente ATV Hacienda CR con retry + contingencia
import { prisma } from "@/lib/prisma";
import { fechaEmisionCR } from "./clave";

const HACIENDA_URL = process.env.HACIENDA_API_URL ?? "https://api.comprobanteselectronicos.go.cr/recepcion/v1";
const HACIENDA_TOKEN_URL = "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token";

async function getTokenHacienda(user: string, pass: string): Promise<string | null> {
  try {
    const res = await fetch(HACIENDA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "password", client_id: "api-prod", username: user, password: pass }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export interface EnvioResult {
  success: boolean;
  estado: "ACEPTADO" | "RECHAZADO" | "EN_PROCESO" | "ERROR";
  mensaje?: string;
  clave?: string;
}

export async function enviarComprobante(
  tenantId: string,
  clave: string,
  xmlFirmadoBase64: string,
  fechaEmision: string
): Promise<EnvioResult> {
  const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  if (!config) return { success: false, estado: "ERROR", mensaje: "Sin config Hacienda" };

  let token: string | null = null;
  try {
    const { descifrar } = await import("@/lib/crypto");
    const pass = config.haciendaPassword ? descifrar(config.haciendaPassword, tenantId, "haciendaPassword") : "";
    token = await getTokenHacienda(config.haciendaUser, pass);
  } catch {}

  // Modo desarrollo sin credenciales reales -> marcar EN_PROCESO para webhook simulado
  if (!token) {
    await prisma.invoice.updateMany({
      where: { clave },
      data: { intentosEnvio: { increment: 1 }, fechaUltimoEnvio: new Date(), estadoHacienda: "EN_PROCESO" },
    });
    return { success: true, estado: "EN_PROCESO", mensaje: "Enviado a cola - modo desarrollo sin token real", clave };
  }

  try {
    const res = await fetch(`${HACIENDA_URL}/recepcion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clave, fecha: fechaEmision, emisor: { tipoIdentificacion: "02" }, comprobanteXml: xmlFirmadoBase64 }),
      signal: AbortSignal.timeout(15000),
    });

    const body = await res.json().catch(() => ({}));

    if (res.status === 200 || res.status === 202) {
      await prisma.invoice.updateMany({ where: { clave }, data: { estadoHacienda: "EN_PROCESO", intentosEnvio: { increment: 1 } } });
      return { success: true, estado: "EN_PROCESO", clave };
    }

    await prisma.invoice.updateMany({ where: { clave }, data: { estadoHacienda: "RECHAZADO", respuestaHacienda: body as any } });
    return { success: false, estado: "RECHAZADO", mensaje: body.message ?? "Rechazado Hacienda", clave };
  } catch (e: any) {
    await prisma.invoice.updateMany({ where: { clave }, data: { intentosEnvio: { increment: 1 } } });
    return { success: false, estado: "ERROR", mensaje: e.message, clave };
  }
}

// Consulta estado de un comprobante ya enviado (GET /recepcion?clave=)
// Formatos de respuesta ATV: {estado} directo o {respuesta:{"ind-estado"}}
export async function consultarEstado(tenantId: string, clave: string): Promise<EnvioResult> {
  const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  if (!config) return { success: false, estado: "ERROR", mensaje: "Sin config Hacienda", clave };

  const { descifrar } = await import("@/lib/crypto");
  const pass = config.haciendaPassword ? descifrar(config.haciendaPassword, tenantId, "haciendaPassword") : "";
  const token = await getTokenHacienda(config.haciendaUser, pass).catch(() => null);
  // Modo desarrollo sin credenciales: no altera el estado
  if (!token) return { success: true, estado: "EN_PROCESO", mensaje: "Sin token - modo desarrollo", clave };

  try {
    const res = await fetch(`${HACIENDA_URL}/recepcion?clave=${encodeURIComponent(clave)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    const body: any = await res.json().catch(() => ({}));
    const indicador = String(
      body?.estado ?? body?.["ind-estado"] ?? body?.respuesta?.["ind-estado"] ?? body?.respuesta?.estado ?? ""
    ).toLowerCase();

    if (res.status === 404 || indicador.includes("not recibido")) {
      // Hacienda no tiene el comprobante: re-enivar desde la cola
      await prisma.invoice.update({ where: { clave }, data: { estadoHacienda: "PENDIENTE" } });
      return { success: true, estado: "ERROR", mensaje: "No recibido por Hacienda - en cola de reenvío", clave };
    }
    if (indicador.includes("aceptado")) {
      await prisma.invoice.update({ where: { clave }, data: { estadoHacienda: "ACEPTADO", status: "PENDING", respuestaHacienda: body } });
      return { success: true, estado: "ACEPTADO", clave };
    }
    if (indicador.includes("rechazado")) {
      await prisma.invoice.update({ where: { clave }, data: { estadoHacienda: "RECHAZADO", status: "REJECTED", respuestaHacienda: body } });
      return { success: false, estado: "RECHAZADO", mensaje: body?.respuesta?.detalle ?? "Rechazado Hacienda", clave };
    }
    // recibido / procesando / sin dato nuevo
    return { success: true, estado: "EN_PROCESO", clave };
  } catch (e: any) {
    return { success: false, estado: "ERROR", mensaje: e.message, clave };
  }
}

// Cola de reintentos: llamar desde cron. Procesa hasta 20 comprobantes:
// PENDIENTE sin XML -> emitir (construir+firmar+guardar+enviar); PENDIENTE con XML -> re-enviar;
// EN_PROCESO -> consultar estado. Máximo 5 intentos por comprobante.
export async function reintentosPendientes(tenantId: string): Promise<number> {
  const pendientes = await prisma.invoice.findMany({
    where: { tenantId, estadoHacienda: { in: ["PENDIENTE", "EN_PROCESO"] }, intentosEnvio: { lt: 5 } },
    take: 20,
    orderBy: { fechaEmision: "asc" },
  });

  let procesados = 0;
  for (const inv of pendientes) {
    try {
      if (inv.estadoHacienda === "EN_PROCESO") {
        await consultarEstado(tenantId, inv.clave);
      } else if (!inv.xmlFirmado) {
        const { emitirComprobante } = await import("./emitter"); // import dinámico: evita ciclo con emitter
        await emitirComprobante(inv.id, { enviar: true });
      } else {
        await enviarComprobante(
          tenantId,
          inv.clave,
          Buffer.from(inv.xmlFirmado, "utf8").toString("base64"),
          fechaEmisionCR(inv.fechaEmision)
        );
      }
      procesados++;
    } catch (e: any) {
      console.warn(`[Fiscal] reintento fallido ${inv.clave}: ${e?.message ?? e}`);
    }
  }
  return procesados;
}
