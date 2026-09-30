import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSinpeRef } from "@/lib/sinpe/validator";

export async function GET() {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId } });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, cedulaJuridica: true, slug: true } });
  if (!cfg) return NextResponse.json({ error: "Sin config - complete onboarding" }, { status: 404 });
  // Nunca devolver secretos: solo indicadores de si están configurados
  const { estadoCredenciales } = await import("@/lib/fiscal/credenciales");
  const fiscal = await estadoCredenciales(tenantId);
  return NextResponse.json({
    tenant,
    config: {
      sinpeNumero: cfg.sinpeNumero, sinpeNombre: cfg.sinpeNombre, sinpeBanco: cfg.sinpeBanco,
      sinpeNumero2: cfg.sinpeNumero2, sinpeNombre2: cfg.sinpeNombre2,
      whatsappNumero: (cfg as any).whatsappNumero, whatsappNombre: (cfg as any).whatsappNombre, whatsappPhoneId: (cfg as any).whatsappPhoneId ? "***" : null,
      tprhDomiciliar: cfg.tprhDomiciliar, tprhComercial: cfg.tprhComercial, hidrantesMensual: cfg.hidrantesMensual,
      sucursal: cfg.sucursal, terminal: cfg.terminal, consecutivoTE: cfg.consecutivoTE,
      haciendaUser: cfg.haciendaUser,
      fiscal,
    }
  });
}

