// src/lib/crypto.test.ts - Ejecutar: npm test
// Cifrado de secretos: aislamiento por ASADA, autenticación y migración de legacy
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cifrar, descifrar, esCifradoGCM, descifrarLegacyCbc, huella } from "./crypto";

const MASTER_PREVIO = process.env.MASTER_KEY;
const KEY = "a".repeat(64);

beforeAll(() => { process.env.MASTER_KEY = KEY; });
afterAll(() => { if (MASTER_PREVIO === undefined) delete process.env.MASTER_KEY; else process.env.MASTER_KEY = MASTER_PREVIO; });

const T1 = "tenant-asanrafael";
const T2 = "tenant-asodavalle";

describe("cifrado de secretos", () => {
  it("ida y vuelta con AES-256-GCM", () => {
    const c = cifrar("MIIabc==contenido", T1, "p12");
    expect(esCifradoGCM(c)).toBe(true);
    expect(descifrar(c, T1, "p12")).toBe("MIIabc==contenido");
  });

  it("el mismo texto en dos ASADAS produce ciphertext distinto (claves distintas)", () => {
    const a = cifrar("PIN-1234", T1, "pin");
    const b = cifrar("PIN-1234", T2, "pin");
    expect(a).not.toBe(b);
    expect(descifrar(a, T1, "pin")).toBe("PIN-1234");
    expect(descifrar(b, T2, "pin")).toBe("PIN-1234");
  });

  it("el mismo texto en dos campos distintos no es intercambiable", () => {
    const pin = cifrar("secreto", T1, "pin");
    const pass = cifrar("secreto", T1, "haciendaPassword");
    expect(() => descifrar(pin, T1, "haciendaPassword")).toThrow();
  });

  it("un secreto copiado a otra ASADA no descifra", () => {
    const c = cifrar("llave-privada", T1, "p12");
    expect(() => descifrar(c, T2, "p12")).toThrow(/alterado|no pertenece/);
  });

  it("detecta manipulación del ciphertext (autenticado)", () => {
    const c = cifrar("valor-importante", T1, "p12");
    const partes = c.split(":");
    // altera un byte del texto cifrado
    partes[3] = Buffer.from("X" + Buffer.from(partes[3], "base64").subarray(1).toString("base64")).toString("base64");
    expect(() => descifrar(partes.join(":"), T1, "p12")).toThrow();
  });

  it("detecta manipulación de la etiqueta de autenticación", () => {
    const c = cifrar("valor", T1, "pin").split(":");
    c[1] = Buffer.from(Buffer.from(c[1], "base64").map((b, i) => (i === 0 ? b ^ 0xff : b))).toString("base64");
    expect(() => descifrar(c.join(":"), T1, "pin")).toThrow();
  });

  it("el IV aleatorio hace que dos cifrados del mismo valor difieran", () => {
    expect(cifrar("igual", T1, "pin")).not.toBe(cifrar("igual", T1, "pin"));
  });

  it("valores vacíos se manejan sin cifrar", () => {
    expect(cifrar("", T1, "pin")).toBe("");
    expect(descifrar("", T1, "pin")).toBe("");
  });

  it("rechaza formato corrupto", () => {
    expect(() => descifrar("v1:solo:dos", T1, "pin")).toThrow(/corrupto/);
  });

  it("lee secretos legacy (CBC) y los migra a GCM", () => {
    const crypto = require("crypto");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY, "hex"), iv);
    const legacy = iv.toString("hex") + ":" + Buffer.concat([cipher.update("1234", "utf8"), cipher.final()]).toString("hex");
    expect(esCifradoGCM(legacy)).toBe(false);
    expect(descifrarLegacyCbc(legacy)).toBe("1234");
    // descifrar() detecta el legacy y lo devuelve sin intervenção
    expect(descifrar(legacy, T1, "pin")).toBe("1234");
    // ...y al re-cifrar queda en GCM
    expect(esCifradoGCM(cifrar(descifrar(legacy, T1, "pin"), T1, "pin"))).toBe(true);
  });

  it("huella es estable y no revela el valor", () => {
    const h = huella("1234");
    expect(h).toBe(huella("1234"));
    expect(h).not.toBe(huella("1235"));
    expect(h).not.toContain("1234");
  });

  it("exige MASTER_KEY de 32 bytes", () => {
    const previo = process.env.MASTER_KEY;
    process.env.MASTER_KEY = "corto";
    expect(() => cifrar("x", T1, "pin")).toThrow(/32 bytes/);
    delete process.env.MASTER_KEY;
    expect(() => cifrar("x", T1, "pin")).toThrow(/MASTER_KEY/);
    process.env.MASTER_KEY = previo;
  });
});
