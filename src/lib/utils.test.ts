import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, cn } from "./utils";

describe("formatCurrency", () => {
  it("formatea sin NaN ni errores", () => {
    expect(formatCurrency(0)).not.toContain("NaN");
    expect(formatCurrency(1234567.89)).not.toContain("NaN");
  });

  it("usa moneda colón (₡ o CRC) y separador de miles", () => {
    const s = formatCurrency(1234);
    expect(s).toMatch(/₡|CRC/);
    expect(s).toMatch(/1[\s.\u00A0,]234/);
  });

  it("negativos se marcan con signo", () => {
    expect(formatCurrency(-500)).toMatch(/-/);
  });
});

describe("formatDate", () => {
  it("fecha fija en formato dd/mm/aaaa es-CR", () => {
    expect(formatDate(new Date(2025, 11, 31))).toBe("31/12/2025");
    expect(formatDate("2026-01-05T12:00:00")).toBe("05/01/2026");
  });
});

describe("cn (clase tailwind)", () => {
  it("concatena y resuelve conflictos", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("p-2", false && "p-6", "text-sm")).toBe("p-2 text-sm");
  });
});
