import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Activity, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function keyMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosMeses(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(keyMes(d));
    d.setMonth(d.getMonth() - 1);
  }
  return out.reverse();
}

export default async function ReportesPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const periodo = new Date().toISOString().slice(0, 7);
  const meses = ultimosMeses(6);
  const desde6m = new Date();
  desde6m.setMonth(desde6m.getMonth() - 6);
  desde6m.setDate(1);

  const [facturas, pagos, pagos6m, vencidas, padron, morososCount] = await Promise.all([
    prisma.invoice.findMany({ where: { tenantId, periodoFacturacion: periodo } }),
    prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: desde6m } }, select: { amount: true, paymentDate: true } }),
    prisma.invoice.findMany({
      where: { tenantId, status: { in: ["PENDING", "PARTIAL"] }, fechaVencimiento: { lt: new Date() } },
      include: { subscriber: { select: { id: true, name: true, nis: true } } },
    }),
    prisma.subscriber.count({ where: { tenantId } }),
    prisma.subscriber.count({ where: { tenantId, invoices: { some: { status: { in: ["PENDING", "PARTIAL"] }, fechaVencimiento: { lt: new Date() } } } } }),
  ]);

  const totalFacturado = facturas.reduce((a, f) => a + f.total.toNumber(), 0);
  const totalCobrado = pagos.reduce((a, p) => a + p.amount.toNumber(), 0);
  const pendientes = facturas.filter(f => f.status !== "PAID").length;
  const anc = facturas.length ? Math.round((1 - pagos.length / Math.max(1, facturas.length)) * 100) : 0;
  const porCat = await prisma.subscriber.groupBy({ by: ["category"], where: { tenantId }, _count: { _all: true } });

  // Tendencia 6 meses (facturado por periodo, cobrado por fecha de pago)
  const facturadoPorMes: Record<string, number> = {};
  for (const m of meses) facturadoPorMes[m] = 0;
  const facturas6m = await prisma.invoice.findMany({ where: { tenantId, periodoFacturacion: { in: meses } }, select: { total: true, periodoFacturacion: true } });
  for (const f of facturas6m) {
    if (f.periodoFacturacion in facturadoPorMes) facturadoPorMes[f.periodoFacturacion] += f.total.toNumber();
  }
  const cobradoPorMes: Record<string, number> = {};
  for (const m of meses) cobradoPorMes[m] = 0;
  for (const p of pagos6m) {
    const k = keyMes(p.paymentDate);
    if (k in cobradoPorMes) cobradoPorMes[k] += p.amount.toNumber();
  }
  const maxBarra = Math.max(1, ...meses.map(m => Math.max(facturadoPorMes[m], cobradoPorMes[m])));
  const mesActual = meses[5];
  const mesAnterior = meses[4];
  const cobradoMesAnt = cobradoPorMes[mesAnterior] || 1;
  const variacionMes = Math.round(((cobradoPorMes[mesActual] - cobradoMesAnt) / cobradoMesAnt) * 100);

  // Aging de mora (0-30 / 31-60 / 61-90 / 90+)
  const aging = { d30: { monto: 0, n: 0 }, d60: { monto: 0, n: 0 }, d90: { monto: 0, n: 0 }, d90p: { monto: 0, n: 0 } };
  const porAbonado: Record<string, { name: string; nis: string; deuda: number }> = {};
  for (const inv of vencidas) {
    const dias = Math.floor((Date.now() - inv.fechaVencimiento.getTime()) / 86400000);
    const saldo = (inv.saldoPendiente?.toNumber?.() ?? inv.total.toNumber());
    if (dias <= 30) { aging.d30.monto += saldo; aging.d30.n++; }
    else if (dias <= 60) { aging.d60.monto += saldo; aging.d60.n++; }
    else if (dias <= 90) { aging.d90.monto += saldo; aging.d90.n++; }
    else { aging.d90p.monto += saldo; aging.d90p.n++; }
    const k = inv.subscriberId;
    if (!porAbonado[k]) porAbonado[k] = { name: inv.subscriber.name, nis: inv.subscriber.nis, deuda: 0 };
    porAbonado[k].deuda += saldo;
  }
  const topMorosos = Object.values(porAbonado).sort((a, b) => b.deuda - a.deuda).slice(0, 5);
  const totalVencido = aging.d30.monto + aging.d60.monto + aging.d90.monto + aging.d90p.monto;

  // Salud de la ASADA
  const cobrabilidad = totalFacturado > 0 ? totalCobrado / totalFacturado : 1;
  const pctMorosos = padron > 0 ? morososCount / padron : 0;
  const cobrado6m = meses.reduce((a, m) => a + cobradoPorMes[m], 0);
  const promedio3mPrevios = (cobradoPorMes[meses[2]] + cobradoPorMes[meses[3]] + cobradoPorMes[meses[4]]) / 3;
  const creciendo = cobradoPorMes[mesActual] >= promedio3mPrevios * 0.9;

  const checks = [
    { label: "Cobrabilidad del mes ≥ 90%", ok: cobrabilidad >= 0.9, valor: `${Math.round(cobrabilidad * 100)}%` },
    { label: "Morosos < 10% del padrón", ok: pctMorosos < 0.1, valor: `${Math.round(pctMorosos * 100)}% (${morososCount})` },
    { label: "Cobro estable o en crecimiento", ok: creciendo, valor: `${variacionMes >= 0 ? "+" : ""}${variacionMes}% vs mes anterior` },
    { label: "Deuda vencida < 15% del cobro 6m", ok: cobrado6m > 0 && totalVencido / cobrado6m < 0.15, valor: formatCurrency(totalVencido) },
  ];
  const okCount = checks.filter(c => c.ok).length;
  const veredicto = okCount === 4 ? { txt: "Tu ASADA marcha bien", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
    : okCount >= 2 ? { txt: "Requiere atención", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" }
    : { txt: "En riesgo", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };

  const csvIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="section-label">Reportes AyA / ARESEP</p>
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Periodo {periodo} • listo para exportar a AyA y Junta Directiva</p>
      </div>

      {/* Salud del negocio */}
      <div className={`rounded-2xl border p-6 ${veredicto.bg}`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <h3 className="font-semibold text-white">¿Cómo va tu ASADA?</h3>
          <span className={`ml-auto text-sm font-bold ${veredicto.color}`}>{okCount}/4 indicadores • {veredicto.txt}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {checks.map(c => (
            <div key={c.label} className="flex items-start gap-2.5 rounded-xl bg-black/20 p-3">
              {c.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="text-sm text-white">{c.label}</p>
                <p className="text-xs text-muted truncate">{c.valor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{facturas.length}</p><p className="text-xs text-muted">Facturas {periodo}</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalFacturado)}</p><p className="text-xs text-muted">Total facturado</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalCobrado)}</p><p className="text-xs text-muted">Total cobrado</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className={`text-2xl font-bold ${pendientes > 10 ? "text-amber-400" : "text-white"}`}>{pendientes}</p><p className="text-xs text-muted">Pendientes cobro</p></div>
      </div>

      {/* Tendencia 6 meses */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="font-semibold text-white">Tendencia de cobro — últimos 6 meses</h3>
          <span className={`text-sm font-medium inline-flex items-center gap-1 ${variacionMes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {variacionMes >= 0 ? <TrendingUp className="w-4 h-4" aria-hidden="true" /> : <TrendingDown className="w-4 h-4" aria-hidden="true" />}
            {variacionMes >= 0 ? "+" : ""}{variacionMes}% vs mes anterior
          </span>
        </div>
        <div className="flex items-end gap-2 sm:gap-4 h-44" role="img" aria-label={`Barras de facturado y cobrado por mes. Último mes: ${formatCurrency(cobradoPorMes[mesActual])} cobrados de ${formatCurrency(facturadoPorMes[mesActual])} facturados.`}>
          {meses.map(m => {
            const hFact = Math.round((facturadoPorMes[m] / maxBarra) * 100);
            const hCob = Math.round((cobradoPorMes[m] / maxBarra) * 100);
            const esMesActual = m === mesActual;
            return (
              <div key={m} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div className="w-1/2 max-w-[22px] rounded-t bg-white/10" style={{ height: `${hFact}%` }} title={`Facturado ${formatCurrency(facturadoPorMes[m])}`} />
                  <div className={`w-1/2 max-w-[22px] rounded-t ${esMesActual ? "bg-gradient-to-t from-blue-600 to-cyan-400" : "bg-cyan-500/60"}`} style={{ height: `${hCob}%` }} title={`Cobrado ${formatCurrency(cobradoPorMes[m])}`} />
                </div>
                <span className={`text-xs ${esMesActual ? "text-white font-semibold" : "text-muted"}`}>{MESES[Number(m.slice(5)) - 1]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-5 mt-4 text-xs text-muted">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white/10" aria-hidden="true" />Facturado</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-cyan-500" aria-hidden="true" />Cobrado</span>
        </div>
      </div>

      {/* Morosidad detallada */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Deuda vencida por antigüedad</h3>
            <span className="text-sm font-bold text-red-400">{formatCurrency(totalVencido)}</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: "0 – 30 días (leve)", ...aging.d30, color: "text-amber-400" },
              { label: "31 – 60 días (aviso)", ...aging.d60, color: "text-orange-400" },
              { label: "61 – 90 días (corre)", ...aging.d90, color: "text-red-400" },
              { label: "Más de 90 días (corte)", ...aging.d90p, color: "text-red-400" },
            ].map(b => (
              <div key={b.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400">{b.label} <span className="text-muted">({b.n})</span></span>
                <span className={`font-bold ${b.color}`}>{formatCurrency(b.monto)}</span>
              </div>
            ))}
          </div>
          <Link href="/morosidad" className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200">
            Ver cobranza completa <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-3">Mayores deudas (top 5)</h3>
          <div className="space-y-2 text-sm">
            {topMorosos.map((t, i) => (
              <div key={t.nis + i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-white truncate">{t.name}</p>
                  <p className="text-xs text-muted font-mono">NIS {t.nis}</p>
                </div>
                <span className="font-bold text-red-400 shrink-0">{formatCurrency(t.deuda)}</span>
              </div>
            ))}
            {topMorosos.length === 0 && <p className="text-center py-8 text-muted">Sin deudas vencidas — excelente gestión</p>}
          </div>
        </div>
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
            <a href="/api/reports/export?tipo=facturas" className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-300"><span className="inline-flex align-middle mr-1.5">{csvIcon}</span>CSV Facturas</a>
            <a href="/api/reports/export?tipo=pagos" className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-300"><span className="inline-flex align-middle mr-1.5">{csvIcon}</span>CSV Pagos</a>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-white">Para Junta Directiva</h3>
            <p className="text-sm text-muted mt-1">Reporte mensual listo para imprimir: ingresos, egresos, morosidad, consumo promedio. Generá el PDF desde <Link href="/caja" className="text-cyan-400 underline">Arqueo</Link> y revisá la cobranza en <Link href="/morosidad" className="text-cyan-400 underline">Morosidad</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
