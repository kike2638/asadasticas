// src/lib/fiscal/xml-builder.test.ts - Ejecutar: npm test
// Estructura de comprobantes Hacienda CR v4.4 validada contra XSD oficial (scripts/validate-fiscal.ps1)
import { describe, it, expect } from "vitest";
import {
  generarXMLTiquete,
  generarXMLFactura,
  validarEstructuraFactura,
  NS_V44,
  type FacturaElectronica,
} from "./xml-builder";

const base: FacturaElectronica = {
  clave: "50627092600300208765400101000000010000004112345671",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "360000",
  numeroConsecutivo: "00101000000010000004",
  fechaEmision: "2026-09-27T10:00:00-06:00",
  emisor: {
    nombre: "ASADA San Rafael de Sabanilla",
    identificacion: { tipo: "02", numero: "3002087654" },
    nombreComercial: "ASADA San Rafael",
    provincia: "1",
    canton: "01",
    distrito: "06",
    barrio: "Sabanilla",
    otrasSenas: "100 metros norte de la iglesia, Sabanilla de Alajuela",
    telefono: "87607243",
    correos: ["facturacion@asanrafael.cr"],
  },
  receptor: {
    nombre: "Juan Pérez Mora",
    identificacion: { tipo: "01", numero: "123456789" },
    correoElectronico: "juanperez@gmail.com",
  },
  condicionVenta: "01",
  detalle: [
    {
      numeroLinea: 1,
      codigoCabys: "5100000000000",
      cantidad: 1,
      unidadMedida: "m³",
      detalle: "Consumo de agua potable periodo 2026-09 (12 m³)",
      precioUnitario: 3250,
      montoTotal: 3250,
      subTotal: 3250,
      impuesto: { codigo: "01", codigoTarifaIVA: "08", tarifa: 13, monto: 422.5 },
      montoTotalLinea: 3672.5,
    },
    {
      numeroLinea: 2,
      codigoCabys: "5100000000000",
      cantidad: 1,
      unidadMedida: "m³",
      detalle: "Cargo fijo acueducto periodo 2026-09",
      precioUnitario: 3500,
      montoTotal: 3500,
      subTotal: 3500,
      montoTotalLinea: 3500,
    },
  ],
  resumen: {
    codigoTipoMoneda: "CRC",
    totalServGravados: 3250,
    totalServExentos: 3500,
    totalGravado: 3250,
    totalExento: 3500,
    totalVenta: 6750,
    totalVentaNeta: 6750,
    totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 422.5 }],
    totalImpuesto: 422.5,
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: 7172.5 }],
    totalComprobante: 7172.5,
  },
};

describe("xml-builder v4.4 - namespaces", () => {
  it("TE usa namespace v4.4 de tiqueteElectronico", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain(`<TiqueteElectronico xmlns="${NS_V44.tiquete}">`);
    expect(NS_V44.tiquete).toBe("https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico");
  });

  it("FE usa namespace v4.4 de facturaElectronica", () => {
    const xml = generarXMLFactura(base);
    expect(xml).toContain(`<FacturaElectronica xmlns="${NS_V44.factura}">`);
    expect(NS_V44.factura).toBe("https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica");
  });
});

