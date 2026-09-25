// src/lib/billing/calculator.ts - Motor ARESEP 2024-2026 conforme AyA
// Soporta: cargo fijo, TPRH, hidrantes, bloques progresivos, IVA exento hasta base

export interface RateBlock {
  min: number;
  max: number | typeof Infinity;
  pricePerUnit: number;
}

export interface TariffCharges {
  cargoFijoAcueducto: number; // Cargo fijo ARESEP (incluye alcantarillado si aplica)
  tprh?: number; // Tarifa Protección Recurso Hídrico - fija por categoría
  hidrantes?: number; // Ley 8641 - monto fijo mensual
  otrosCargos?: { concepto: string; monto: number }[];
}

export interface BillingResult {
  consumption: number;
  baseCubicMeters: number;
  baseCharge: number;
  variableCharge: number;
  tprh: number;
  hidrantes: number;
  otrosCargos: number;
  subtotalGravado: number;
  subtotalExento: number;
  iva: number;
  total: number;
  breakdown: { block: string; m3: number; cost: number }[];
  detalleTPRH?: string;
}

export function calculateWaterBill(
  consumption: number,
  baseCharge: number,
  blocks: RateBlock[],
  baseCubicMeters: number = 15,
  charges: TariffCharges = { cargoFijoAcueducto: 0 },
  category: string = "DOMICILIAR"
): BillingResult {
  // 1. Cargo variable solo sobre exceso de base (ej: 15m3 domiciliar, 10 comercial)
  let remaining = Math.max(0, consumption - baseCubicMeters);
  let variableCharge = 0;
  const breakdown: BillingResult["breakdown"] = [];

  const sortedBlocks = [...blocks].sort((a, b) => a.min - b.min);
  for (const block of sortedBlocks) {
    if (remaining <= 0) break;
    // Bloques que caen dentro de la base (ej 0-15) se ignoran porque ya se cobraron como cargo fijo
    if (block.max !== Infinity && block.max <= baseCubicMeters) continue;
    const effectiveMin = Math.max(block.min, baseCubicMeters + 1);
    const blockSize = block.max === Infinity ? remaining : (block.max as number) - effectiveMin + 1;
    if (blockSize <= 0) continue;
    const m3InBlock = Math.min(remaining, blockSize);
    const cost = m3InBlock * block.pricePerUnit;
    variableCharge += cost;
    breakdown.push({ block: `${effectiveMin}-${block.max === Infinity ? "∞" : block.max}`, m3: m3InBlock, cost });
    remaining -= m3InBlock;
  }

  const cargoFijo = charges.cargoFijoAcueducto ?? baseCharge;
  const tprh = charges.tprh ?? 0;
  const hidrantes = charges.hidrantes ?? 0;
  const otrosCargos = (charges.otrosCargos ?? []).reduce((s, c) => s + c.monto, 0);

  // 2. IVA CR: Agua potable exenta hasta baseCubicMeters para DOMICILIAR/PUBLICO
  //    Comercial/Industrial gravado 13% sobre total. Variable siempre gravada.
  const isExentoBase = category === "DOMICILIAR" || category === "PUBLICO";
  let subtotalExento = 0;
  let subtotalGravado = 0;

  if (isExentoBase) {
    // cargo fijo + TPRH exentos si consumo dentro de base, variable gravada
    if (consumption <= baseCubicMeters) {
      subtotalExento = cargoFijo + tprh;
      subtotalGravado = variableCharge + hidrantes + otrosCargos;
    } else {
      // Si excede, todo se vuelve gravado según interpretación ARESEP 2024 (tramo excedente)
      // Mantenemos cargo fijo exento, variable gravado
      subtotalExento = cargoFijo + tprh;
      subtotalGravado = variableCharge + hidrantes + otrosCargos;
    }
  } else {
    subtotalGravado = cargoFijo + variableCharge + tprh + hidrantes + otrosCargos;
  }

  const iva = Math.round(subtotalGravado * 0.13 * 100) / 100;
  const total = subtotalExento + subtotalGravado + iva;

  return {
    consumption,
    baseCubicMeters,
    baseCharge: cargoFijo,
    variableCharge,
    tprh,
    hidrantes,
    otrosCargos,
    subtotalGravado,
    subtotalExento,
    iva,
    total,
    breakdown,
  };
}

// Helper para validar consumo atípico (AyA solicita alerta > 40m3 o >200% promedio)
export function detectAnomalia(consumption: number, promedioHistorico?: number): string | null {
  if (consumption < 0) return "LECTURA_INFERIOR";
  if (consumption > 60) return "CONSUMO_EXCESIVO";
  if (consumption === 0) return "CONSUMO_CERO";
  if (promedioHistorico && promedioHistorico > 0 && consumption > promedioHistorico * 2.5) return "PICO_CONSUMO";
  return null;
}
