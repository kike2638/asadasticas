import { describe, it, expect } from "vitest";
import { TIERS, getTierForCount, calculateSubscription, formatCRC, formatUSD } from "./pricing";

describe("TIERS", () => {
  it("sin huecos ni solapamientos entre 1 y 5000", () => {
    for (let n = 1; n <= 5000; n++) {
      const tier = getTierForCount(n);
      expect(tier, `n=${n}`).toBeDefined();
      expect(n).toBeGreaterThanOrEqual(tier.min);
      expect(n).toBeLessThanOrEqual(tier.max);
    }
  });

  it("cubre límites exactos de cada tramo", () => {
    expect(getTierForCount(1).label).toContain("Nano");
    expect(getTierForCount(50).label).toContain("Nano");
    expect(getTierForCount(51).label).toContain("Básico");
    expect(getTierForCount(150).label).toContain("Básico");
    expect(getTierForCount(151).label).toContain("Crecimiento");
    expect(getTierForCount(350).label).toContain("Crecimiento");
    expect(getTierForCount(351).label).toContain("Pro");
    expect(getTierForCount(600).label).toContain("Pro");
    expect(getTierForCount(601).label).toContain("Plus");
    expect(getTierForCount(1000).label).toContain("Plus");
    expect(getTierForCount(1001).label).toContain("Enterprise");
    expect(getTierForCount(99999).label).toContain("Enterprise");
  });
});

describe("calculateSubscription", () => {
  it("precio fijo del tramo para la mayoría", () => {
    const r = calculateSubscription(100);
    expect(r.tier.label).toContain("Básico");
    expect(r.montoCRC).toBe(24900);
    expect(r.montoUSD).toBe(49);
    expect(r.abonados).toBe(100);
  });

  it("en 1000 abonados sigue en Plus (sin recargo)", () => {
    const r = calculateSubscription(1000);
    expect(r.tier.label).toContain("Plus");
    expect(r.montoCRC).toBe(84900);
    expect(r.montoUSD).toBe(169);
  });

  it("Enterprise: +60 CRC y +0.12 USD por abonado extra sobre 1000", () => {
    const r = calculateSubscription(1100);
    expect(r.tier.label).toContain("Enterprise");
    expect(r.montoCRC).toBe(84900 + 100 * 60); // 90900
    expect(r.montoUSD).toBe(181);
    expect(r.abonados).toBe(1100);
  });

  it("Enterprise grande escala linealmente", () => {
    const r = calculateSubscription(2000);
    expect(r.montoCRC).toBe(84900 + 1000 * 60); // 144900
    expect(r.montoUSD).toBe(169 + 120);
  });
});

describe("formatos", () => {
  it("formatCRC usa colón y separador es-CR (NBSP)", () => {
    expect(formatCRC(14900)).toMatch(/^₡14[\s\u00A0.]900$/);
    expect(formatCRC(0)).toBe("₡0");
  });

  it("formatUSD siempre 2 decimales con $", () => {
    expect(formatUSD(49)).toBe("$49.00");
    expect(formatUSD(181)).toBe("$181.00");
    expect(formatUSD(181.5)).toBe("$181.50");
  });
});

describe("precios: consistencia de tramos", () => {
  it("precio no decrece al subir de tramo", () => {
    const montos = TIERS.filter(t => !t.perAbonado).map(t => t.priceCRC);
    for (let i = 1; i < montos.length; i++) {
      expect(montos[i]).toBeGreaterThanOrEqual(montos[i - 1]);
    }
  });
});
