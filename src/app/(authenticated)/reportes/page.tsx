import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default async function ReportesPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const periodo = new Date().toISOString().slice(0, 7);
  const facturas = await prisma.invoice.findMany({ where: { tenantId, periodoFacturacion: periodo } });
  const pagos = await prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } });
  const totalFacturado = facturas.reduce((a, f) => a + f.total.toNumber(), 0);
  const totalCobrado = pagos.reduce((a, p) => a + p.amount.toNumber(), 0);
  const pendientes = facturas.filter(f => f.status !== "PAID").length;
  const anc = facturas.length ? Math.round((1 - pagos.length / Math.max(1, facturas.length)) * 100) : 0;

  // Por categoría
  const porCat = await prisma.subscriber.groupBy({ by: ["category"], where: { tenantId }, _count: { _all: true } });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="section-label">Reportes AyA / ARESEP</p>
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Periodo {periodo} • listo para exportar a AyA y Junta Directiva</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{facturas.length}</p><p className="text-xs text-muted">Facturas {periodo}</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalFacturado)}</p><p className="text-xs text-muted">Total facturado</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalCobrado)}</p><p className="text-xs text-muted">Total cobrado</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className={`text-2xl font-bold ${pendientes > 10 ? "text-amber-400" : "text-white"}`}>{pendientes}</p><p className="text-xs text-muted">Pendientes cobro</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-3">Indicadores AyA</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-400">Cobrabilidad</span><span className="text-white font-bold">{facturas.length ? Math.round((totalCobrado / Math.max(1, totalFacturado)) * 100) : 0}%</span></div>
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-400">Agua no contabilizada (estim.)</span><span className="text-amber-400">{anc}%</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-400">Abonados activos</span><span className="text-white">{porCat.reduce((a, c) => a + c._count._all, 0)}</span></div>
            <p className="text-xs text-muted mt-3">* ANC requiere macromedidor. Conectar caudal de entrada para cálculo real.</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-3">Por categoría</h3>
          <div className="space-y-2">
            {porCat.map(c => (
              <div key={c.category} className="flex justify-between py-2 border-b border-white/5 text-sm"><span className="text-gray-400">{c.category}</span><span className="text-white font-bold">{c._count._all}</span></div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <a href="/api/reports/export?tipo=facturas" className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-300"><span className="inline-flex align-middle mr-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>CSV Facturas</a>
            <a href="/api/reports/export?tipo=pagos" className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-300"><span className="inline-flex align-middle mr-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>CSV Pagos</a>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-2">Para Junta Directiva</h3>
        <p className="text-sm text-muted">Reporte mensual listo para imprimir: ingresos, egresos, morosidad, consumo promedio. Genere PDF desde <a href="/caja" className="text-cyan-400 underline">Arqueo</a> y <a href="/morosidad" className="text-cyan-400 underline">Morosidad</a>.</p>
      </div>
    </div>
  );
}
