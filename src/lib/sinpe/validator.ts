// src/lib/sinpe/validator.ts - Validador SINPE Móvil CR + conciliación
// Formato SINPE: comprobante 6-12 dígitos, referencia bancaria, monto exacto

export interface SinpeValidation {
  valid: boolean;
  normalized: string;
  error?: string;
}

const SINPE_REGEX = /^\d{6,15}$/; // BNCR, BAC, BCR usan 7-12 dígitos

export function normalizeSinpeRef(ref: string): string {
  return ref.replace(/\D/g, "").trim();
}

export function validateSinpeRef(ref: string): SinpeValidation {
  const normalized = normalizeSinpeRef(ref);
  if (!normalized) return { valid: false, normalized, error: "Referencia vacía" };
  if (!SINPE_REGEX.test(normalized)) return { valid: false, normalized, error: "Referencia debe ser 6-15 dígitos" };
  if (/^0+$/.test(normalized)) return { valid: false, normalized, error: "Referencia inválida" };
  return { valid: true, normalized };
}

export function validateSinpeAmount(amount: number, expected?: number): { valid: boolean; error?: string } {
  if (amount <= 0) return { valid: false, error: "Monto debe ser > 0" };
  if (expected !== undefined && Math.abs(amount - expected) > 0.01) {
    return { valid: false, error: `Monto ¢${amount} no coincide con deuda ¢${expected}` };
  }
  return { valid: true };
}

// Conciliación: detecta SINPE duplicado por referencia + monto + fecha (±3 días)
export function isDuplicateSinpe(
  newRef: string,
  newAmount: number,
  existing: { referenceNumber: string | null; amount: any; paymentDate: Date }[]
): boolean {
  const norm = normalizeSinpeRef(newRef);
  return existing.some(e => {
    if (!e.referenceNumber) return false;
    if (normalizeSinpeRef(e.referenceNumber) !== norm) return false;
    if (Math.abs(Number(e.amount) - newAmount) > 0.01) return false;
    const diffDays = Math.abs(Date.now() - new Date(e.paymentDate).getTime()) / 86400000;
    return diffDays < 3;
  });
}

export const SINPE_BANKS: Record<string, string> = {
  "506": "BNCR", "506-1": "BCR", "506-2": "BAC", "506-3": "Davivienda", "506-4": "Scotiabank"
};

export function getSinpeHelpText(): string {
  return "Ingrese el N° de comprobante SINPE (6-12 dígitos del SMS del banco). Ej: 123456789";
}
