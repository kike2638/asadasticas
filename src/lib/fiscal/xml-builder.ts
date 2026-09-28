// src/lib/fiscal/xml-builder.ts — Comprobantes Hacienda CR v4.4 (obligatoria desde 01/09/2025)
// XSD oficial en src/lib/fiscal/schemas/v4.4/ (tiqueteElectronico.xsd, facturaElectronica.xsd)
// Cambios vs 4.3: namespace cdn, ProveedorSistemas + CodigoActividadEmisor en raíz,
// CondicionVenta en TE, Identificacion anidada, Telefono NumTelefono, Ubicacion OtrasSenas,
// ResumenFactura con CodigoTipoMoneda y MedioPago interno.
// Secuencia obligatoria por LineaDetalle (v4.4): CodigoCABYS(13), SubTotal,
// BaseImponible, Impuesto(1..1000, SIEMPRE), ImpuestoAsumidoEmisorFabrica,
// ImpuestoNeto, MontoTotalLinea. Raíz exige ds:Signature (agregada por signer.ts).

export const NS_V44 = {
  tiquete: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico",
  factura: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
} as const;

export interface Identificacion {
  tipo: string; // 01 Física, 02 Jurídica, 03 DIMEX, 04 NITE, 05 Extranjero
  numero: string;
}

export interface PersonaEmisor {
  nombre: string;
  identificacion: Identificacion;
  nombreComercial?: string;
  provincia: string; // 1 dígito
  canton: string; // 2 dígitos
  distrito: string; // 2 dígitos
  barrio?: string;
  otrasSenas: string; // min 5, obligatorio
  telefono?: string; // 8+ dígitos
  correos: string[]; // 1..4, obligatorio al menos uno
}

export interface PersonaReceptor {
  nombre: string;
  identificacion?: Identificacion;
  nombreComercial?: string;
  provincia?: string;
  canton?: string;
  distrito?: string;
  barrio?: string;
  otrasSenas?: string;
  telefono?: string;
  correoElectronico?: string;
}

export interface LineaDetalle {
  numeroLinea: number;
  codigoCabys?: string; // 13 dígitos — obligatorio en FE/TE (catálogo CAByS)
  codigoComercial?: { tipo: string; codigo: string }[]; // max 5
  cantidad: number;
  unidadMedida: string; // RTC 443: "m³" para metros cúbicos
  unidadMedidaComercial?: string;
  detalle: string;
  precioUnitario: number;
  montoTotal: number;
  descuento?: { monto: number; codigo: string }; // CodigoDescuento requerido si hay monto
  subTotal: number;
  // Si se omite, el builder emite IVA exento por defecto (Codigo 01, TarifaExenta 10, Monto 0):
  // el XSD v4.4 exige Impuesto en TODA línea.
  impuesto?: { codigo: string; codigoTarifaIVA?: string; tarifa?: number; monto: number };
  montoTotalLinea: number;
}

export interface MedioPago {
  tipoMedioPago: string; // 01 Efectivo, 04 Transf, 06 SINPE Móvil, 99 Otros
  medioPagoOtros?: string;
  totalMedioPago?: number; // obligatorio si hay más de un medio
}

export interface ResumenFactura {
  codigoTipoMoneda: string; // "CRC"
  tipoCambio?: number; // default 1
  totalServGravados?: number;
  totalServExentos?: number;
  totalServExonerado?: number;
  totalServNoSujeto?: number;
  totalGravado?: number;
  totalExento?: number;
  totalExonerado?: number;
  totalNoSujeto?: number;
  totalVenta: number;
  totalDescuentos?: number;
  totalVentaNeta: number;
  // Desglose por código de impuesto (v4.4): [ { Codigo, CodigoTarifaIVA?, TotalMontoImpuesto } ]
  totalDesgloseImpuesto?: { codigo: string; codigoTarifaIVA?: string; totalMontoImpuesto: number }[];
  totalImpuesto?: number;
  totalOtrosCargos?: number;
  medioPago?: MedioPago[];
  totalComprobante: number;
}

export interface FacturaElectronica {
  clave: string; // 50 dígitos
  proveedorSistemas: string; // cédula proveedor de sistemas, max 20
  codigoActividadEmisor: string; // 6 dígitos
  numeroConsecutivo: string; // 20 dígitos
  fechaEmision: string; // ISO dateTime
  emisor: PersonaEmisor;
  receptor?: PersonaReceptor; // obligatorio en FE, opcional en TE
  condicionVenta: string; // 01 Contado, 02 Crédito, 06 Arrend.fin, 99 Otros
  condicionVentaOtros?: string;
  plazoCredito?: number; // días
  detalle: LineaDetalle[];
  resumen: ResumenFactura;
}

