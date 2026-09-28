// src/lib/fiscal/signer.ts - Firma XAdES-BES Hacienda CR
// Real: C14N 1.0 del documento -> digest SHA-256 -> RSA-SHA256 con la llave del P12 -> XAdES (SigningTime).
// Simulado (sin P12): solo en desarrollo, estructura válida pero sin valor criptográfico.
// La Signature se inserta SIN whitespace adicional => el transform enveloped-signature
// de Hacienda reproduce exactamente el documento canónico que firmamos.
import { decrypt } from "@/lib/crypto";
import { c14n } from "./c14n";

export interface SignResult {
  xmlFirmado: string;
  success: boolean;
  error?: string;
  modo: "real" | "simulado";
  certInfo?: { subject?: string; validFrom?: string; validTo?: string };
}

const NS_DS = "http://www.w3.org/2000/09/xmldsig#";
const ALG_C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const ALG_RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const ALG_SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
const ALG_SHA1 = "http://www.w3.org/2000/09/xmldsig#sha1";
const ALG_ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

function construirSignedInfo(digestValue: string): string {
  return (
    `<SignedInfo xmlns="${NS_DS}">` +
    `<CanonicalizationMethod Algorithm="${ALG_C14N}"/>` +
    `<SignatureMethod Algorithm="${ALG_RSA_SHA256}"/>` +
    `<Reference URI="">` +
    `<Transforms><Transform Algorithm="${ALG_ENVELOPED}"/></Transforms>` +
    `<DigestMethod Algorithm="${ALG_SHA256}"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`
  );
}

// Inserta inmediatamente antes del cierre raíz, sin espacios ni saltos:
// enveloped-signature( XML_con_firma ) === XML_sin_firma  => digest verificable
function insertarSignature(xml: string, tag: string, signature: string): string {
  const cierre = `</${tag}>`;
  if (!xml.endsWith(cierre)) throw new Error(`XML no termina con ${cierre}`);
  return xml.slice(0, -cierre.length) + signature + cierre;
}

export async function firmarXML(
  xmlSinFirmar: string,
  llaveBase64: string,
  pinEncriptado: string
): Promise<SignResult> {
  let pin: string;
  try { pin = decrypt(pinEncriptado); } catch { pin = pinEncriptado; }

  const tag = xmlSinFirmar.includes("<TiqueteElectronico") ? "TiqueteElectronico" : "FacturaElectronica";
  const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");

  // --- Modo desarrollo: sin P12 real ---
  if (!llaveBase64 || llaveBase64.startsWith("placeholder")) {
    const sigId = `xmldsig-${Date.now()}`;
    const signedInfo = construirSignedInfo(b64(`${pin}:${sigId}`));
    const signature =
      `<Signature xmlns="${NS_DS}" Id="${sigId}">${signedInfo}` +
      `<SignatureValue>${b64("MODO_DESARROLLO_SIN_P12")}</SignatureValue>` +
      `<KeyInfo><X509Data><X509Certificate>${b64("CERTIFICADO_SIMULADO")}</X509Certificate></X509Data></KeyInfo>` +
      `<Object><QualifyingProperties xmlns="http://uri.etsi.org/01903/v1.3.2#" Target="#${sigId}">` +
      `<SignedProperties Id="${sigId}-signedprops"><SignedSignatureProperties>` +
      `<SigningTime>${new Date().toISOString()}</SigningTime>` +
      `</SignedSignatureProperties></SignedProperties></QualifyingProperties></Object>` +
      `</Signature>`;
    return { success: true, modo: "simulado", xmlFirmado: insertarSignature(xmlSinFirmar, tag, signature) };
  }

  // --- Modo real: P12 + node-forge ---
  try {
    // @ts-ignore - dependencia opcional en tiempo de ejecución
    const mod: any = await import("node-forge");
    const forge: any = mod.default ?? mod; // CJS via tsx vs ESM via vitest
    const p12Der = Buffer.from(llaveBase64, "base64").toString("binary");
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), pin);

    const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const cert = certs[0]?.cert;
    if (!cert) throw new Error("El P12 no contiene certificado");
    const key =
      p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0]?.key;
    if (!key) throw new Error("El P12 no contiene llave privada (o PIN incorrecto)");

    // 1) Digest SHA-256 del documento canonicalizado (C14N 1.0, sin Signature)
    const docC14n = c14n(xmlSinFirmar);
    const mdDoc = forge.md.sha256.create();
    mdDoc.update(docC14n, "utf8");
    const digestValue = forge.util.encode64(mdDoc.digest().bytes());

    // 2) Firma RSA-SHA256 sobre SignedInfo canonicalizado
    const signedInfo = construirSignedInfo(digestValue);
    const mdSi = forge.md.sha256.create();
    mdSi.update(c14n(signedInfo), "utf8");
    const signatureValue = forge.util.encode64(key.sign(mdSi));

    // 3) Certificado + XAdES (SigningTime, digest SHA-1 del cert en SignedCertificate)
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const cert64 = forge.util.encode64(certDer);
    const certDigest = forge.util.encode64(forge.md.sha1.create().update(certDer, "binary").digest().bytes());
    const sigId = `xmldsig-${Date.now()}`;
    const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const subject = cert.subject?.attributes?.map((a: any) => `${a.shortName}=${a.value}`).join(", ");

    const signature =
      `<Signature xmlns="${NS_DS}" Id="${sigId}">${signedInfo}` +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo><X509Data><X509Certificate>${cert64}</X509Certificate></X509Data></KeyInfo>` +
      `<Object><QualifyingProperties xmlns="http://uri.etsi.org/01903/v1.3.2#" Target="#${sigId}">` +
      `<SignedProperties Id="${sigId}-signedprops"><SignedSignatureProperties>` +
      `<SigningTime>${signingTime}</SigningTime>` +
      `<SignedCertificate><Digest><DigestMethod Algorithm="${ALG_SHA1}"/><DigestValue>${certDigest}</DigestValue></Digest></SignedCertificate>` +
      `</SignedSignatureProperties></SignedProperties></QualifyingProperties></Object>` +
      `</Signature>`;

    return {
      success: true,
      modo: "real",
      certInfo: { subject, validFrom: cert.validity?.notBefore?.toISOString?.(), validTo: cert.validity?.notAfter?.toISOString?.() },
      xmlFirmado: insertarSignature(xmlSinFirmar, tag, signature),
    };
  } catch (e: any) {
    return {
      success: false,
      modo: "real",
      xmlFirmado: xmlSinFirmar,
      error: `Firma con P12 falló: ${e?.message ?? e}`,
    };
  }
}

export function isModoProduccion(llaveBase64: string): boolean {
  return !!llaveBase64 && !llaveBase64.startsWith("placeholder") && llaveBase64.length > 500;
}
