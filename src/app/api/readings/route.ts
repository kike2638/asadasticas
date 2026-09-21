import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 401 });
    }

    const body = await request.json();
    const { readings } = body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        { error: "Se esperaba un array de lecturas" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      readings.map((reading: any) =>
        prisma.reading.create({
          data: {
            tenantId,
            meterId: reading.meterId,
            value: reading.value,
            date: reading.date ? new Date(reading.date) : new Date(),
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error) {
    console.error("Error al registrar lecturas:", error);
    return NextResponse.json(
      { error: "Error procesando las lecturas" },
      { status: 500 }
    );
  }
}
