import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Shield, TrendingUp, AlertTriangle, Droplets, Users, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JuntaPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const periodo = new Date().toISOString().slice(0, 7);

  const [subs, facturas, pagos, cashClosings, lecturasRecientes] = await Promise.all([
    prisma.subscriber.count({ where: { tenantId } }),
    prisma.invoice.findMany({ where: { tenantId, periodoFacturacion: periodo } }),
    prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.cashClosing.findMany({ where: { tenantId }, orderBy: { fecha: "desc" }, take: 5, include: { responsable: true } }),
    prisma.reading.findMany({ where: { tenantId, anomalia: { not: "NONE" } }, orderBy: { date: "desc" }, take: 5, include: { meter: { include: { subscriber: true } } } }),
  ]);

  const totalFacturado = facturas.reduce((a, f) => a + Number(f.total), 0);
  const totalCobrado = pagos.reduce((a, p) => a + Number(p.amount), 0);
  const cobrabilidad = totalFacturado ? Math.round((totalCobrado / totalFacturado) * 100) : 0;
  const morosos = await prisma.invoice.count({ where: { tenantId, status: { in: ["PENDING", "PARTIAL"] }, fechaVencimiento: { lt: new Date() } } });
  const pendientesHacienda = await prisma.invoice.count({ where: { tenantId, estadoHacienda: { in: ["PENDIENTE", "EN_PROCESO"] } } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400"/> Junta Directiva • Solo lectura</p>
          <h1 className="page-title">{tenant?.name}</h1>
          <p className="page-subtitle">Céd. Jur. {(tenant as any)?.cedulaJuridica ?? "—"} • Periodo {periodo} • Corte a {new Date().toLocaleDateString("es-CR")}</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/20">Auditoría • No editable</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5"><p className="text-xs text-muted flex items-center gap-1"><Users className="w-4 h-4"/> Abonados</p><p className="text-2xl font-bold text-white">{subs}</p></div>
        <div className="glass p-5"><p className="text-xs text-muted flex items-center gap-1"><FileText className="w-4 h-4"/> Facturado {periodo}</p><p className="text-2xl font-bold text-white">{formatCurrency(totalFacturado)}</p><p className="text-xs text-muted">{facturas.length} tiquetes</p></div>
        <div className="glass p-5"><p className="text-xs text-muted flex items-center gap-1"><TrendingUp className="w-4 h-4"/> Cobrado</p><p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalCobrado)}</p><p className="text-xs text-emerald-400">{cobrabilidad}% cobrabilidad</p></div>
        <div className="glass p-5"><p className="text-xs text-muted flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Morosos</p><p className={`text-2xl font-bold ${morosos > 20 ? "text-red-400" : morosos > 5 ? "text-amber-400" : "text-white"}`}>{morosos}</p><p className="text-xs text-muted">Facturas vencidas</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass p-6">
          <h3 className="font-semibold text-white mb-3">Estado Hacienda</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-400">Pendientes envío</span><span className={pendientesHacienda ? "text-amber-400 font-bold" : "text-emerald-400"}>{pendientesHacienda}</span></div>
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-400">Aceptados</span><span className="text-white">{facturas.filter(f => f.estadoHacienda === "ACEPTADO").length}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-400">Rechazados</span><span className="text-red-400">{facturas.filter(f => f.estadoHacienda === "RECHAZADO").length}</span></div>
          </div>
        </div>
        <div className="glass p-6">
          <h3 className="font-semibold text-white mb-3">Últimos cierres de caja</h3>
          {cashClosings.length === 0 ? <p className="text-sm text-muted">Sin cierres aún</p> : cashClosings.map(c => (
            <div key={c.id} className="flex justify-between py-2 border-b border-white/5 text-sm"><span className="text-gray-400">{new Date(c.fecha).toLocaleDateString("es-CR")}</span><span className="text-white font-medium">{formatCurrency(Number(c.total))}</span></div>
          ))}
        </div>
        <div className="glass p-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Droplets className="w-4 h-4 text-amber-400"/> Alertas lecturas</h3>
          {lecturasRecientes.length === 0 ? <p className="text-sm text-muted">Sin anomalías</p> : lecturasRecientes.map(r => (
            <div key={r.id} className="flex justify-between py-2 border-b border-white/5 text-sm"><span className="text-gray-300">{r.meter.subscriber.name}</span><span className="badge badge-orange text-[11px]">{(r as any).anomalia}</span></div>
          ))}
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-semibold text-white mb-2">Responsabilidad Junta Directiva (AyA)</h3>
        <ul className="text-sm text-muted list-disc ml-5 space-y-1">
          <li>Cobrabilidad mínima exigida AyA: 95% — actual <span className={cobrabilidad >= 95 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{cobrabilidad}%</span></li>
          <li>Informe mensual a AyA: facturación, recaudación, morosidad, consumo. Exporte desde <a href="/reportes" className="text-cyan-400 underline">Reportes</a>.</li>
          <li>Esta vista es solo lectura para fiscalía. Sin permisos de facturar/cobrar.</li>
        </ul>
      </div>
    </div>
  );
}
