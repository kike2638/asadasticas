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

  if (lecturas.length > 500) return NextResponse.json({ error: "Máximo 500 por lote" }, { status: 400 });

  // Crear BillingCycle para idempotencia
  const periodo = new Date().toISOString().slice(0, 7);
  const { prisma } = await import("@/lib/prisma");
  const existingCycle = await prisma.billingCycle.findFirst({ where: { tenantId, periodo, estado: "CERRADO" } });
  if (existingCycle) return NextResponse.json({ error: `Periodo ${periodo} ya cerrado` }, { status: 400 });

  const results: any[] = [];
  const errors: any[] = [];

  for (const l of lecturas) {
    if (!l.meterId || !l.subscriberId || l.currentReading === undefined) {
      errors.push({ meterId: l.meterId, error: "Datos incompletos" });
      continue;
    }
    try {
      const inv = await createInvoice({
        tenantId,
        subscriberId: l.subscriberId,
        meterId: l.meterId,
        currentReading: Number(l.currentReading),
        tipoComprobante: "TIQUETE_ELECTRONICO",
      });
      results.push({ meterId: l.meterId, invoiceId: inv.id, total: inv.total, clave: inv.clave });
    } catch (e: any) {
      errors.push({ meterId: l.meterId, error: e.message });
    }
  }

  // Registrar ciclo
  try {
    await prisma.billingCycle.upsert({
      where: { tenantId_periodo_ruta: { tenantId, periodo, ruta: "bulk" } as any },
      update: { totalFacturas: results.length, totalMonto: results.reduce((a, r) => a + Number(r.total), 0), estado: errors.length ? "BORRADOR" : "FACTURADO" },
      create: { tenantId, periodo, ruta: "bulk", totalFacturas: results.length, totalMonto: results.reduce((a, r) => a + Number(r.total), 0), estado: errors.length ? "BORRADOR" : "FACTURADO" } as any,
    });
  } catch {}

  return NextResponse.json({ success: true, periodo, generadas: results.length, errores: errors, detalles: results });
}
