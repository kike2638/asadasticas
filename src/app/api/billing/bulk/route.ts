import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createInvoice } from "@/app/actions/invoice-service";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { lecturas } = await request.json(); // [{meterId, subscriberId, currentReading}]
  if (!Array.isArray(lecturas) || lecturas.length === 0) {
    return NextResponse.json({ error: "lecturas requerido" }, { status: 400 });
  }

  const results: any[] = [];
  const errors: any[] = [];

  for (const l of lecturas) {
    try {
      const inv = await createInvoice({
        tenantId,
        subscriberId: l.subscriberId,
        meterId: l.meterId,
        currentReading: l.currentReading,
        tipoComprobante: "TIQUETE_ELECTRONICO",
      });
      results.push({ meterId: l.meterId, invoiceId: inv.id, total: inv.total, clave: inv.clave });
    } catch (e: any) {
      errors.push({ meterId: l.meterId, error: e.message });
    }
  }

  return NextResponse.json({ success: true, generadas: results.length, errores: errors, detalles: results });
}
