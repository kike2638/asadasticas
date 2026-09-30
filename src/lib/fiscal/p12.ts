// src/lib/fiscal/p12.ts - Apertura y validación del certificado .p12/.pfx de Hacienda
// El mismo código sirve para validar el P12 al subirlo (error de PIN inmediato) y para firmar.
export interface P12Abierto {
  privateKey: any;
  cert: any;
  subject: string;
  notBefore?: string;
  notAfter?: string;
  /** Hash SHA-256 de la llave privada: permite detectar que se cambió el certificado sin mostrarlo */
  huellaLlave: string;
}

async function forge(): Promise<any> {
  // @ts-ignore - dependencia opcional en tiempo de ejecución
  const mod: any = await import("node-forge");
  return mod.default ?? mod; // CJS (tsx/node) vs ESM (vitest)
}

/** Abre el P12 con el PIN. Lanza error con mensaje claro si el PIN es incorrecto o el archivo no sirve. */
export async function abrirP12(p12Base64: string, pin: string): Promise<P12Abierto> {
  if (!p12Base64) throw new Error("No se indicó el archivo .p12");
  const saneado = p12Base64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(saneado)) throw new Error("El archivo no es base64 válido (P12/PFX)");
  // "placeholder" o datos de prueba no son un certificado
  if (saneado.startsWith("placeholder") || saneado.length < 100) throw new Error("El archivo no parece un P12 real");

  const f = await forge();
  const p12 = f.pkcs12.pkcs12FromAsn1(f.asn1.fromDer(Buffer.from(saneado, "base64").toString("binary")), pin);

  const cert = p12.getBags({ bagType: f.pki.oids.certBag })[f.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error("El P12 no contiene un certificado");
  const key =
    p12.getBags({ bagType: f.pki.oids.pkcs8ShroudedKeyBag })[f.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key ??
    p12.getBags({ bagType: f.pki.oids.keyBag })[f.pki.oids.keyBag]?.[0]?.key;
  if (!key) throw new Error("El P12 no contiene llave privada");

  const modulus = key.n?.toString(16) ?? "";
  return {
    privateKey: key,
    cert,
    subject: cert.subject?.attributes?.map((a: any) => `${a.shortName ?? a.name}=${a.value}`).join(", ") ?? "",
    notBefore: cert.validity?.notBefore?.toISOString?.(),
    notAfter: cert.validity?.notAfter?.toISOString?.(),
    huellaLlave: f.md.sha256.create().update(modulus, "binary").digest().bytes().length
      ? Buffer.from(f.md.sha256.create().update(modulus, "binary").digest().bytes()).toString("hex").slice(0, 16)
      : "",
  };
}

export interface ResultadoValidacionP12 {
  ok: boolean;
  error?: string;
  subject?: string;
  notBefore?: string;
  notAfter?: string;
  vencido?: boolean;
  fingerprint?: string;
}

/** Validación de usuario: confirma PIN, certificado y vigencia antes de guardar nada. */
export async function validarP12(p12Base64: string, pin: string): Promise<ResultadoValidacionP12> {
  try {
    const abierto = await abrirP12(p12Base64, pin);
    const f = await forge();
    const der = f.asn1.toDer(f.pki.certificateToAsn1(abierto.cert)).getBytes();
    const fingerprint = f.util.encode64(f.md.sha1.create().update(der, "binary").digest().bytes());
    const vencido = abierto.notAfter ? new Date(abierto.notAfter) < new Date() : false;
    return {
      ok: true,
      subject: abierto.subject,
      notBefore: abierto.notBefore,
      notAfter: abierto.notAfter,
      vencido,
      fingerprint,
    };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return {
      ok: false,
      error: /password|invalid password|PKCS#12|pkcs12/i.test(msg)
        ? "PIN incorrecto para ese P12"
        : /base64|P12|PFX|malformed|too few|not a valid/i.test(msg)
          ? "El archivo no es un P12 válido"
          : msg,
    };
  }
}
