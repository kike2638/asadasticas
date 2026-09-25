import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant no identificado" }, { status: 401 });

    const body = await request.json();
    const { readings } = body;
    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: "Se esperaba array de lecturas" }, { status: 400 });
    }

    for (const r of readings) {
      if (!r.meterId || r.value === undefined) return NextResponse.json({ error: "meterId y value requeridos" }, { status: 400 });
      const m = await prisma.meter.findUnique({ where: { id: r.meterId } });
      if (!m || m.tenantId !== tenantId) return NextResponse.json({ error: `Medidor ${r.meterId} no pertenece a esta ASADA` }, { status: 403 });
      if (Number(r.value) < 0) return NextResponse.json({ error: "Lectura no puede ser negativa" }, { status: 400 });
      const last = await prisma.reading.findFirst({ where: { meterId: r.meterId }, orderBy: { date: "desc" } });
      if (last && Number(r.value) < Number(last.value) && !r.anomalia) return NextResponse.json({ error: `Lectura ${r.value} menor que anterior ${last.value} para ${m.number}` }, { status: 400 });
    }

    const toCreate = readings.map((r: any) => ({
      tenantId,
      meterId: r.meterId,
      value: r.value,
      date: r.date ? new Date(r.date) : new Date(),
      anomalia: r.anomalia ?? "NONE",
      observacion: r.observacion ?? null,
      fotoUrl: r.fotoUrl ?? null,
      gpsLat: r.gpsLat ?? null,
      gpsLng: r.gpsLng ?? null,
      lectorId: r.lectorId ?? null,
      consumoCalculado: r.consumoCalculado ?? null,
    }));

    const result = await prisma.$transaction(
      toCreate.map((data: any) => prisma.reading.create({ data }))
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error) {
    console.error("Bulk readings error:", error);
    return NextResponse.json({ error: "Error procesando lecturas" }, { status: 500 });
  }
}
