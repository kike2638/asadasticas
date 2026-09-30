// src/lib/fiscal/p12.test.ts - Ejecutar: npm test
// Validación del P12 al subirlo: confirmar antes de guardar es lo que evita
// descubrir un PIN mal en el momento de facturar.
import { describe, it, expect } from "vitest";
import { validarP12, abrirP12 } from "./p12";

async function generarP12(pin: string, cn = "ASADA Prueba") {
  // @ts-ignore
  const forge: any = (await import("node-forge")).default;
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01T00:00:00Z");
  cert.validity.notAfter = new Date("2027-01-01T00:00:00Z");
  const attrs = [{ name: "commonName", value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, pin);
  return forge.util.encode64(forge.asn1.toDer(asn1).getBytes());
}

describe("validarP12", () => {
  it("acepta un P12 con el PIN correcto y devuelve datos del certificado", async () => {
    const p12 = await generarP12("1234", "ASADA San Rafael");
    const r = await validarP12(p12, "1234");
    expect(r.ok).toBe(true);
    expect(r.subject).toContain("ASADA San Rafael");
    expect(r.notAfter).toBeTruthy();
    expect(r.vencido).toBe(false);
    expect(r.fingerprint).toBeTruthy();
  });

  it("rechaza PIN incorrecto con mensaje claro", async () => {
    const p12 = await generarP12("1234");
    const r = await validarP12(p12, "9999");
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rechaza datos que no son base64", async () => {
    const r = await validarP12("esto no es base64 @@@", "1234");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/base64|P12/);
  });

  it("rechaza placeholders y archivos demasiado chicos", async () => {
    expect((await validarP12("placeholder-base64-key", "1234")).ok).toBe(false);
    expect((await validarP12("", "1234")).ok).toBe(false);
    expect((await validarP12("QUJD", "1234")).ok).toBe(false);
  });

  it("marca un certificado vencido", async () => {
    // @ts-ignore
    const forge: any = (await import("node-forge")).default;
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date("2020-01-01T00:00:00Z");
    cert.validity.notAfter = new Date("2021-01-01T00:00:00Z");
    const attrs = [{ name: "commonName", value: "ASADA Vencida" }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12 = forge.util.encode64(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, "1234")).getBytes());
    const r = await validarP12(p12, "1234");
    expect(r.ok).toBe(true);
    expect(r.vencido).toBe(true);
  });

  it("abrirP12 devuelve llave privada y certificado", async () => {
    const p12 = await generarP12("1234");
    const abierto = await abrirP12(p12, "1234");
    expect(abierto.privateKey).toBeTruthy();
    expect(abierto.cert).toBeTruthy();
    expect(abierto.huellaLlave).toMatch(/^[0-9a-f]{16}$/);
  });

  it("tolera espacios y saltos de línea (P12 copiado como texto)", async () => {
    const p12 = await generarP12("1234");
    const conSaltos = p12.replace(/(.{64})/g, "$1\n");
    expect((await validarP12(conSaltos, "1234")).ok).toBe(true);
  });
});
