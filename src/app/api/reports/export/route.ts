import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "facturas";

  if (tipo === "pagos") {
    const pagos = await prisma.payment.findMany({ where: { tenantId }, include: { subscriber: true }, orderBy: { paymentDate: "desc" }, take: 1000 });
    const csv = ["fecha,nis,abonado,monto,metodo,referencia", ...pagos.map(p => `${new Date(p.paymentDate).toISOString().slice(0, 10)},${p.subscriber.nis},"${p.subscriber.name}",${p.amount},${p.paymentMethod},${p.referenceNumber ?? ""}`)].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="pagos-${new Date().toISOString().slice(0, 7)}.csv"` } });
  }

  const facturas = await prisma.invoice.findMany({ where: { tenantId }, include: { subscriber: true }, orderBy: { periodoFacturacion: "desc" }, take: 1000 });
  const csv = ["periodo,nis,abonado,clave,total,estado,estadoHacienda", ...facturas.map(f => `${f.periodoFacturacion},${f.subscriber.nis},"${f.subscriber.name}",${f.clave},${f.total},${f.status},${f.estadoHacienda}`)].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="facturas-${new Date().toISOString().slice(0, 7)}.csv"` } });
}
