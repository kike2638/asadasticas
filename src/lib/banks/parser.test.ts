// Ejecutar: npm test
import { describe, it, expect } from "vitest";
import { parseBankCSV } from "./parser";

const bncr = `Fecha;Descripcion;Referencia;Debito;Credito;Saldo
15/03/2026;SINPE 87654321 JUAN PEREZ;123456789;;12850;500000
16/03/2026;SINPE 88881234 MARIA LOPEZ;987654321;;24500;524500
17/03/2026;COMISION SINPE;999;;;-500;524000`;

const bac = `Fecha,Descripcion,Monto,Saldo
2026-03-15,Transferencia SINPE 87654321,12850,500000
2026-03-16,Deposito efectivo,50000,550000`;

describe("parseBankCSV - BNCR (punto y coma)", () => {
  it("detecta banco, cuenta filas y parsea montos", () => {
    const r = parseBankCSV(bncr);
    expect(r.banco).toBe("BNCR");
    expect(r.count).toBe(3);
    expect(r.transactions[0].monto).toBe(12850);
  });
});

describe("parseBankCSV - BAC (comas, formato genérico)", () => {
  it("detecta banco genérico y describe la transacción", () => {
    const r = parseBankCSV(bac);
    expect(r.banco).toBe("GENERICO");
    expect(r.count).toBe(2);
    expect(r.transactions[0].descripcion).toContain("SINPE");
  });
});
