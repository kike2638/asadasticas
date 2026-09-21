export interface FacturaElectronica {
  numeroConsecutivo: string;
  numeroRef: string;
  fechaEmision: string;
  emisor: {
    nombre: string;
    tipoIdentificacion: string;
    numIdentificacion: string;
    nombreComercial?: string;
    provincia?: string;
    canton?: string;
    distrito?: string;
    direccion?: string;
    telefono?: string;
    correoElectronico?: string;
  };
  receptor: {
    nombre: string;
    tipoIdentificacion: string;
    numIdentificacion: string;
    correoElectronico?: string;
  };
  detalles: {
    numeroLinea: number;
    codigo?: string;
    descripcion: string;
    cantidad: number;
    unidadMedida: string;
    precioUnitario: number;
    montoTotal: number;
    subtotal: number;
    descuento?: number;
    impuesto?: {
      codigo: string;
      tarifa: number;
      monto: number;
    };
  }[];
  resumenTotales: {
    totalExento: number;
    totalGravado: number;
    totalDescuento: number;
    totalVentasNeta: number;
    totalImpuestos: number;
    totalComprobante: number;
  };
  outrosMediosPago?: {
    tipoMedioPago: string;
    monto: number;
    referencia?: string;
  }[];
}

export function generarXMLFactura(factura: FacturaElectronica): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://tribunet.hacienda.go.cr/documentos-electronicos/v4.3/facturaElectronica">
  <Clave>${factura.numeroRef}</Clave>
  <NumeroConsecutivo>${factura.numeroConsecutivo}</NumeroConsecutivo>
  <FechaEmision>${factura.fechaEmision}</FechaEmision>
  <Emisor>
    <Nombre>${xmlEscape(factura.emisor.nombre)}</Nombre>
    <TipoIdentificacion>${factura.emisor.tipoIdentificacion}</TipoIdentificacion>
    <NumIdentificacion>${factura.emisor.numIdentificacion}</NumIdentificacion>
    ${factura.emisor.nombreComercial ? `<NombreComercial>${xmlEscape(factura.emisor.nombreComercial)}</NombreComercial>` : ""}
    <Ubicacion>
      ${factura.emisor.provincia ? `<Provincia>${factura.emisor.provincia}</Provincia>` : ""}
      ${factura.emisor.canton ? `<Canton>${factura.emisor.canton}</Canton>` : ""}
      ${factura.emisor.distrito ? `<Distrito>${factura.emisor.distrito}</Distrito>` : ""}
      ${factura.emisor.direccion ? `<Direccion>${xmlEscape(factura.emisor.direccion)}</Direccion>` : ""}
    </Ubicacion>
    ${factura.emisor.telefono ? `<Telefono><CodigoPais>506</CodigoPais><Numero>${factura.emisor.telefono}</Numero></Telefono>` : ""}
    ${factura.emisor.correoElectronico ? `<CorreoElectronico>${factura.emisor.correoElectronico}</CorreoElectronico>` : ""}
  </Emisor>
  <Receptor>
    <Nombre>${xmlEscape(factura.receptor.nombre)}</Nombre>
    <TipoIdentificacion>${factura.receptor.tipoIdentificacion}</TipoIdentificacion>
    <NumIdentificacion>${factura.receptor.numIdentificacion}</NumIdentificacion>
    ${factura.receptor.correoElectronico ? `<CorreoElectronico>${factura.receptor.correoElectronico}</CorreoElectronico>` : ""}
  </Receptor>
  <Detalles>
${factura.detalles.map(detalle => `    <DetalleLinea>
      <NumeroLinea>${detalle.numeroLinea}</NumeroLinea>
      ${detalle.codigo ? `<Codigo>${detalle.codigo}</Codigo>` : ""}
      <Descripcion>${xmlEscape(detalle.descripcion)}</Descripcion>
      <Cantidad>${detalle.cantidad}</Cantidad>
      <UnidadMedida>${detalle.unidadMedida}</UnidadMedida>
      <PrecioUnitario>${detalle.precioUnitario}</PrecioUnitario>
      <MontoTotal>${detalle.montoTotal}</MontoTotal>
      <SubTotal>${detalle.subtotal}</SubTotal>
      ${detalle.descuento ? `<Descuento><MontoDescuento>${detalle.descuento}</MontoDescuento></Descuento>` : ""}
      ${detalle.impuesto ? `<Impuesto><Codigo>${detalle.impuesto.codigo}</Codigo><Tarifa>${detalle.impuesto.tarifa}</Tarifa><Monto>${detalle.impuesto.monto}</Monto></Impuesto>` : ""}
    </DetalleLinea>`).join("\n")}
  </Detalles>
  <ResumenTotales>
    <TotalExento>${factura.resumenTotales.totalExento}</TotalExento>
    <TotalGravado>${factura.resumenTotales.totalGravado}</TotalGravado>
    <TotalDescuento>${factura.resumenTotales.totalDescuento}</TotalDescuento>
    <TotalVentasNeta>${factura.resumenTotales.totalVentasNeta}</TotalVentasNeta>
    <TotalImpuestos>${factura.resumenTotales.totalImpuestos}</TotalImpuestos>
    <TotalComprobante>${factura.resumenTotales.totalComprobante}</TotalComprobante>
  </ResumenTotales>
  ${factura.outrosMediosPago ? `<OtrosMediosPago>
${factura.outrosMediosPago.map(medio => `    <MedioPago>
      <TipoMedioPago>${medio.tipoMedioPago}</TipoMedioPago>
      <Monto>${medio.monto}</Monto>
      ${medio.referencia ? `<Referencia>${medio.referencia}</Referencia>` : ""}
    </MedioPago>`).join("\n")}
  </OtrosMediosPago>` : ""}
</FacturaElectronica>`;

  return xml;
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function validarEstructuraFactura(factura: FacturaElectronica): string[] {
  const errors: string[] = [];

  if (!factura.numeroConsecutivo || factura.numeroConsecutivo.length !== 20) {
    errors.push("Número consecutivo debe tener 20 dígitos");
  }

  if (!factura.numeroRef || factura.numeroRef.length !== 50) {
    errors.push("Clave debe tener 50 caracteres");
  }

  if (!factura.emisor.nombre) errors.push("Nombre del emisor requerido");
  if (!factura.emisor.numIdentificacion) errors.push("Identificación del emisor requerida");
  if (!factura.receptor.nombre) errors.push("Nombre del receptor requerido");
  if (!factura.receptor.numIdentificacion) errors.push("Identificación del receptor requerida");

  if (factura.detalles.length === 0) {
    errors.push("Debe tener al menos un detalle");
  }

  for (const detalle of factura.detalles) {
    if (detalle.cantidad <= 0) errors.push(`Detalle línea ${detalle.numeroLinea}: cantidad inválida`);
    if (detalle.precioUnitario < 0) errors.push(`Detalle línea ${detalle.numeroLinea}: precio inválido`);
  }

  return errors;
}
