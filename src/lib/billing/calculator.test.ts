// src/lib/billing/calculator.test.ts - Ejecutar: npx tsx src/lib/billing/calculator.test.ts
import { calculateWaterBill, detectAnomalia } from "./calculator";

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

const blocksDom = [
  { min: 0, max: 15, pricePerUnit: 0 },
  { min: 16, max: 25, pricePerUnit: 550 },
  { min: 26, max: 40, pricePerUnit: 850 },
  { min: 41, max: Infinity, pricePerUnit: 1200 },
];

 // 1. Dentro de base = solo cargo fijo, IVA 0
let r = calculateWaterBill(10, 3500, blocksDom, 15, { cargoFijoAcueducto: 3500, tprh: 1200, hidrantes: 750 }, "DOMICILIAR");
assert(r.variableCharge === 0, "var 0");
assert(r.subtotalExento === 4700, `exento 4700 got ${r.subtotalExento}`);
assert(r.iva === Math.round(750 * 0.13 * 100) / 100, "iva solo hidrantes");

// 2. 20m3 = 5 exceso en bloque 16-25 => 5*550=2750
r = calculateWaterBill(20, 3500, blocksDom, 15, { cargoFijoAcueducto: 3500 }, "DOMICILIAR");
assert(r.variableCharge === 2750, `var 2750 got ${r.variableCharge}`);
assert(r.total === 3500 + 2750 + Math.round(2750 * 0.13 * 100) / 100, "total domiciliar");

// 3. Comercial gravado todo
r = calculateWaterBill(20, 8000, [{ min: 0, max: 10, pricePerUnit: 0 }, { min: 11, max: 30, pricePerUnit: 750 }], 10, { cargoFijoAcueducto: 8000 }, "COMERCIAL");
assert(r.variableCharge === 7500, "comercial var 10*750");
assert(r.subtotalGravado === 8000 + 7500, "gravado comercial");
assert(r.iva > 0, "iva comercial");

// 4. Anomalías
assert(detectAnomalia(-1) === "LECTURA_INFERIOR", "inferior");
assert(detectAnomalia(0) === "CONSUMO_CERO", "cero");
assert(detectAnomalia(61) === "CONSUMO_EXCESIVO", "excesivo");
assert(detectAnomalia(50, 10) === "PICO_CONSUMO", "pico");

console.log("✅ calculator.test.ts: 9/9 passed");
