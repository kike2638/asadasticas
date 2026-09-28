// Genera XML de ejemplo (TE y FE) v4.4 para validar contra los XSD oficiales.
// Uso: npx tsx scripts/fiscal-sample.ts [ruta-salida]
import fs from "fs";
import path from "path";
import { generarXMLTiquete, generarXMLFactura, type FacturaElectronica } from "../src/lib/fiscal/xml-builder";

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

// ds:Signature es obligatorio en la raíz (XSD minOccurs=1). Para validar la estructura
// sin firma criptográfica se inserta una Signature esquemáticamente válida (dummy).
const SIGNATURE_DUMMY =
  '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">' +
  "<SignedInfo>" +
  '<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>' +
  '<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>' +
  '<Reference URI="">' +
  '<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms>' +
  '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>' +
  "<DigestValue>AAAA</DigestValue>" +
  "</Reference>" +
  "</SignedInfo>" +
  "<SignatureValue>AAAA</SignatureValue>" +
  "</Signature>";

function conSignature(xml: string): string {
  return xml.replace(/<\/(TiqueteElectronico|FacturaElectronica)>$/, (_c, tag: string) => `  ${SIGNATURE_DUMMY}\n</${tag}>`);
}

const salida = process.argv[2] ?? path.join(process.cwd(), ".tmp-fiscal");
fs.mkdirSync(salida, { recursive: true });
fs.writeFileSync(path.join(salida, "tiquete-v44.xml"), conSignature(generarXMLTiquete(base)), "utf8");
fs.writeFileSync(path.join(salida, "factura-v44.xml"), conSignature(generarXMLFactura(base)), "utf8");
console.log(`XML v4.4 generados en ${salida}`);
