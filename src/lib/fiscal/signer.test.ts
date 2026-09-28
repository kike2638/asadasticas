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
