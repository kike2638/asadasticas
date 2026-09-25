// src/lib/saas/platform.ts - Config plataforma SaaS
export const PLATFORM = {
  name: "AquaLectura CR",
  // Superadmin recibe pagos de suscripción por SINPE
  sinpeNumero: "87607243",
  sinpeNombre: "AquaLectura CR - Kike",
  sinpeBanco: "BNCR",
  // Para transferencias
  ibanCRC: "CR00 0000 0000 0000 0000 0", // completar
  email: "admin@asadas-erp.cr",
  whatsapp: "87607243",
} as const;

export function formatSinpeCR(num: string): string {
  const d = num.replace(/\D/g, "");
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}
