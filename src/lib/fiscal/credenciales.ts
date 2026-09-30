// src/lib/fiscal/credenciales.ts - Acceso único a los secretos fiscales de una ASADA
//
// Regla: los secretos NUNCA se devuelven a la API ni al cliente. Aquí se descifran
// solo en memoria, en el servidor, en el momento de firmar o de llamar a Hacienda.
import { prisma } from "@/lib/prisma";
import { descifrar } from "@/lib/crypto";

export interface CredencialesHacienda {
  usuario: string;
  password: string;
  p12Base64: string;
  pin: string;
}

/** Descifra las credenciales del tenant para usar en el servidor. Lanza error con mensaje claro si falta algo. */
export async function obtenerCredenciales(tenantId: string): Promise<CredencialesHacienda> {
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  if (!cfg) throw new Error("Configuración Hacienda no encontrada para esta ASADA");

  if (!cfg.llaveCryptBase64 || cfg.llaveCryptBase64.startsWith("placeholder")) {
    throw new Error("Falta el certificado digital (.p12) de esta ASADA. Súbelo en Configuración.");
  }

  const p12Base64 = descifrar(cfg.llaveCryptBase64, tenantId, "p12");
  const pin = descifrar(cfg.llavePin, tenantId, "pin");
  const password = cfg.haciendaPassword ? descifrar(cfg.haciendaPassword, tenantId, "haciendaPassword") : "";

  if (!p12Base64) throw new Error("Certificado .p12 vacío o corrupto");
  if (!pin) throw new Error("PIN del certificado vacío o corrupto");

  return { usuario: cfg.haciendaUser, password, p12Base64, pin };
}

/** Estado seguro para la UI: dice qué hay configurado, nunca qué vale. */
export async function estadoCredenciales(tenantId: string) {
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  if (!cfg) return null;
  const p12 = cfg.llaveCryptBase64 && !cfg.llaveCryptBase64.startsWith("placeholder");
  return {
    usuario: cfg.haciendaUser,
    passwordConfigurada: !!cfg.haciendaPassword,
    p12Configurado: !!p12,
    pinConfigurado: !!cfg.llavePin,
    sucursal: cfg.sucursal,
    terminal: cfg.terminal,
    codigoActividadEmisor: cfg.codigoActividadEmisor,
    cabysPrincipal: cfg.cabysPrincipal,
    emisorProvincia: cfg.emisorProvincia,
    emisorCanton: cfg.emisorCanton,
    emisorDistrito: cfg.emisorDistrito,
    emisorBarrio: cfg.emisorBarrio,
  };
}
