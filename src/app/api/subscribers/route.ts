import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("search");
  const status = searchParams.get("status");
  const where: any = { tenantId, ...(status ? { status } : {}), ...(q ? { OR: [{ nis: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { identificacion: { contains: q } }] } : {}) };
  const subscribers = await prisma.subscriber.findMany({ where, include: { meters: true }, orderBy: { nis: "asc" }, take: 500 });
  return NextResponse.json({ subscribers });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  const userId = headersList.get("x-user-id");
  if (!tenantId || !userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const { name, nis, category, tipoIdentificacion, identificacion, telefono, email, direccion, rutaLectura, lat, lng, meterNumber } = body;
  if (!name || !nis || !meterNumber) return NextResponse.json({ error: "name, nis, meterNumber requeridos" }, { status: 400 });
  if (email && !email.includes("@")) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  try {
    const sub = await prisma.subscriber.create({
      data: {
        tenantId, name: name.trim(), nis: nis.trim(), category: category ?? "DOMICILIAR",
        tipoIdentificacion: tipoIdentificacion ?? "01", identificacion: identificacion?.trim() ?? null,
        telefono: telefono?.trim() ?? null, email: email?.trim() ?? null, direccion: direccion?.trim() ?? null,
        rutaLectura: rutaLectura?.trim() ?? null, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
        meters: { create: { tenantId, number: meterNumber.trim() } },
      },
      include: { meters: true },
    });
    return NextResponse.json({ success: true, subscriber: sub });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: `NIS ${nis} o medidor ${meterNumber} ya existe` }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
