// src/lib/validators/cedula.ts - Validación cédula CR (física, jurídica, DIMEX)
export function validarCedulaCR(tipo: string, numero: string): { valid: boolean; error?: string; normalized: string } {
  const norm = numero.replace(/\D/g, "");
  if (!norm) return { valid: false, error: "Cédula vacía", normalized: norm };

  if (tipo === "01") { // Física: 9 dígitos
    if (!/^\d{9}$/.test(norm)) return { valid: false, error: "Cédula física debe tener 9 dígitos", normalized: norm };
    if (/^0+$/.test(norm)) return { valid: false, error: "Cédula inválida", normalized: norm };
    return { valid: true, normalized: norm };
  }
  if (tipo === "02") { // Jurídica: 10 dígitos
    if (!/^\d{10}$/.test(norm)) return { valid: false, error: "Cédula jurídica debe tener 10 dígitos", normalized: norm };
    if (!norm.startsWith("3") && !norm.startsWith("4")) return { valid: false, error: "Jurídica debe iniciar con 3 o 4", normalized: norm };
    return { valid: true, normalized: norm.padStart(12, "0") };
  }
  if (tipo === "03") { // DIMEX: 11-12
    if (!/^\d{11,12}$/.test(norm)) return { valid: false, error: "DIMEX debe tener 11-12 dígitos", normalized: norm };
    return { valid: true, normalized: norm.padStart(12, "0") };
  }
  return { valid: false, error: `Tipo ${tipo} no soportado`, normalized: norm };
}

export function formatCedulaDisplay(tipo: string, numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (tipo === "01" && n.length === 9) return `${n[0]}-${n.slice(1, 5)}-${n.slice(5)}`;
  if (tipo === "02" && n.length >= 10) return `${n.slice(0, 1)}-${n.slice(1, 4)}-${n.slice(4)}`;
  return n;
}
