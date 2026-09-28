// src/lib/fiscal/emitter.ts — Pipeline fiscal: Invoice → XML v4.4 → firma → Hacienda
// buildFacturaElectronica es puro (testeable sin DB); emitirComprobante orquesta el ciclo completo.
import { prisma } from "@/lib/prisma";
import { generarXMLTiquete, generarXMLFactura, validarEstructuraFactura, type FacturaElectronica } from "./xml-builder";
import { firmarXML } from "./signer";
import { enviarComprobante, type EnvioResult } from "./hacienda-client";
import { fechaEmisionCR } from "./clave";

type Din = number | { toNumber(): number };
const num = (d: Din): number => (typeof d === "number" ? d : d.toNumber());
const round2 = (n: number) => Math.round(n * 100) / 100;

// Detalle de cálculo persistido en Invoice.detalleCalculo por invoice-service
export interface DetalleCalculo {
  consumption: number;
  prevValue?: number;
  currentReading?: number;
  baseCubicMeters?: number;
  baseCharge?: number;
  variableCharge?: number;
  tprh?: number;
  hidrantes?: number;
  otrosCargos?: number;
  breakdown?: { block: string; m3: number; cost: number }[];
  tariffName?: string;
  anomalia?: string;
}

export interface BuildInput {
  invoice: {
    clave: string;
    consecutivo: string;
    tipoComprobante: string;
    fechaEmision: Date;
    periodoFacturacion: string;
    subtotal: Din;
    subtotalExento: Din;
    subtotalGravado: Din;
    impuestoIVA: Din;
    total: Din;
    detalleCalculo: unknown;
  };
  subscriber: {
    name: string;
    tipoIdentificacion?: string | null;
    identificacion?: string | null;
    email?: string | null;
    direccion?: string | null;
    provincia?: string | null;
    canton?: string | null;
    distrito?: string | null;
    category: string;
  };
  tenant: {
    name: string;
    cedulaJuridica?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
  };
  config: {
    codigoActividadEmisor: string;
    cabysPrincipal: string;
    emisorProvincia: string;
    emisorCanton: string;
    emisorDistrito: string;
    emisorBarrio?: string | null;
  };
}

export function buildFacturaElectronica(input: BuildInput): FacturaElectronica {
  const { invoice, subscriber, tenant, config } = input;

  if (invoice.tipoComprobante !== "TIQUETE_ELECTRONICO" && invoice.tipoComprobante !== "FACTURA_ELECTRONICA") {
    throw new Error(`Tipo de comprobante ${invoice.tipoComprobante} no soportado por el builder v4.4 (solo TE/FE)`);
  }

  const cedula = (tenant.cedulaJuridica ?? "").replace(/\D/g, "");
  if (!cedula || cedula === "000000000000") throw new Error("Cédula jurídica ASADA no configurada");
  // Cédula física = 9 dígitos; jurídica CR = 10 (3-XXX-XXXXXX) o 12 ya normalizada
  const tipoIdent = cedula.length <= 9 ? "01" : "02";
  const cedula12 = cedula.padStart(12, "0");
  if (!tenant.email) throw new Error("ASADA sin email configurado - requerido en comprobantes Hacienda");
  if (!tenant.direccion) throw new Error("ASADA sin dirección física configurada - requerido en comprobantes Hacienda");

  const det = (invoice.detalleCalculo ?? {}) as DetalleCalculo;
  const exento = round2(num(invoice.subtotalExento));
  const gravado = round2(num(invoice.subtotalGravado));
  const iva = round2(num(invoice.impuestoIVA));
  const subtotal = round2(num(invoice.subtotal));
  const total = round2(num(invoice.total));
  const periodo = invoice.periodoFacturacion;
  const cabys = config.cabysPrincipal;
  const categoria = subscriber.category;
  const todoGravado = categoria === "COMERCIAL" || categoria === "INDUSTRIAL";

  // Líneas: máximo 2 (exenta + gravada) — así Σlíneas cierra EXACTO con los totales
  // redondeados de la factura (una sola operación de IVA, sin desfase de centavos).
  const lineas: FacturaElectronica["detalle"] = [];

  if (exento > 0) {
    const partes: string[] = [];
    if ((det.baseCharge ?? 0) > 0) partes.push("cargo fijo acueducto");
    if ((det.tprh ?? 0) > 0 && !todoGravado) partes.push("TPRH");
    lineas.push({
      numeroLinea: 1,
      codigoCabys: cabys,
      cantidad: 1,
      unidadMedida: "m³",
      detalle: `Servicio de agua potable periodo ${periodo}${partes.length ? ` - ${partes.join(", ")}` : ""} (exento IVA)`,
      precioUnitario: exento,
      montoTotal: exento,
      subTotal: exento,
      montoTotalLinea: exento,
    });
  }

  if (gravado > 0) {
    const partes: string[] = [];
    if ((det.variableCharge ?? 0) > 0) partes.push(`consumo ${det.consumption} m³`);
    if ((det.tprh ?? 0) > 0 && todoGravado) partes.push("TPRH");
    if ((det.hidrantes ?? 0) > 0) partes.push("hidrantes Ley 8641");
    if ((det.otrosCargos ?? 0) > 0) partes.push("otros cargos");
    if (todoGravado && (det.baseCharge ?? 0) > 0) partes.push("cargo fijo");
    lineas.push({
      numeroLinea: lineas.length + 1,
      codigoCabys: cabys,
      cantidad: 1,
      unidadMedida: "m³",
      detalle: `Servicio de agua potable periodo ${periodo}${partes.length ? ` - ${partes.join(", ")}` : ""} (gravado IVA 13%)`,
      precioUnitario: gravado,
      montoTotal: gravado,
      subTotal: gravado,
      impuesto: { codigo: "01", codigoTarifaIVA: "08", tarifa: 13, monto: iva },
      montoTotalLinea: round2(gravado + iva),
    });
  }

  if (lineas.length === 0) {
    throw new Error(`Factura ${invoice.clave} sin montos que facturar (subtotal en 0)`);
  }

  const receptor: FacturaElectronica["receptor"] = {
    nombre: subscriber.name,
    ...(subscriber.identificacion
      ? { identificacion: { tipo: subscriber.tipoIdentificacion || "01", numero: subscriber.identificacion } }
      : {}),
    ...(subscriber.email ? { correoElectronico: subscriber.email } : {}),
    ...(subscriber.provincia && subscriber.canton && subscriber.distrito && subscriber.direccion
      ? {
          provincia: subscriber.provincia,
          canton: subscriber.canton,
          distrito: subscriber.distrito,
          otrasSenas: subscriber.direccion,
        }
      : {}),
  };

  return {
    clave: invoice.clave,
    proveedorSistemas: cedula12,
    codigoActividadEmisor: config.codigoActividadEmisor,
    numeroConsecutivo: invoice.consecutivo,
    fechaEmision: fechaEmisionCR(invoice.fechaEmision),
    emisor: {
      nombre: tenant.name,
      identificacion: { tipo: tipoIdent, numero: cedula12 },
      nombreComercial: tenant.name,
      provincia: config.emisorProvincia,
      canton: config.emisorCanton,
      distrito: config.emisorDistrito,
      ...(config.emisorBarrio ? { barrio: config.emisorBarrio } : {}),
      otrasSenas: tenant.direccion,
      ...(tenant.telefono ? { telefono: tenant.telefono } : {}),
      correos: [tenant.email],
    },
    receptor,
    condicionVenta: "01", // Contado — la factura se emite al facturar; pago posterior en ventanilla/SINPE
    detalle: lineas,
    resumen: {
      codigoTipoMoneda: "CRC",
      tipoCambio: 1,
      totalServGravados: gravado > 0 ? gravado : undefined,
      totalServExentos: exento > 0 ? exento : undefined,
      totalGravado: gravado > 0 ? gravado : undefined,
      totalExento: exento > 0 ? exento : undefined,
      totalVenta: subtotal,
      totalVentaNeta: subtotal,
      ...(gravado > 0 ? { totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: iva }] } : {}),
      totalImpuesto: iva,
      totalComprobante: total,
    },
  };
}