export async function PUT(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const role = h.get("x-user-role");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (role !== "ADMIN" && role !== "PLATFORM_OWNER") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await request.json();
  const {
    sinpeNumero,
    sinpeNombre,
    sinpeBanco,
    sinpeNumero2,
    sinpeNombre2,
    whatsappNumero,
    whatsappNombre,
    whatsappPhoneId,
    whatsappToken,
    tprhDomiciliar,
    tprhComercial,
    hidrantesMensual,
    cedulaJuridica,
    tenantName,
    direccion,
    telefono,
    email,
    haciendaUser,
    haciendaPassword,
    haciendaPasswordNew,
    p12Base64,
    p12Pin,
    sucursal,
    terminal,
    codigoActividadEmisor,
    cabysPrincipal,
    emisorProvincia,
    emisorCanton,
    emisorDistrito,
    emisorBarrio,
  } = body;
  if (sinpeNumero) {
    const v = validateSinpeRef(sinpeNumero);
    if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
  }
  if (sinpeNumero2) {
    const v2 = validateSinpeRef(sinpeNumero2);
    if (!v2.valid) return NextResponse.json({ error: `SINPE 2: ${v2.error}` }, { status: 400 });
  }

  const { cifrar } = await import("@/lib/crypto");

  let errores: string[] = [];
  let estadoFiscal: any = {};

  if (p12Base64 || p12Pin) {
    if (!p12Base64 || !p12Pin) errores.push("Para cambiar el certificado P12 debes subir el archivo y el PIN");
    else {
      const { validarP12 } = await import("@/lib/fiscal/p12");
      const v = await validarP12(p12Base64, p12Pin);
      if (!v.ok) errores.push(v.error ?? "P12 inválido");
      else estadoFiscal = v;
    }
  }

  if (haciendaPasswordNew && !haciendaPassword) {
    errores.push("Para cambiar la contraseña de Hacienda debes indicar la contraseña actual o, si no la sabes, bórrala y guárdala de nuevo");
  }

  if (errores.length > 0) return NextResponse.json({ error: errores.join("; ") }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    if (cedulaJuridica || tenantName || direccion || telefono || email) {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          ...(cedulaJuridica !== undefined ? { cedulaJuridica: cedulaJuridica ? cedulaJuridica.replace(/\D/g, "") : null } : {}),
          ...(tenantName !== undefined ? { name: tenantName } : {}),
          ...(direccion !== undefined ? { direccion } : {}),
          ...(telefono !== undefined ? { telefono: telefono ? telefono.replace(/\D/g, "") : null } : {}),
          ...(email !== undefined ? { email: email?.trim() || null } : {}),
        },
      });
    }

    const cfgActual = await tx.tenantConfig.findUnique({ where: { tenantId } });

    return tx.tenantConfig.update({
      where: { tenantId },
      data: {
        ...(sinpeNumero !== undefined ? { sinpeNumero: sinpeNumero ? sinpeNumero.replace(/\D/g, "") : null } : {}),
        ...(sinpeNombre !== undefined ? { sinpeNombre } : {}),
        ...(sinpeBanco !== undefined ? { sinpeBanco } : {}),
        ...(sinpeNumero2 !== undefined ? { sinpeNumero2: sinpeNumero2 ? sinpeNumero2.replace(/\D/g, "") : null } : {}),
        ...(sinpeNombre2 !== undefined ? { sinpeNombre2 } : {}),
        ...(whatsappNumero !== undefined ? { whatsappNumero: whatsappNumero ? whatsappNumero.replace(/\D/g, "") : null } : {}),
        ...(whatsappNombre !== undefined ? { whatsappNombre } : {}),
        ...(whatsappPhoneId !== undefined ? { whatsappPhoneId } : {}),
        ...(whatsappToken ? { whatsappToken: cifrar(whatsappToken, tenantId, "whatsappToken") } : {}),
        ...(tprhDomiciliar !== undefined ? { tprhDomiciliar } : {}),
        ...(tprhComercial !== undefined ? { tprhComercial } : {}),
        ...(hidrantesMensual !== undefined ? { hidrantesMensual } : {}),
        ...(haciendaUser !== undefined ? { haciendaUser } : {}),
        ...(sucursal !== undefined ? { sucursal: String(sucursal).padStart(3, "0").slice(0, 3) } : {}),
        ...(terminal !== undefined ? { terminal: String(terminal).padStart(5, "0").slice(0, 5) } : {}),
        ...(codigoActividadEmisor !== undefined ? { codigoActividadEmisor: String(codigoActividadEmisor).replace(/\D/g, "").slice(0, 6) } : {}),
        ...(cabysPrincipal !== undefined ? { cabysPrincipal: String(cabysPrincipal).replace(/\D/g, "").slice(0, 13) } : {}),
        ...(emisorProvincia !== undefined ? { emisorProvincia: String(emisorProvincia).replace(/\D/g, "").slice(0, 1) } : {}),
        ...(emisorCanton !== undefined ? { emisorCanton: String(emisorCanton).replace(/\D/g, "").slice(0, 2) } : {}),
        ...(emisorDistrito !== undefined ? { emisorDistrito: String(emisorDistrito).replace(/\D/g, "").slice(0, 2) } : {}),
        ...(emisorBarrio !== undefined ? { emisorBarrio: emisorBarrio?.trim() || null } : {}),
        ...(p12Base64 && p12Pin ? { llaveCryptBase64: cifrar(p12Base64, tenantId, "p12"), llavePin: cifrar(p12Pin, tenantId, "pin") } : {}),
        ...(haciendaPassword !== undefined && haciendaPasswordNew
          ? { haciendaPassword: cifrar(haciendaPasswordNew, tenantId, "haciendaPassword") }
          : haciendaPasswordNew && !haciendaPassword && cfgActual?.haciendaPassword === ""
            ? { haciendaPassword: cifrar(haciendaPasswordNew, tenantId, "haciendaPassword") }
            : {}),
      } as any,
    });
  });

  return NextResponse.json({
    success: true,
    config: {
      ...updated,
      p12Configurado: !!updated.llaveCryptBase64,
      p12Valido: estadoFiscal.ok ?? undefined,
      p12CertSubject: estadoFiscal.subject ?? undefined,
      p12CertVence: estadoFiscal.notAfter ?? undefined,
      p12Vencido: estadoFiscal.vencido ?? undefined,
    },
  });
}
