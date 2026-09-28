// src/lib/billing/calculator.test.ts - Ejecutar: npm test
import { describe, it, expect } from "vitest";
import { calculateWaterBill, detectAnomalia } from "./calculator";

const blocksDom = [
  { min: 0, max: 15, pricePerUnit: 0 },
  { min: 16, max: 25, pricePerUnit: 550 },
  { min: 26, max: 40, pricePerUnit: 850 },
  { min: 41, max: Infinity, pricePerUnit: 1200 },
];

describe("calculateWaterBill - DOMICILIAR", () => {
  it("dentro de base: solo cargo fijo, variable 0 e IVA solo en hidrantes", () => {
    const r = calculateWaterBill(10, 3500, blocksDom, 15, { cargoFijoAcueducto: 3500, tprh: 1200, hidrantes: 750 }, "DOMICILIAR");
    expect(r.variableCharge).toBe(0);
    expect(r.subtotalExento).toBe(4700);
    expect(r.iva).toBe(Math.round(750 * 0.13 * 100) / 100);
  });

  it("20m3 = 5 de exceso en bloque 16-25 => 5×550 = 2750 + IVA", () => {
    const r = calculateWaterBill(20, 3500, blocksDom, 15, { cargoFijoAcueducto: 3500 }, "DOMICILIAR");
    expect(r.variableCharge).toBe(2750);
    expect(r.total).toBe(3500 + 2750 + Math.round(2750 * 0.13 * 100) / 100);
  });
});

describe("calculateWaterBill - COMERCIAL", () => {
  it("todo gravado con IVA", () => {
    const r = calculateWaterBill(
      20, 8000,
      [{ min: 0, max: 10, pricePerUnit: 0 }, { min: 11, max: 30, pricePerUnit: 750 }],
      10, { cargoFijoAcueducto: 8000 }, "COMERCIAL"
    );
    expect(r.variableCharge).toBe(7500);
    expect(r.subtotalGravado).toBe(8000 + 7500);
    expect(r.iva).toBeGreaterThan(0);
  });
});

describe("detectAnomalia", () => {
  it("lectura menor a la anterior", () => {
    expect(detectAnomalia(-1)).toBe("LECTURA_INFERIOR");
  });
  it("consumo cero", () => {
    expect(detectAnomalia(0)).toBe("CONSUMO_CERO");
  });
  it("consumo excesivo", () => {
    expect(detectAnomalia(61)).toBe("CONSUMO_EXCESIVO");
  });
  it("pico de consumo vs promedio", () => {
    expect(detectAnomalia(50, 10)).toBe("PICO_CONSUMO");
  });
});
