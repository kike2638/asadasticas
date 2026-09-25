import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { calculateSubscription, formatCRC } from "@/lib/saas/pricing";

export async function GET(request: Request) {
  const h = await headers(); const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const count = await prisma.subscriber.count({ where: { tenantId } });
  const calc = calculateSubscription(count);
  return NextResponse.json({ periodo: new Date().toISOString().slice(0, 7), abonados: count, tier: calc.tier.label, montoCRC: calc.montoCRC, montoUSD: calc.montoUSD, display: formatCRC(calc.montoCRC), nota: "Paga por SINPE Móvil al 8888-0000 indicando slug de tu ASADA" });
}

export async function POST(request: Request) {
  const h = await headers(); const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { periodo } = await request.json();
  const p = periodo ?? new Date().toISOString().slice(0, 7);
  const count = await prisma.subscriber.count({ where: { tenantId } });
  const calc = calculateSubscription(count);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const sub = await prisma.saaSSubscription.upsert({
    where: { tenantId_periodo: { tenantId, periodo: p } as any },
    update: {},
    create: {
      tenantId, periodo: p, abonadosCount: count, plan: tenant?.plan ?? "BASIC", monto: calc.montoCRC, montoUSD: calc.montoUSD, status: "PENDING",
      fechaVencimiento: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5),
    } as any,
  });
  return NextResponse.json({ success: true, subscription: sub });
}
