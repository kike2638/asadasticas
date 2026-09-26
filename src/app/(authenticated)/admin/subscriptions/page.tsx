import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCRC, formatUSD } from "@/lib/saas/pricing";
import { PLATFORM } from "@/lib/saas/platform";
import ValidateButton from "./validate-button";

export const dynamic = "force-dynamic";

export default async function AdminSubsPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  if (s.user.role !== "PLATFORM_OWNER") redirect("/dashboard");

  const subs = await prisma.saaSSubscription.findMany({
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: [{ status: "asc" }, { periodo: "desc" }],
    take: 100,
  });

  const pending = subs.filter(x => x.status === "PENDING");
  const paid = subs.filter(x => x.status === "PAID");
  const overdue = subs.filter(x => x.status === "OVERDUE");
  const totalMRR = subs.filter(x => x.periodo === new Date().toISOString().slice(0, 7)).reduce((a, x) => a + Number(x.monto), 0);
  const totalPaid = paid.reduce((a, x) => a + Number(x.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">SaaS Admin • SINPE {PLATFORM.sinpeNumero} • {PLATFORM.sinpeNombre}</p>
        <h1 className="page-title">Validación SINPE</h1>
        <p className="page-subtitle">{pending.length} pendientes • {paid.length} pagados • MRR mes {formatCRC(totalMRR)} • Total cobrado {formatCRC(totalPaid)}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 text-center border border-amber-500/20"><p className="text-2xl font-bold text-amber-400">{pending.length}</p><p className="text-xs text-muted">Pendientes validar</p></div>
        <div className="glass rounded-2xl p-5 text-center border border-emerald-500/20"><p className="text-2xl font-bold text-emerald-400">{formatCRC(totalPaid)}</p><p className="text-xs text-muted">Cobrado histórico</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{formatCRC(totalMRR)}</p><p className="text-xs text-muted">MRR este mes</p></div>
      </div>

      <div className="flex gap-2">
        <a href="/conciliacion" className="flex-1 py-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-center text-sm font-medium text-cyan-300">Conciliación automática CSV (tu 87607243)</a>
        <a href="/api/banks/conciliate" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">API</a>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Suscripciones por ASADA — valida SINPE a tu 87607243</h3>
          <p className="text-xs text-muted">Cuando llega SINPE, verifica monto = tramo + referencia slug + periodo. Marca PAID y se activa. O usa conciliación automática importando CSV BNCR/BAC.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead><tr><th>Periodo</th><th>ASADA</th><th>Abonados</th><th>Monto</th><th>Ref SINPE</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {subs.map(sub => (
                <tr key={sub.id} className={sub.status === "PENDING" ? "bg-amber-500/5" : ""}>
                  <td className="font-mono text-sm text-white">{sub.periodo}</td>
                  <td><span className="text-white font-medium">{sub.tenant.name}</span><span className="text-xs text-muted ml-2">{sub.tenant.slug}</span></td>
                  <td className="text-center">{sub.abonadosCount}</td>
                  <td className="font-bold text-white">{formatCRC(Number(sub.monto))}<span className="text-xs text-muted ml-1">({formatUSD(Number(sub.montoUSD ?? 0))})</span></td>
                  <td className="font-mono text-xs text-gray-400">{sub.referenciaPago ?? "—"}</td>
                  <td><span className={`badge ${sub.status === "PAID" ? "badge-green" : sub.status === "PENDING" ? "badge-yellow" : "badge-red"}`}>{sub.status}</span></td>
                  <td><ValidateButton id={sub.id} status={sub.status} /></td>
                </tr>
              ))}
              {subs.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted">Sin suscripciones — el cron las genera mensual</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
