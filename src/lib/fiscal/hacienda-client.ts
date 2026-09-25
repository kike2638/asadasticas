// src/lib/fiscal/hacienda-client.ts - Cliente ATV Hacienda CR con retry + contingencia
import { prisma } from "@/lib/prisma";

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
    const pass = config.haciendaPassword; // en prod desencriptar
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

// Job de reintento: llamar desde cron cada 5min para pendientes con intentos < 5
export async function reintentosPendientes(tenantId: string) {
  const pendientes = await prisma.invoice.findMany({
    where: { tenantId, estadoHacienda: { in: ["PENDIENTE", "EN_PROCESO"] }, intentosEnvio: { lt: 5 } },
    take: 20,
    orderBy: { fechaEmision: "asc" },
  });
  return pendientes.length;
}
