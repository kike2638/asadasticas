import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "El CSV debe tener al menos una fila de datos" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = ["nombre", "nis", "numero_medidor"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Faltan columnas: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    const dataLines = lines.slice(1);
    const results: { success: number; errors: string[] } = {
      success: 0,
      errors: [],
    };

    for (let i = 0; i < dataLines.length; i++) {
      const values = dataLines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if (!row.nombre || !row.nis || !row.numero_medidor) {
        results.errors.push(`Fila ${i + 2}: datos incompletos`);
        continue;
      }

      try {
        await prisma.subscriber.create({
          data: {
            tenantId,
            name: row.nombre,
            nis: row.nis,
            category: (row.categoria as any) || "DOMICILIAR",
            meters: {
              create: {
                tenantId,
                number: row.numero_medidor,
              },
            },
          },
        });
        results.success++;
      } catch (error: any) {
        if (error.code === "P2002") {
          results.errors.push(`Fila ${i + 2}: NIS ${row.nis} ya existe`);
        } else {
          results.errors.push(`Fila ${i + 2}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.success,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error importando abonados:", error);
    return NextResponse.json(
      { error: "Error procesando el CSV" },
      { status: 500 }
    );
  }
}
