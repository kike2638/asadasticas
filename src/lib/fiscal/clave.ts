// src/lib/fiscal/clave.ts - Generación clave 50 dígitos Hacienda CR (v4.4)
// Formato: Anexos y Estructuras v4.4 — 01-03 país(506) + 04-09 fecha(ddMMyy) + 10-21 cédula(12) + 22-41 consecutivo(20) + 42 situación(1) + 43-50 seguridad(8)
// XSD ClaveType: \d{50} (sin cambios v4.3 → v4.4)

export interface ClaveParams {
  cedulaJuridica: string; // 12 dígitos: ej 3101000000 -> 003101000000
  consecutivo20: string; // 20 dígitos: sucursal(3)+terminal(5)+tipo(2)+numero(10)
  situacion?: string; // 1=normal, 2=contingencia, 3=sin internet
  fecha?: Date;
  codigoSeguridad?: string; // 8 dígitos random
}

export function generarClave50(p: ClaveParams): string {
  const fecha = p.fecha ?? new Date();
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yy = String(fecha.getFullYear()).slice(-2);
  const fechaStr = `${dd}${mm}${yy}`; // posiciones 4-9: DDMMYY (6 dígitos), según Anexos v4.4
  const cedula = p.cedulaJuridica.replace(/\D/g, "").padStart(12, "0").slice(0, 12);
  const consec = p.consecutivo20.padStart(20, "0").slice(0, 20);
  const situacion = p.situacion ?? "1";
  const seguridad = p.codigoSeguridad ?? String(Math.floor(10000000 + Math.random() * 90000000));

  return `506${fechaStr}${cedula}${consec}${situacion}${seguridad}`;
}

export function generarConsecutivo20(sucursal: string, terminal: string, tipo: string, numero: number): string {
  // sucursal 3, terminal 5, tipo 2 (01 FE, 04 TE), numero 10
  const s = sucursal.padStart(3, "0").slice(0, 3);
  const t = terminal.padStart(5, "0").slice(0, 5);
  const tp = tipo.padStart(2, "0").slice(0, 2);
  const n = String(numero).padStart(10, "0").slice(0, 10);
  return `${s}${t}${tp}${n}`;
}

export function validarClave(clave: string): boolean {
  return /^\d{50}$/.test(clave) && clave.startsWith("506");
}

// Fecha de emisión para API Hacienda: ISO-8601 con offset -06:00 (CR no aplica DST)
export function fechaEmisionCR(d: Date): string {
  const cr = new Date(d.getTime() - 6 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${cr.getUTCFullYear()}-${p(cr.getUTCMonth() + 1)}-${p(cr.getUTCDate())}T${p(cr.getUTCHours())}:${p(cr.getUTCMinutes())}:${p(cr.getUTCSeconds())}-06:00`;
}
