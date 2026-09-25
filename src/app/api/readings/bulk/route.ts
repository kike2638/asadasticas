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

    // Validación + anomalía + GPS
    const toCreate = readings.map((r: any) => ({
      tenantId,
      meterId: r.meterId,
      value: r.value,
      date: r.date ? new Date(r.date) : new Date(),
      anomalia: r.anomalia ?? "NONE",
      observacion: r.observacion ?? null,
      gpsLat: r.gpsLat ?? null,
      gpsLng: r.gpsLng ?? null,
      lectorId: r.lectorId ?? null,
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
