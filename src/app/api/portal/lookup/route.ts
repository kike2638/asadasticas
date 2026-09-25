import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("tenant") ?? searchParams.get("asada");
  const nis = searchParams.get("nis");

  if (!slug || !nis) return NextResponse.json({ error: "asada (slug) y nis requeridos" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { config: true } });
  if (!tenant || tenant.status !== "ACTIVE") return NextResponse.json({ error: "ASADA no encontrada" }, { status: 404 });

  const sub = await prisma.subscriber.findFirst({
    where: { tenantId: tenant.id, nis: nis.trim() },
    include: { meters: true },
  });
  if (!sub) return NextResponse.json({ error: `NIS ${nis} no encontrado en ${tenant.name}` }, { status: 404 });

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: tenant.id, subscriberId: sub.id, status: { in: ["PENDING", "PARTIAL"] } },
    orderBy: { periodoFacturacion: "asc" },
  });

  const pagos = await prisma.payment.findMany({
    where: { tenantId: tenant.id, subscriberId: sub.id },
    orderBy: { paymentDate: "desc" },
    take: 10,
  });

  const deuda = invoices.reduce((a, inv) => a + Number((inv as any).saldoPendiente ?? inv.total), 0);
  const totalFacturado = invoices.reduce((a, inv) => a + Number(inv.total), 0);

  // Sin exponer datos sensibles completos
  return NextResponse.json({
    asada: { name: tenant.name, slug: tenant.slug, logoUrl: (tenant as any).logoUrl ?? null, telefono: (tenant as any).telefono ?? null, direccion: (tenant as any).direccion ?? null },
    abonado: { nis: sub.nis, name: sub.name, category: sub.category, status: sub.status, medidor: sub.meters[0]?.number ?? "—", telefono: sub.telefono ? `***${sub.telefono.slice(-4)}` : null },
    sinpe: {
      numero: (tenant.config as any)?.sinpeNumero ?? null,
      nombre: (tenant.config as any)?.sinpeNombre ?? tenant.name,
      banco: (tenant.config as any)?.sinpeBanco ?? "BNCR",
    },
    deuda: { total: deuda, totalFacturado, cantidad: invoices.length, vencida: invoices.filter(i => new Date(i.fechaVencimiento) < new Date()).length },
    facturas: invoices.map(i => ({
      id: i.id, periodo: i.periodoFacturacion, consecutivo: i.consecutivo, total: Number(i.total), saldo: Number((i as any).saldoPendiente ?? i.total),
      vencimiento: i.fechaVencimiento, estado: i.status, estadoHacienda: i.estadoHacienda, clave: i.clave,
    })),
    pagosRecientes: pagos.map(p => ({ fecha: p.paymentDate, monto: Number(p.amount), metodo: p.paymentMethod, referencia: p.referenceNumber?.slice(0, 8) + "***" })),
  });
}