export function generarXMLTiquete(f: FacturaElectronica): string {
  return buildXML(f, "TiqueteElectronico", NS_V44.tiquete);
}

export function generarXMLFactura(f: FacturaElectronica): string {
  return buildXML(f, "FacturaElectronica", NS_V44.factura);
}

function dinero(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`Monto inválido: ${n}`);
  if (n < 0) throw new Error(`Monto negativo no permitido en Hacienda: ${n}`);
  const s = n.toFixed(5);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

function buildXML(f: FacturaElectronica, tag: string, ns: string): string {
  const emisor = f.emisor;
  const receptor = f.receptor;

  const xmlEmisor = `  <Emisor>
    <Nombre>${xmlEscape(emisor.nombre)}</Nombre>
    <Identificacion>
      <Tipo>${emisor.identificacion.tipo}</Tipo>
      <Numero>${xmlEscape(emisor.identificacion.numero)}</Numero>
    </Identificacion>
    ${emisor.nombreComercial ? `<NombreComercial>${xmlEscape(emisor.nombreComercial)}</NombreComercial>` : ""}
    <Ubicacion>
      <Provincia>${emisor.provincia}</Provincia>
      <Canton>${emisor.canton}</Canton>
      <Distrito>${emisor.distrito}</Distrito>
      ${emisor.barrio ? `<Barrio>${xmlEscape(emisor.barrio)}</Barrio>` : ""}
      <OtrasSenas>${xmlEscape(emisor.otrasSenas)}</OtrasSenas>
    </Ubicacion>
    ${emisor.telefono ? `<Telefono><CodigoPais>506</CodigoPais><NumTelefono>${emisor.telefono.replace(/\D/g, "")}</NumTelefono></Telefono>` : ""}
${emisor.correos.map(c => `    <CorreoElectronico>${xmlEscape(c)}</CorreoElectronico>`).join("\n")}
  </Emisor>`;

  const xmlReceptor = receptor
    ? `  <Receptor>
    <Nombre>${xmlEscape(receptor.nombre)}</Nombre>
    ${receptor.identificacion ? `<Identificacion>
      <Tipo>${receptor.identificacion.tipo}</Tipo>
      <Numero>${xmlEscape(receptor.identificacion.numero)}</Numero>
    </Identificacion>` : ""}
    ${receptor.nombreComercial ? `<NombreComercial>${xmlEscape(receptor.nombreComercial)}</NombreComercial>` : ""}
    ${receptor.provincia && receptor.canton && receptor.distrito && receptor.otrasSenas ? `<Ubicacion>
      <Provincia>${receptor.provincia}</Provincia>
      <Canton>${receptor.canton}</Canton>
      <Distrito>${receptor.distrito}</Distrito>
      ${receptor.barrio ? `<Barrio>${xmlEscape(receptor.barrio)}</Barrio>` : ""}
      <OtrasSenas>${xmlEscape(receptor.otrasSenas)}</OtrasSenas>
    </Ubicacion>` : ""}
    ${receptor.telefono ? `<Telefono><CodigoPais>506</CodigoPais><NumTelefono>${receptor.telefono.replace(/\D/g, "")}</NumTelefono></Telefono>` : ""}
    ${receptor.correoElectronico ? `<CorreoElectronico>${xmlEscape(receptor.correoElectronico)}</CorreoElectronico>` : ""}
  </Receptor>`
    : "";

  const xmlLineas = f.detalle.map(l => {
    // v4.4: Impuesto obligatorio en toda línea; si el caller no lo da, se emite exento.
    const imp = l.impuesto ?? { codigo: "01", codigoTarifaIVA: "10", tarifa: 0, monto: 0 };
    const impuestoNeto = imp.monto; // sin exoneración: Monto del Impuesto
    return `    <LineaDetalle>
      <NumeroLinea>${l.numeroLinea}</NumeroLinea>
      <CodigoCABYS>${l.codigoCabys ?? ""}</CodigoCABYS>
      ${(l.codigoComercial ?? []).map(c => `<CodigoComercial><Tipo>${c.tipo}</Tipo><Codigo>${xmlEscape(c.codigo)}</Codigo></CodigoComercial>`).join("\n      ")}
      <Cantidad>${dinero(l.cantidad)}</Cantidad>
      <UnidadMedida>${xmlEscape(l.unidadMedida)}</UnidadMedida>
      ${l.unidadMedidaComercial ? `<UnidadMedidaComercial>${xmlEscape(l.unidadMedidaComercial)}</UnidadMedidaComercial>` : ""}
      <Detalle>${xmlEscape(l.detalle)}</Detalle>
      <PrecioUnitario>${dinero(l.precioUnitario)}</PrecioUnitario>
      <MontoTotal>${dinero(l.montoTotal)}</MontoTotal>
      ${l.descuento ? `<Descuento><MontoDescuento>${dinero(l.descuento.monto)}</MontoDescuento><CodigoDescuento>${l.descuento.codigo}</CodigoDescuento></Descuento>` : ""}
      <SubTotal>${dinero(l.subTotal)}</SubTotal>
      <BaseImponible>${dinero(l.subTotal)}</BaseImponible>
      <Impuesto><Codigo>${imp.codigo}</Codigo>${imp.codigoTarifaIVA ? `<CodigoTarifaIVA>${imp.codigoTarifaIVA}</CodigoTarifaIVA>` : ""}${imp.tarifa !== undefined ? `<Tarifa>${dinero(imp.tarifa)}</Tarifa>` : ""}<Monto>${dinero(imp.monto)}</Monto></Impuesto>
      <ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>
      <ImpuestoNeto>${dinero(impuestoNeto)}</ImpuestoNeto>
      <MontoTotalLinea>${dinero(l.montoTotalLinea)}</MontoTotalLinea>
    </LineaDetalle>`;
  }).join("\n");

  const r = f.resumen;
  const xmlResumen = `  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${r.codigoTipoMoneda}</CodigoMoneda>
      <TipoCambio>${dinero(r.tipoCambio ?? 1)}</TipoCambio>
    </CodigoTipoMoneda>
    ${r.totalServGravados !== undefined ? `<TotalServGravados>${dinero(r.totalServGravados)}</TotalServGravados>` : ""}
    ${r.totalServExentos !== undefined ? `<TotalServExentos>${dinero(r.totalServExentos)}</TotalServExentos>` : ""}
    ${r.totalServExonerado !== undefined ? `<TotalServExonerado>${dinero(r.totalServExonerado)}</TotalServExonerado>` : ""}
    ${r.totalServNoSujeto !== undefined ? `<TotalServNoSujeto>${dinero(r.totalServNoSujeto)}</TotalServNoSujeto>` : ""}
    ${r.totalGravado !== undefined ? `<TotalGravado>${dinero(r.totalGravado)}</TotalGravado>` : ""}
    ${r.totalExento !== undefined ? `<TotalExento>${dinero(r.totalExento)}</TotalExento>` : ""}
    ${r.totalExonerado !== undefined ? `<TotalExonerado>${dinero(r.totalExonerado)}</TotalExonerado>` : ""}
    ${r.totalNoSujeto !== undefined ? `<TotalNoSujeto>${dinero(r.totalNoSujeto)}</TotalNoSujeto>` : ""}
    <TotalVenta>${dinero(r.totalVenta)}</TotalVenta>
    ${r.totalDescuentos !== undefined ? `<TotalDescuentos>${dinero(r.totalDescuentos)}</TotalDescuentos>` : ""}
    <TotalVentaNeta>${dinero(r.totalVentaNeta)}</TotalVentaNeta>
    ${(r.totalDesgloseImpuesto ?? []).map(d => `<TotalDesgloseImpuesto><Codigo>${d.codigo}</Codigo>${d.codigoTarifaIVA ? `<CodigoTarifaIVA>${d.codigoTarifaIVA}</CodigoTarifaIVA>` : ""}<TotalMontoImpuesto>${dinero(d.totalMontoImpuesto)}</TotalMontoImpuesto></TotalDesgloseImpuesto>`).join("\n    ")}
    ${r.totalImpuesto !== undefined ? `<TotalImpuesto>${dinero(r.totalImpuesto)}</TotalImpuesto>` : ""}
    ${r.totalOtrosCargos !== undefined ? `<TotalOtrosCargos>${dinero(r.totalOtrosCargos)}</TotalOtrosCargos>` : ""}
    ${(r.medioPago ?? []).map(m => `<MedioPago>
      <TipoMedioPago>${m.tipoMedioPago}</TipoMedioPago>
      ${m.medioPagoOtros ? `<MedioPagoOtros>${xmlEscape(m.medioPagoOtros)}</MedioPagoOtros>` : ""}
      ${m.totalMedioPago !== undefined ? `<TotalMedioPago>${dinero(m.totalMedioPago)}</TotalMedioPago>` : ""}
    </MedioPago>`).join("\n    ")}
    <TotalComprobante>${dinero(r.totalComprobante)}</TotalComprobante>
  </ResumenFactura>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<${tag} xmlns="${ns}">
  <Clave>${f.clave}</Clave>
  <ProveedorSistemas>${xmlEscape(f.proveedorSistemas)}</ProveedorSistemas>
  <CodigoActividadEmisor>${f.codigoActividadEmisor}</CodigoActividadEmisor>
  <NumeroConsecutivo>${f.numeroConsecutivo}</NumeroConsecutivo>
  <FechaEmision>${f.fechaEmision}</FechaEmision>
${xmlEmisor}
${receptor ? xmlReceptor + "\n" : ""}  <CondicionVenta>${f.condicionVenta}</CondicionVenta>
  ${f.condicionVenta === "99" && f.condicionVentaOtros ? `<CondicionVentaOtros>${xmlEscape(f.condicionVentaOtros)}</CondicionVentaOtros>` : ""}
  ${f.condicionVenta !== "01" && f.plazoCredito !== undefined ? `<PlazoCredito>${f.plazoCredito}</PlazoCredito>` : ""}
  <DetalleServicio>
${xmlLineas}
  </DetalleServicio>
${xmlResumen}
</${tag}>`;
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function validarEstructuraFactura(f: FacturaElectronica, tipo: "TE" | "FE"): string[] {
  const errors: string[] = [];

  if (!/^\d{50}$/.test(f.clave)) errors.push("Clave debe tener 50 dígitos");
  if (!/^\d{20}$/.test(f.numeroConsecutivo)) errors.push("Consecutivo debe tener 20 dígitos");
  if (!f.proveedorSistemas || f.proveedorSistemas.length > 20) errors.push("ProveedorSistemas requerido (max 20)");
  if (!/^\d{6}$/.test(f.codigoActividadEmisor)) errors.push("CodigoActividadEmisor debe tener 6 dígitos");
  if (!f.condicionVenta) errors.push("CondicionVenta requerido");

  if (!f.emisor.nombre || f.emisor.nombre.length < 5) errors.push("Nombre emisor (min 5) requerido");
  if (!f.emisor.identificacion?.numero) errors.push("Identificación emisor requerida");
  if (f.emisor.correos.length < 1 || f.emisor.correos.length > 4) errors.push("Emisor requiere 1..4 correos");
  if (!f.emisor.otrasSenas || f.emisor.otrasSenas.length < 5) errors.push("OtrasSenas emisor (min 5) requerido");

  if (tipo === "FE" && !f.receptor) errors.push("Receptor obligatorio en Factura Electrónica");
  if (f.receptor?.nombre && f.receptor.nombre.length < 3) errors.push("Nombre receptor (min 3)");

  if (f.detalle.length === 0) errors.push("Debe tener al menos una línea de detalle");
  if (f.detalle.length > 1000) errors.push("Máximo 1000 líneas de detalle");
  for (const l of f.detalle) {
    if (l.cantidad <= 0) errors.push(`Línea ${l.numeroLinea}: cantidad inválida`);
    if (!l.codigoCabys || !/^\d{13}$/.test(l.codigoCabys)) errors.push(`Línea ${l.numeroLinea}: CodigoCABYS debe tener 13 dígitos (obligatorio v4.4)`);
    if (l.precioUnitario < 0) errors.push(`Línea ${l.numeroLinea}: precio inválido`);
    if (l.montoTotalLinea < 0) errors.push(`Línea ${l.numeroLinea}: montoTotalLinea inválido`);
    if (l.descuento && !l.descuento.codigo) errors.push(`Línea ${l.numeroLinea}: descuento requiere CodigoDescuento`);
    if (l.impuesto && l.impuesto.codigo === "01" && l.impuesto.tarifa !== undefined && !l.impuesto.codigoTarifaIVA) {
      errors.push(`Línea ${l.numeroLinea}: IVA con tarifa requiere CodigoTarifaIVA`);
    }
    const impNeto = l.impuesto?.monto ?? 0;
    if (Math.abs(l.montoTotalLinea - (l.subTotal + impNeto)) > 0.02) {
      errors.push(`Línea ${l.numeroLinea}: MontoTotalLinea ≠ SubTotal + ImpuestoNeto`);
    }
  }

  const r = f.resumen;
  if (r.totalVenta < 0 || r.totalVentaNeta < 0 || r.totalComprobante < 0) errors.push("Totales no pueden ser negativos");
  if (Math.abs(r.totalVentaNeta - (r.totalVenta - (r.totalDescuentos ?? 0))) > 0.02) {
    errors.push("TotalVentaNeta ≠ TotalVenta − TotalDescuentos");
  }

  return errors;
}
