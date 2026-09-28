// Ejecutar: npm test
import { describe, it, expect } from "vitest";
import { validateSinpeRef, isDuplicateSinpe } from "./validator";

describe("validateSinpeRef", () => {
  it("acepta referencia de 6 dígitos", () => {
    expect(validateSinpeRef("123456").valid).toBe(true);
  });
  it("rechaza no numéricos", () => {
    expect(validateSinpeRef("abc").valid).toBe(false);
  });
  it("rechaza todos ceros", () => {
    expect(validateSinpeRef("000000").valid).toBe(false);
  });
});

describe("isDuplicateSinpe", () => {
  const pagos = [{ referenceNumber: "123456", amount: 10000, paymentDate: new Date() }];
  it("detecta referencia repetida", () => {
    expect(isDuplicateSinpe("123456", 10000, pagos)).toBe(true);
  });
  it("ignora referencias distintas", () => {
    expect(isDuplicateSinpe("999999", 10000, pagos)).toBe(false);
  });
});
