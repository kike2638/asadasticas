import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clave, estado, respuesta } = body;

    if (!clave || !estado) {
      return NextResponse.json(
        { error: "clave y estado son requeridos" },
        { status: 400 }
      );
    }

    // Validate estado value
    const validStates = ["ACEPTADO", "RECHAZADO", "EN_PROCESO"];
    if (!validStates.includes(estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores permitidos: ${validStates.join(", ")}` },
        { status: 400 }
      );
    }

    // Update invoice
    const invoice = await prisma.invoice.update({
      where: { clave },
      data: {
        estadoHacienda: estado as any,
        respuestaHacienda: respuesta || null,
        status: estado === "ACEPTADO" ? "PENDING" : estado === "RECHAZADO" ? "REJECTED" : "PENDING",
      },
    });

    return NextResponse.json({ success: true, invoiceId: invoice.id });
  } catch (error: any) {
    console.error("Error en webhook fiscal:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Error procesando webhook" },
      { status: 500 }
    );
  }
}
