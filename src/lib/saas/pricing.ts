// src/lib/saas/pricing.ts - Pricing ASADA por cantidad de abonados (CRC)
// Inspirado en SaaS real CR: escalado, no por usuario sino por padrón

export interface Tier {
  min: number;
  max: number; // Infinity para último
  priceCRC: number;
  priceUSD: number;
  label: string;
  perAbonado?: number; // para enterprise >1000
}

export const TIERS: Tier[] = [
  { min: 1, max: 50, priceCRC: 14900, priceUSD: 29, label: "Nano • hasta 50" },
  { min: 51, max: 150, priceCRC: 24900, priceUSD: 49, label: "Básico • 51-150" },
  { min: 151, max: 350, priceCRC: 39900, priceUSD: 79, label: "Crecimiento • 151-350" },
  { min: 351, max: 600, priceCRC: 59900, priceUSD: 119, label: "Pro • 351-600" },
  { min: 601, max: 1000, priceCRC: 84900, priceUSD: 169, label: "Plus • 601-1000" },
  { min: 1001, max: Infinity, priceCRC: 84900, priceUSD: 169, label: "Enterprise • 1000+", perAbonado: 60 }, // +60 colones por abonado extra
];

export function getTierForCount(n: number): Tier {
  return TIERS.find(t => n >= t.min && n <= t.max) ?? TIERS[TIERS.length - 1];
}

export function calculateSubscription(n: number): { tier: Tier; montoCRC: number; montoUSD: number; abonados: number } {
  const tier = getTierForCount(n);
  if (tier.perAbonado && n > 1000) {
    const extra = n - 1000;
    const montoCRC = tier.priceCRC + extra * tier.perAbonado;
    const montoUSD = Math.round((tier.priceUSD + extra * 0.12) * 100) / 100;
    return { tier, montoCRC, montoUSD, abonados: n };
  }
  return { tier, montoCRC: tier.priceCRC, montoUSD: tier.priceUSD, abonados: n };
}

export function formatCRC(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

// Para landing: tabla comparativa
export const FEATURES_BY_PLAN: Record<string, string[]> = {
  BASIC: ["Tiquete 04 Hacienda", "Lecturas offline", "SINPE FIFO", "Soporte WhatsApp"],
  PRO: ["Todo BASIC", "Facturación masiva", "Mapa GPS", "Reportes AyA", "WhatsApp auto"],
  ENTERPRISE: ["Todo PRO", "API + webhooks", "Multi-ASADA", "SLA + capacitación"],
};
