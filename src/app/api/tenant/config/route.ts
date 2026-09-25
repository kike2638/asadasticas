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
  // No exponer llaves
  return NextResponse.json({
    tenant,
    config: {
      sinpeNumero: cfg.sinpeNumero, sinpeNombre: cfg.sinpeNombre, sinpeBanco: cfg.sinpeBanco,
      sinpeNumero2: cfg.sinpeNumero2, sinpeNombre2: cfg.sinpeNombre2,
      whatsappNumero: (cfg as any).whatsappNumero, whatsappNombre: (cfg as any).whatsappNombre, whatsappPhoneId: (cfg as any).whatsappPhoneId ? "***" : null,
      tprhDomiciliar: cfg.tprhDomiciliar, tprhComercial: cfg.tprhComercial, hidrantesMensual: cfg.hidrantesMensual,
      sucursal: cfg.sucursal, terminal: cfg.terminal, consecutivoTE: cfg.consecutivoTE,
      haciendaUser: cfg.haciendaUser,
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
  const { sinpeNumero, sinpeNombre, sinpeBanco, sinpeNumero2, sinpeNombre2, whatsappNumero, whatsappNombre, whatsappPhoneId, whatsappToken, tprhDomiciliar, tprhComercial, hidrantesMensual, cedulaJuridica, tenantName } = body;

  if (sinpeNumero) {
    const v = validateSinpeRef(sinpeNumero);
    if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
  }
  if (sinpeNumero2) {
    const v2 = validateSinpeRef(sinpeNumero2);
    if (!v2.valid) return NextResponse.json({ error: `SINPE 2: ${v2.error}` }, { status: 400 });
  }

  const { encrypt } = await import("@/lib/crypto");
  const updated = await prisma.$transaction(async (tx) => {
    if (cedulaJuridica || tenantName) {
      await tx.tenant.update({ where: { id: tenantId }, data: { ...(cedulaJuridica ? { cedulaJuridica: cedulaJuridica.replace(/\D/g, "") } : {}), ...(tenantName ? { name: tenantName } : {}) } });
    }
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
        ...(whatsappToken ? { whatsappToken: encrypt(whatsappToken) } : {}),
        ...(tprhDomiciliar !== undefined ? { tprhDomiciliar } : {}),
        ...(tprhComercial !== undefined ? { tprhComercial } : {}),
        ...(hidrantesMensual !== undefined ? { hidrantesMensual } : {}),
      } as any
    });
  });

  return NextResponse.json({ success: true, config: updated });
}
