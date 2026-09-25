import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import BulkClient from "./bulk-client";

export default async function BulkPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const subs = await prisma.subscriber.findMany({
    where: { tenantId, status: "ACTIVO" },
    include: { meters: { include: { readings: { orderBy: { date: "desc" }, take: 1 } } } },
    orderBy: { rutaLectura: "asc" },
    take: 500,
  });

  const rutas = [...new Set(subs.map(s => s.rutaLectura).filter(Boolean))] as string[];
  const periodo = new Date().toISOString().slice(0, 7);

  // Facturas ya generadas este periodo
  const facturadas = await prisma.invoice.findMany({ where: { tenantId, periodoFacturacion: periodo }, select: { subscriberId: true } });
  const factSet = new Set(facturadas.map(f => f.subscriberId));

  const pendientes = subs
    .filter(s => !factSet.has(s.id) && s.meters.length > 0)
    .map(s => ({
      subscriberId: s.id,
      nis: s.nis,
      name: s.name,
      category: s.category,
      ruta: s.rutaLectura ?? "SIN-RUTA",
      meterId: s.meters[0].id,
      meterNumber: s.meters[0].number,
      lastReading: s.meters[0].readings[0]?.value.toNumber() ?? 0,
    }));

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="section-label">Operaciones</p>
        <h1 className="page-title">Facturación masiva</h1>
        <p className="page-subtitle">{pendientes.length} pendientes • {rutas.length} rutas • Periodo {periodo} • {facturadas.length} ya facturadas</p>
      </div>
      <BulkClient pendientes={pendientes} rutas={rutas} periodo={periodo} />
    </div>
  );
}
