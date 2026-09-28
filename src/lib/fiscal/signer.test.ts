// src/lib/fiscal/signer.test.ts - Ejecutar: npm test
// La firma (modo simulado) debe producir xs:base64Binary válido para el XSD Hacienda
import { describe, it, expect } from "vitest";
import { firmarXML, isModoProduccion } from "./signer";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico">
  <Clave>50627092600300208765400101000000010000004112345671</Clave>
</TiqueteElectronico>`;

const estrictoB64 = /^[A-Za-z0-9+/]+={0,2}$/;

describe("firmarXML - modo simulado (sin P12)", () => {
  it("inserta Signature antes del cierre de la raíz", async () => {
    const r = await firmarXML(XML, "placeholder-test", "1234");
    expect(r.success).toBe(true);
    expect(r.modo).toBe("simulado");
    expect(r.xmlFirmado).toContain("</Clave>");
    expect(r.xmlFirmado).toMatch(/<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#"/);
    expect(r.xmlFirmado.indexOf("<Signature")).toBeLessThan(r.xmlFirmado.indexOf("</TiqueteElectronico>"));
  });

  it("DigestValue, SignatureValue y X509Certificate son base64 estricto (xs:base64Binary)", async () => {
    const r = await firmarXML(XML, "placeholder-test", "1234");
    const dig = r.xmlFirmado.match(/<DigestValue>([^<]+)<\/DigestValue>/)?.[1];
    const sig = r.xmlFirmado.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)?.[1];
    const cert = r.xmlFirmado.match(/<X509Certificate>([^<]+)<\/X509Certificate>/)?.[1];
    expect(dig).toBeTruthy();
    expect(sig).toBeTruthy();
    expect(cert).toBeTruthy();
    expect(estrictoB64.test(dig!)).toBe(true);
    expect(estrictoB64.test(sig!)).toBe(true);
    expect(estrictoB64.test(cert!)).toBe(true);
  });

  it("SignedInfo incluye CanonicalizationMethod y SignatureMethod obligatorios", async () => {
    const r = await firmarXML(XML, "placeholder-test", "1234");
    expect(r.xmlFirmado).toContain("<CanonicalizationMethod Algorithm=");
    expect(r.xmlFirmado).toContain("<SignatureMethod Algorithm=");
    expect(r.xmlFirmado).toContain("<DigestMethod Algorithm=");
  });
});

describe("isModoProduccion", () => {
  it("placeholder no es producción", () => {
    expect(isModoProduccion("placeholder-base64-k")).toBe(false);
    expect(isModoProduccion("")).toBe(false);
  });
});

// --- Firma real: P12 de prueba generado en memoria, verificación criptográfica completa ---
async function generarP12DePrueba(): Promise<{ p12b64: string; cert: any }> {
  // @ts-ignore - node-forge es dependencia real
  const forge: any = await import("node-forge");
  const keys = forge.pki.rsa.generateKeyPair(1024); // 1024 solo para el test (más rápido)
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01T00:00:00Z");
  cert.validity.notAfter = new Date("2027-01-01T00:00:00Z");
  const attrs = [{ name: "commonName", value: "ASADA Prueba Firma" }, { name: "organizationName", value: "Test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, "pin123");
  return { p12b64: forge.util.encode64(forge.asn1.toDer(p12Asn1).getBytes()), cert };
}

describe("firmarXML - modo real (P12)", () => {
  it("firma con RSA-SHA256 verificable y digest = sha256(C14N(doc))", async () => {
    const { c14n } = await import("./c14n");
    // @ts-ignore - node-forge
    const forge: any = await import("node-forge");
    const { p12b64, cert } = await generarP12DePrueba();

    const r = await firmarXML(XML, p12b64, "pin123");
    expect(r.success).toBe(true);
    expect(r.modo).toBe("real");
    expect(r.certInfo?.subject).toContain("ASADA Prueba Firma");

    // 1) DigestValue = SHA-256 del documento canonicalizado
    const dig = r.xmlFirmado.match(/<DigestValue>([^<]+)<\/DigestValue>/)?.[1]!;
    const mdDoc = forge.md.sha256.create();
    mdDoc.update(c14n(XML), "utf8");
    expect(dig).toBe(forge.util.encode64(mdDoc.digest().bytes()));

    // 2) SignatureValue = firma RSA sobre SignedInfo canonicalizado
    const siStart = r.xmlFirmado.indexOf("<SignedInfo");
    const siEnd = r.xmlFirmado.indexOf("</SignedInfo>") + "</SignedInfo>".length;
    const signedInfoExtraido = r.xmlFirmado.slice(siStart, siEnd);
    const mdSi = forge.md.sha256.create();
    mdSi.update(c14n(signedInfoExtraido), "utf8");
    const sigBytes = Buffer.from(
      r.xmlFirmado.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)?.[1]!,
      "base64"
    ).toString("binary");
    expect(cert.publicKey.verify(mdSi.digest().bytes(), sigBytes)).toBe(true);

    // 3) Una firma ajena NO verifica con nuestra clave
    const mdFalso = forge.md.sha256.create();
    mdFalso.update("otro documento", "utf8");
    expect(cert.publicKey.verify(mdFalso.digest().bytes(), sigBytes)).toBe(false);
  });

  it("enveloped exacto: quitar <Signature> devuelve el XML original byte a byte", async () => {
    const { p12b64 } = await generarP12DePrueba();
    const r = await firmarXML(XML, p12b64, "pin123");
    const ini = r.xmlFirmado.indexOf("<Signature ");
    const fin = r.xmlFirmado.indexOf("</Signature>") + "</Signature>".length;
    expect(ini).toBeGreaterThan(0);
    const reconstruido = r.xmlFirmado.slice(0, ini) + r.xmlFirmado.slice(fin);
    expect(reconstruido).toBe(XML); // sin whitespace extra => digest de Hacienda coincide
  });

  it("incluye XAdES QualifyingProperties con SigningTime", async () => {
    const { p12b64 } = await generarP12DePrueba();
    const r = await firmarXML(XML, p12b64, "pin123");
    expect(r.xmlFirmado).toContain('<QualifyingProperties xmlns="http://uri.etsi.org/01903/v1.3.2#"');
    expect(r.xmlFirmado).toMatch(/<SigningTime>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z<\/SigningTime>/);
  });

  it("PIN incorrecto devuelve error claro (no firma simulada)", async () => {
    const { p12b64 } = await generarP12DePrueba();
    const r = await firmarXML(XML, p12b64, "pin-equivocado");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/P12|PIN|pkcs12/i);
    expect(r.xmlFirmado).not.toContain("<Signature ");
  });
});
