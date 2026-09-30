// src/lib/crypto.ts - Cifrado de secretos (llaves P12, PIN, contraseñas, tokens)
//
// AES-256-GCM con clave de datos derivada por HKDF-SHA256 desde MASTER_KEY:
//   key_datos = HKDF(MASTER_KEY, salt=tenantId, info="asadas-erp:v1:<campo>")
//
// Consecuencias de diseño:
//  - Cifrado AUTENTICADO: cualquier bit alterado en el ciphertext hace fallar el descifrado.
//  - Aislamiento por ASADA y por campo: el mismo PIN en dos ASADAS produce dos claves distintas,
//    y un ciphertext copiado a otra fila (otro tenant u otro campo) NO descifra.
//  - AAD = "<tenantId>:<campo>": el cifrado queda atado a su destino, no se puede mover de fila.
//  - Formato versionado "v1:<tag>:<iv>:<ct>" (base64) para poder migrar sin ambigüedad.
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = "v1";
const INFO = "asadas-erp";

function masterKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (!raw) {
    throw new Error(
      "MASTER_KEY no está definida. Genera una con: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== 32) {
    throw new Error(`MASTER_KEY inválida: ${key.length} bytes. Se requieren 32 bytes (64 caracteres hex).`);
  }
  return key;
}

function dataKey(tenantId: string, campo: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      masterKey(),
      Buffer.from(tenantId, "utf8"),
      Buffer.from(`${INFO}:${VERSION}:${campo}`, "utf8"),
      32
    )
  );
}

function aad(tenantId: string, campo: string): Buffer {
  return Buffer.from(`${tenantId}:${campo}`, "utf8");
}

export function esCifradoGCM(valor: string | null | undefined): boolean {
  return !!valor && valor.startsWith(`${VERSION}:`);
}

/** Cifra un secreto. Mismo valor + mismo tenant + mismo campo => ciphertext distinto (IV aleatorio). */
export function cifrar(valor: string, tenantId: string, campo: string): string {
  if (!valor) return "";
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, dataKey(tenantId, campo), iv, { authTagLength: TAG_LEN });
  cipher.setAAD(aad(tenantId, campo));
  const ct = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
  return [VERSION, cipher.getAuthTag().toString("base64"), iv.toString("base64"), ct.toString("base64")].join(":");
}

/** Descifra un secreto. Lanza error si el ciphertext fue alterado o no pertenece a ese tenant/campo. */
export function descifrar(valor: string, tenantId: string, campo: string): string {
  if (!valor) return "";
  // Valores antiguos (AES-256-CBC sin autenticar) se siguen leyendo para poder migrarlos
  if (!esCifradoGCM(valor)) return descifrarLegacyCbc(valor);
  const partes = valor.split(":");
  if (partes.length !== 4) throw new Error(`Secreto corrupto (${campo}): formato inesperado`);
  const decipher = crypto.createDecipheriv(ALGO, dataKey(tenantId, campo), Buffer.from(partes[2], "base64"), {
    authTagLength: TAG_LEN,
  });
  decipher.setAAD(aad(tenantId, campo));
  decipher.setAuthTag(Buffer.from(partes[1], "base64"));
  try {
    return Buffer.concat([decipher.update(Buffer.from(partes[3], "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error(
      `No se pudo descifrar el secreto "${campo}": fue alterado o no pertenece a esta ASADA (MASTER_KEY distinta?)`
    );
  }
}

// --- Legacy: AES-256-CBC "ivHex:ctHex" (versión anterior, sin autenticación) ---
// Solo lectura; existe para descifrar lo ya guardado y re-cifrarlo con GCM.
export function descifrarLegacyCbc(valor: string): string {
  const partes = valor.split(":");
  if (partes.length !== 2) throw new Error("Secreto legacy con formato desconocido");
  const decipher = crypto.createDecipheriv("aes-256-cbc", masterKey(), Buffer.from(partes[0], "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(partes[1], "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// Huella no reversible para verificar un secreto sin exponerlo (ej. confirmar que el PIN guardado es el mismo)
export function huella(valor: string): string {
  return crypto.createHmac("sha256", masterKey()).update(valor, "utf8").digest("hex").slice(0, 16);
}
