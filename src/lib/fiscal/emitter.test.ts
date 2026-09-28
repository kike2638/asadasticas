// src/lib/fiscal/emitter.test.ts - Ejecutar: npm test
// buildFacturaElectronica: Invoice -> comprobante Hacienda v4.4 (sin DB)
import { describe, it, expect } from "vitest";
import { buildFacturaElectronica, type BuildInput } from "./emitter";
import { validarEstructuraFactura, generarXMLTiquete } from "./xml-builder";
import { fechaEmisionCR, validarClave } from "./clave";

const config: BuildInput["config"] = {
  codigoActividadEmisor: "360000",
  cabysPrincipal: "5100000000000",
  emisorProvincia: "1",
  emisorCanton: "01",
  emisorDistrito: "06",
  emisorBarrio: "Sabanilla",
};

const tenant: BuildInput["tenant"] = {
  name: "ASADA San Rafael de Sabanilla",
  cedulaJuridica: "3-002-087654",
  telefono: "87607243",
  email: "facturacion@asanrafael.cr",
  direccion: "100 metros norte de la iglesia, Sabanilla de Alajuela",
};

const subscriber: BuildInput["subscriber"] = {
  name: "Juan Pérez Mora",
  tipoIdentificacion: "01",
  identificacion: "123456789",
  email: "juanperez@gmail.com",
  direccion: "Calle 1, Sabanilla",
  provincia: "1",
  canton: "01",
  distrito: "06",
  category: "DOMICILIAR",
};

// DOMICILIAR: exento = cargoFijo + tprh; gravado = variable + hidrantes
function makeInvoice(over: Partial<BuildInput["invoice"]> = {}): BuildInput["invoice"] {
  return {
    clave: "50627092600300208765400101000000010000004112345671",
    consecutivo: "00101000000010000004",
    tipoComprobante: "TIQUETE_ELECTRONICO",
    fechaEmision: new Date("2026-09-27T16:00:00Z"),
    periodoFacturacion: "2026-09",
    subtotal: 6750,
    subtotalExento: 3250,
    subtotalGravado: 3500,
    impuestoIVA: 455,
    total: 7205,
    detalleCalculo: {
      consumption: 20,
      baseCubicMeters: 15,
      baseCharge: 3250,
      variableCharge: 3500,
      tprh: 0,
      hidrantes: 0,
      breakdown: [{ block: "16-25", m3: 5, cost: 3500 }],
    },
    ...over,
  };
}

describe("buildFacturaElectronica - DOMICILIAR (exento + gravado)", () => {
  const fe = buildFacturaElectronica({ invoice: makeInvoice(), subscriber, tenant, config });

  it("pasa validación de estructura v4.4 sin errores", () => {
    expect(validarEstructuraFactura(fe, "TE")).toEqual([]);
  });

  it("genera XML bien formado con clave y consecutivo reales", () => {
    const xml = generarXMLTiquete(fe);
    expect(xml).toContain(`<Clave>${fe.clave}</Clave>`);
    expect(xml).toContain("<NumeroConsecutivo>00101000000010000004</NumeroConsecutivo>");
    expect(validarClave(fe.clave)).toBe(true);
  });

  it("emite 2 líneas: exenta (cargo fijo) + gravada (consumo con IVA)", () => {
    expect(fe.detalle).toHaveLength(2);
    expect(fe.detalle[0].subTotal).toBe(3250);
    expect(fe.detalle[0].impuesto).toBeUndefined(); // builder pone exento por defecto
    expect(fe.detalle[1].subTotal).toBe(3500);
    expect(fe.detalle[1].impuesto).toEqual({ codigo: "01", codigoTarifaIVA: "08", tarifa: 13, monto: 455 });
    expect(fe.detalle[1].montoTotalLinea).toBe(3955); // 3500 + 455
  });

  it("Σ líneas cierra exacto con el total de la factura", () => {
    const suma = fe.detalle.reduce((s, l) => s + l.montoTotalLinea, 0);
    expect(Math.round(suma * 100) / 100).toBe(fe.resumen.totalComprobante);
    expect(fe.resumen.totalVenta).toBe(fe.resumen.totalServGravados! + fe.resumen.totalServExentos!);
  });

  it("resumen con desglose de impuesto 13% y moneda CRC", () => {
    expect(fe.resumen.codigoTipoMoneda).toBe("CRC");
    expect(fe.resumen.tipoCambio).toBe(1);
    expect(fe.resumen.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 455 },
    ]);
    expect(fe.resumen.totalImpuesto).toBe(455);
  });

  it("emisor con identificación jurídica 12 dígitos, teléfono NumTelefono y correo", () => {
    expect(fe.emisor.identificacion).toEqual({ tipo: "02", numero: "003002087654" });
    expect(fe.emisor.telefono).toBe("87607243");
    expect(fe.emisor.correos).toEqual(["facturacion@asanrafael.cr"]);
    expect(fe.emisor.otrasSenas.length).toBeGreaterThanOrEqual(5);
  });

  it("fecha de emisión en hora CR con offset -06:00", () => {
    expect(fe.fechaEmision).toBe("2026-09-27T10:00:00-06:00");
  });
});

