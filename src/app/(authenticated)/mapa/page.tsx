import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import AbonadosMap from "@/components/map/AbonadosMap";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const subs = await prisma.subscriber.findMany({
    where: { tenantId },
    include: { meters: true, invoices: { where: { status: { in: ["PENDING", "PARTIAL"] } }, select: { saldoPendiente: true, total: true } } },
    take: 1000,
  });

  const abonados = subs.map(sub => {
    const deuda = sub.invoices.reduce((a, inv) => a + Number(inv.saldoPendiente ?? inv.total), 0);
    let status: string = sub.status;
    if (deuda > 0 && status === "ACTIVO") status = "MOROSO";
    return {
      id: sub.id,
      nis: sub.nis,
      name: sub.name,
      lat: sub.lat ? Number(sub.lat) : 0,
      lng: sub.lng ? Number(sub.lng) : 0,
      category: sub.category,
      status,
      ruta: sub.rutaLectura,
      telefono: sub.telefono,
      deuda,
      medidor: sub.meters[0]?.number ?? "—",
    };
  });

  const conGPS = abonados.filter(a => a.lat && a.lng).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Georreferenciación</p>
        <h1 className="page-title">Mapa de abonados</h1>
        <p className="page-subtitle">{abonados.length} abonados • {conGPS} georreferenciados • {abonados.length - conGPS} por ubicar • clic para ver deuda y WhatsApp</p>
      </div>

      {conGPS === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-white font-medium">Sin abonados georreferenciados aún</p>
          <p className="text-sm text-muted mt-2">Edita abonados y agrega lat/lng o usa captura en campo con GPS. Seed ya trae 2 con ubicación para probar.</p>
          <a href="/subscribers" className="btn-primary inline-flex mt-4">Ir a abonados</a>
        </div>
      ) : (
        <AbonadosMap abonados={abonados} />
      )}

      <div className="glass p-4 rounded-2xl">
        <p className="text-sm text-muted">Tip fontanero: filtra por <span className="text-white">RUTA-01</span> y planifica cortes. Morosos en rojo. Exporta lista desde <a href="/morosidad" className="text-cyan-400 underline">Morosidad</a>.</p>
      </div>
    </div>
  );
}