export interface EmitResult {
  success: boolean;
  estado: "EMITIDO" | "ACEPTADO" | "RECHAZADO" | "EN_PROCESO" | "ERROR";
  mensaje?: string;
  clave: string;
  modoFirma?: string;
}

// Ciclo completo: cargar → construir → validar → XML → firmar → guardar → (enviar)
export async function emitirComprobante(
  invoiceId: string,
  opts: { enviar?: boolean } = { enviar: true }
): Promise<EmitResult> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { subscriber: true } });
  if (!invoice) throw new Error("Factura no encontrada");
  if (invoice.tipoComprobante === "NOTA_CREDITO" || invoice.tipoComprobante === "NOTA_DEBITO") {
    throw new Error(`emitirComprobante: ${invoice.tipoComprobante} aún no soportado`);
  }
  if (invoice.xmlFirmado && opts.enviar === false) {
    return { success: true, estado: "EMITIDO", clave: invoice.clave, mensaje: "XML ya emitido" };
  }

  const [tenant, config] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: invoice.tenantId } }),
    prisma.tenantConfig.findUnique({ where: { tenantId: invoice.tenantId } }),
  ]);
  if (!tenant) throw new Error("ASADA no encontrada");
  if (!config) throw new Error("Configuración Hacienda no encontrada");

  const fe = buildFacturaElectronica({ invoice, subscriber: invoice.subscriber, tenant, config });
  const tipo = invoice.tipoComprobante === "FACTURA_ELECTRONICA" ? "FE" : "TE";
  const errores = validarEstructuraFactura(fe, tipo);
  if (errores.length > 0) throw new Error(`XML v4.4 inválido: ${errores.join("; ")}`);

  const xml = tipo === "FE" ? generarXMLFactura(fe) : generarXMLTiquete(fe);
  const firmado = await firmarXML(xml, config.llaveCryptBase64, config.llavePin);
  if (!firmado.success) throw new Error(`Firma falló: ${firmado.error ?? "error desconocido"}`);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { xmlFirmado: firmado.xmlFirmado },
  });

  if (!opts.enviar) {
    return { success: true, estado: "EMITIDO", clave: invoice.clave, modoFirma: firmado.modo, mensaje: "XML firmado y guardado - en cola de envío" };
  }

  const envio = await enviarComprobante(
    invoice.tenantId,
    invoice.clave,
    Buffer.from(firmado.xmlFirmado, "utf8").toString("base64"),
    fe.fechaEmision
  );
  return { ...envio, clave: invoice.clave, modoFirma: firmado.modo };
}