describe("buildFacturaElectronica - categorías y casos límite", () => {
  it("COMERCIAL: todo gravado => 1 sola línea con IVA", () => {
    const fe = buildFacturaElectronica({
      invoice: makeInvoice({ subtotalExento: 0, subtotalGravado: 6750, subtotal: 6750, impuestoIVA: 877.5, total: 7627.5, detalleCalculo: { consumption: 20, baseCharge: 3250, variableCharge: 3500, tprh: 0, hidrantes: 0 } }),
      subscriber: { ...subscriber, category: "COMERCIAL" },
      tenant, config,
    });
    expect(validarEstructuraFactura(fe, "TE")).toEqual([]);
    expect(fe.detalle).toHaveLength(1);
    expect(fe.detalle[0].impuesto).toEqual({ codigo: "01", codigoTarifaIVA: "08", tarifa: 13, monto: 877.5 });
    expect(fe.detalle[0].montoTotalLinea).toBe(7627.5);
  });

  it("todo exento (sin consumo variable) => 1 línea exenta", () => {
    const fe = buildFacturaElectronica({
      invoice: makeInvoice({ subtotalGravado: 0, subtotal: 3250, impuestoIVA: 0, total: 3250, detalleCalculo: { consumption: 0, baseCharge: 3250, variableCharge: 0, tprh: 0, hidrantes: 0 } }),
      subscriber, tenant, config,
    });
    expect(validarEstructuraFactura(fe, "TE")).toEqual([]);
    expect(fe.detalle).toHaveLength(1);
    expect(fe.detalle[0].impuesto).toBeUndefined();
    expect(fe.resumen.totalDesgloseImpuesto).toBeUndefined();
    expect(fe.resumen.totalImpuesto).toBe(0);
  });

  it("sin email de la ASADA lanza error claro", () => {
    expect(() =>
      buildFacturaElectronica({ invoice: makeInvoice(), subscriber, tenant: { ...tenant, email: null }, config })
    ).toThrow(/email/);
  });

  it("sin dirección de la ASADA lanza error claro", () => {
    expect(() =>
      buildFacturaElectronica({ invoice: makeInvoice(), subscriber, tenant: { ...tenant, direccion: null }, config })
    ).toThrow(/dirección/);
  });

  it("nota de crédito no soportada", () => {
    expect(() =>
      buildFacturaElectronica({ invoice: makeInvoice({ tipoComprobante: "NOTA_CREDITO" }), subscriber, tenant, config })
    ).toThrow(/no soportado/);
  });

  it("FE valida estructura con receptor identificado", () => {
    const fe = buildFacturaElectronica({ invoice: makeInvoice({ tipoComprobante: "FACTURA_ELECTRONICA" }), subscriber, tenant, config });
    expect(validarEstructuraFactura(fe, "FE")).toEqual([]);
    expect(fe.receptor?.identificacion).toEqual({ tipo: "01", numero: "123456789" });
  });

  it("FE sin identificación del receptor produce error", () => {
    const fe = buildFacturaElectronica({
      invoice: makeInvoice({ tipoComprobante: "FACTURA_ELECTRONICA" }),
      subscriber: { ...subscriber, identificacion: null },
      tenant, config,
    });
    expect(validarEstructuraFactura(fe, "FE").some(e => e.includes("Identificacion"))).toBe(true);
  });
});

describe("fechaEmisionCR", () => {
  it("convierte UTC a hora Costa Rica (-06:00, sin DST)", () => {
    expect(fechaEmisionCR(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01-15T06:00:00-06:00");
    expect(fechaEmisionCR(new Date("2026-07-15T12:00:00Z"))).toBe("2026-07-15T06:00:00-06:00");
  });
});