describe("xml-builder v4.4 - raíz", () => {
  it("orden de nodos raíz: Clave, ProveedorSistemas, CodigoActividadEmisor, NumeroConsecutivo, FechaEmision", () => {
    const xml = generarXMLTiquete(base);
    const orden = ["<Clave>", "<ProveedorSistemas>", "<CodigoActividadEmisor>", "<NumeroConsecutivo>", "<FechaEmision>"];
    const pos = orden.map(n => xml.indexOf(n));
    expect(pos.every(p => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it("CondicionVenta va después de Receptor y antes de DetalleServicio", () => {
    const xml = generarXMLTiquete(base);
    const iCond = xml.indexOf("<CondicionVenta>");
    expect(xml.indexOf("<Receptor>")).toBeLessThan(iCond);
    expect(xml.indexOf("<DetalleServicio>")).toBeGreaterThan(iCond);
  });
});

describe("xml-builder v4.4 - Emisor/Receptor", () => {
  it("Identificacion anidada (Tipo/Numero) no plana", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toMatch(/<Identificacion>\s*<Tipo>02<\/Tipo>\s*<Numero>3002087654<\/Numero>\s*<\/Identificacion>/);
    expect(xml).not.toContain("<NumeroIdentificacion>");
  });

  it("Telefono usa NumTelefono", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<NumTelefono>87607243</NumTelefono>");
  });

  it("Emisor con OtrasSenas y 1..4 correos", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<OtrasSenas>");
    expect(xml).toContain("<CorreoElectronico>facturacion@asanrafael.cr</CorreoElectronico>");
  });
});

describe("xml-builder v4.4 - LineaDetalle", () => {
  it("secuencia obligatoria: SubTotal, BaseImponible, Impuesto, ImpuestoAsumidoEmisorFabrica, ImpuestoNeto, MontoTotalLinea", () => {
    const xml = generarXMLTiquete(base);
    const orden = [
      "<SubTotal>", "<BaseImponible>", "<Impuesto>",
      "<ImpuestoAsumidoEmisorFabrica>", "<ImpuestoNeto>", "<MontoTotalLinea>",
    ];
    const pos = orden.map(n => xml.indexOf(n));
    expect(pos.every(p => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it("línea sin impuesto emite IVA exento por defecto (TarifaExenta 10, Monto 0)", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<CodigoTarifaIVA>10</CodigoTarifaIVA>");
    expect(xml).toContain("<ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>");
  });

  it("línea gravada emite CodigoTarifaIVA 08 (13%) con Monto 422.5", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
    expect(xml).toContain("<Monto>422.5</Monto>");
  });

  it("CodigoCABYS de 13 dígitos presente en cada línea", () => {
    const xml = generarXMLTiquete(base);
    expect((xml.match(/<CodigoCABYS>5100000000000<\/CodigoCABYS>/g) ?? []).length).toBe(2);
  });

  it("UnidadMedida m³ se emite tal cual", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<UnidadMedida>m³</UnidadMedida>");
  });
});

describe("xml-builder v4.4 - ResumenFactura", () => {
  it("MedioPago va dentro de ResumenFactura", () => {
    const xml = generarXMLTiquete(base);
    const iRes = xml.indexOf("<ResumenFactura>");
    const iMed = xml.indexOf("<MedioPago>");
    const iFinRes = xml.indexOf("</ResumenFactura>");
    expect(iRes).toBeGreaterThanOrEqual(0);
    expect(iMed).toBeGreaterThan(iRes);
    expect(iMed).toBeLessThan(iFinRes);
  });

  it("TotalDesgloseImpuesto va entre TotalVentaNeta y TotalImpuesto", () => {
    const xml = generarXMLTiquete(base);
    const orden = ["<TotalVentaNeta>", "<TotalDesgloseImpuesto>", "<TotalImpuesto>", "<TotalComprobante>"];
    const pos = orden.map(n => xml.indexOf(n));
    expect(pos.every(p => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it("CodigoTipoMoneda con TipoCambio 1 por defecto", () => {
    const xml = generarXMLTiquete(base);
    expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
    expect(xml).toContain("<TipoCambio>1</TipoCambio>");
  });
});

describe("validarEstructuraFactura", () => {
  it("comprobante de ejemplo válido sin errores", () => {
    expect(validarEstructuraFactura(base, "FE")).toEqual([]);
    expect(validarEstructuraFactura(base, "TE")).toEqual([]);
  });

  it("rechaza clave con menos de 50 dígitos", () => {
    const errs = validarEstructuraFactura({ ...base, clave: "5062709260101" }, "TE");
    expect(errs).toContain("Clave debe tener 50 dígitos");
  });

  it("rechaza CodigoCABYS sin 13 dígitos", () => {
    const errs = validarEstructuraFactura(
      { ...base, detalle: [{ ...base.detalle[0], codigoCabys: "123" }] },
      "TE"
    );
    expect(errs.some(e => e.includes("CodigoCABYS"))).toBe(true);
  });

  it("rechaza MontoTotalLinea inconsistente con SubTotal + Impuesto", () => {
    const errs = validarEstructuraFactura(
      { ...base, detalle: [{ ...base.detalle[0], montoTotalLinea: 9999 }] },
      "TE"
    );
    expect(errs.some(e => e.includes("MontoTotalLinea"))).toBe(true);
  });

  it("FE exige Receptor", () => {
    const errs = validarEstructuraFactura({ ...base, receptor: undefined }, "FE");
    expect(errs).toContain("Receptor obligatorio en Factura Electrónica");
  });

  it("exige 1..4 correos del emisor", () => {
    const errs = validarEstructuraFactura({ ...base, emisor: { ...base.emisor, correos: [] } }, "TE");
    expect(errs.some(e => e.includes("correos"))).toBe(true);
  });
});
