import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { calculateSubscription, TIERS, formatCRC, formatUSD } from "@/lib/saas/pricing";
import { PLATFORM, formatSinpeCR } from "@/lib/saas/platform";
import { CreditCard, TrendingUp, Calendar, ShieldCheck, AlertTriangle, Smartphone, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const count = await prisma.subscriber.count({ where: { tenantId } });
  const calc = calculateSubscription(count);

  const periodo = new Date().toISOString().slice(0, 7);
  const subs = await prisma.saaSSubscription.findMany({ where: { tenantId }, orderBy: { periodo: "desc" }, take: 12 });

  const current = subs.find(x => x.periodo === periodo);
  const isTrial = tenant?.subscriptionStatus === "TRIAL";
  const trialEnds = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString("es-CR") : null;
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">SaaS • Por abonados</p>
          <h1 className="page-title">Suscripción</h1>
          <p className="page-subtitle">{tenant?.name} • {count} abonados • {calc.tier.label}</p>
        </div>
        {isTrial && <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/20">TRIAL hasta {trialEnds ?? "—"}</span>}
        {!isTrial && <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20">ACTIVA</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-cyan-500/20">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-muted">Plan actual por padrón</p>
              <p className="text-2xl font-bold text-white">{calc.tier.label}</p>
              <p className="text-xs text-muted">{count} abonados activos este mes</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{formatCRC(calc.montoCRC)}<span className="text-sm font-normal text-muted">/mes</span></p>
              <p className="text-sm text-muted">{formatUSD(calc.montoUSD)}/mes • IVA incluido</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div className="text-sm">
              <p className="text-white font-medium">Periodo {periodo} — {current?.status ?? "PENDING"}</p>
              <p className="text-xs text-muted">Vence {current ? new Date(current.fechaVencimiento).toLocaleDateString("es-CR") : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toLocaleDateString("es-CR")} • SINPE / transferencia a cuenta SaaS</p>
            </div>
            <span className={`ml-auto badge ${current?.status === "PAID" ? "badge-green" : current?.status === "OVERDUE" ? "badge-red" : "badge-yellow"}`}>{current?.status ?? "PENDING"}</span>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-2"><Smartphone className="w-4 h-4" /> PAGA TU SUSCRIPCIÓN AQUÍ — SINPE Móvil</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-2xl font-mono font-bold text-white tracking-wider">{formatSinpeCR(PLATFORM.sinpeNumero)}</span>
              <span className="text-sm text-gray-300">{PLATFORM.sinpeNombre}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{PLATFORM.sinpeBanco}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Monto exacto: <span className="text-white font-bold">{formatCRC(calc.montoCRC)}</span> • En referencia indica: <span className="font-mono text-white">{tenant?.slug}</span> • Periodo {periodo}</p>
            <p className="text-[11px] text-muted mt-1">WhatsApp comprobante al {formatSinpeCR(PLATFORM.whatsapp)} • Se activa en 24h tras validar SINPE.</p>
          </div>
          <div className="flex gap-2 mt-3">
            <a href={`https://wa.me/506${PLATFORM.sinpeNumero}?text=Hola%20pago%20suscripcion%20${tenant?.slug}%20${periodo}%20${formatCRC(calc.montoCRC)}`} target="_blank" className="btn-primary flex-1 flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />Enviar comprobante por WhatsApp</a>
            <a href={`/api/saas/invoice?periodo=${periodo}`} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">Descargar factura SaaS</a>
          </div>
          {calc.tier.perAbonado && <p className="text-xs text-muted mt-2">Enterprise: +{formatCRC(calc.tier.perAbonado)} por abonado extra sobre 1000.</p>}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> ¿Por qué por abonados?</h3>
          <ul className="text-sm text-muted space-y-2">
            <li>• ASADA pequeña (40 abonados) paga <span className="text-white">₡14,900</span>, no como ASADA 800.</li>
            <li>• Sin cobro por usuario — todo tu equipo usa el sistema.</li>
            <li>• Crece contigo: facturación masiva y mapa ya incluidos.</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Soporte WhatsApp y capacitación incluida.</li>
          </ul>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white">Tabla de precios</h3>
          <span className="text-xs text-muted">Actualizado 2026 • colones</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead><tr><th>Tramo</th><th>Abonados</th><th>Mensual CRC</th><th>USD ref</th><th></th></tr></thead>
            <tbody>
              {TIERS.map(t => {
                const active = count >= t.min && count <= (t.max === Infinity ? 999999 : t.max);
                return (
                  <tr key={t.label} className={active ? "bg-cyan-500/10" : ""}>
                    <td className={`font-medium ${active ? "text-cyan-300" : "text-white"}`}>{t.label} {active && "← tú"}</td>
                    <td className="text-gray-300">{t.min} – {t.max === Infinity ? "∞" : t.max}</td>
                    <td className="font-bold text-white">{formatCRC(t.priceCRC)}</td>
                    <td className="text-gray-400">{formatUSD(t.priceUSD)}</td>
                    <td>{active ? <span className="badge badge-cyan">Actual</span> : <span className="text-xs text-muted">{t.perAbonado ? `+₡${t.perAbonado}/extra` : "—"}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3">Historial 12 meses</h3>
        {subs.length === 0 ? <p className="text-sm text-muted">Se genera al cerrar cada mes. El cron crea la suscripción del periodo automáticamente.</p> : (
          <div className="overflow-x-auto">
            <table className="table-modern"><thead><tr><th>Periodo</th><th>Abonados</th><th>Plan</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>{subs.map(s => <tr key={s.id}><td className="font-mono text-sm">{s.periodo}</td><td>{s.abonadosCount}</td><td><span className="badge badge-cyan">{s.plan}</span></td><td className="font-bold">{formatCRC(Number(s.monto))}</td><td><span className={`badge ${s.status === "PAID" ? "badge-green" : s.status === "OVERDUE" ? "badge-red" : "badge-yellow"}`}>{s.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Si no pagas antes del 5, el sistema queda en solo lectura (no bloquea facturación ya emitida).</p>
      </div>
    </div>
  );
}
