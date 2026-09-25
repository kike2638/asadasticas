// src/lib/receipt.ts - Generador recibo PDF térmico 80mm
export interface ReceiptData {
  asadaNombre: string;
  cedulaJuridica?: string;
  fecha: string;
  numeroRecibo: string;
  abonado: string;
  nis: string;
  periodo: string;
  consumo: number;
  detalle: { concepto: string; monto: number }[];
  total: number;
  metodoPago: string;
  referencia?: string;
  saldoPendiente: number;
}

// Para @react-pdf/renderer - componente simple (usar en page)
export function formatReceiptLine(label: string, value: string): string {
  const dots = ".".repeat(Math.max(2, 32 - label.length - value.length));
  return `${label}${dots}${value}`;
}
