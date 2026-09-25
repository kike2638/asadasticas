import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect, notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Droplets, MapPin, Phone, Mail, Calendar, CreditCard, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SubscriberDetail({ params }: { params: { id: string } }) {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const sub = await prisma.subscriber.findFirst({
    where: { id: params.id, tenantId },
    include: { meters: { include: { readings: { orderBy: { date: "desc" }, take: 1 } } }, invoices: { orderBy: { periodoFacturacion: "desc" }, take: 20 }, payments: { orderBy: { paymentDate: "desc" }, take: 20 } },
  });
  if (!sub) return notFound();

  const deuda = sub.invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").reduce((a, i) => a + Number((i as any).saldoPendiente ?? i.total), 0);
  const lastReading = sub.meters[0]?.readings[0]?.value ? Number(sub.meters[0].readings[0].value) : null;
  const moroso = deuda > 0 && sub.invoices.some(i => i.status !== "PAID" && new Date(i.fechaVencimiento) < new Date());
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId }, select: { sinpeNumero: true, sinpeNombre: true } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted"><Link href="/subscribers" className="hover:text-white">Abonados</Link><span>/</span><span className="text-white">{sub.name}</span></div>

      <div className="glass rounded-2xl p-6 flex flex-col md:flex-row gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-2xl font-bold text-white shrink-0">{sub.name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{sub.name} <span className="ml-2 badge badge-cyan">{sub.category}</span> <span className={`badge ${sub.status === "ACTIVO" ? "badge-green" : sub.status === "MOROSO" ? "badge-orange" : "badge-red"}`}>{sub.status}</span></h1>
          <p className="text-sm text-muted">NIS {sub.nis} • {sub.tipoIdentificacion}-{sub.identificacion ?? "—"} • Medidor {sub.meters[0]?.number ?? "—"} {lastReading !== null ? `• Última lectura ${lastReading} m³` : ""}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            {sub.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{sub.telefono}</span>}
            {sub.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{sub.email}</span>}
            {sub.direccion && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{sub.direccion}</span>}
            {sub.rutaLectura && <span className="badge badge-cyan text-[11px]">{sub.rutaLectura}</span>}
            {sub.lat && <a href={`https://maps.google.com/?q=${sub.lat},${sub.lng}`} target="_blank" className="text-cyan-400 underline">Ver en mapa</a>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-muted">Deuda actual</p>
          <p className={`text-2xl font-bold ${deuda > 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCurrency(deuda)}</p>
          {moroso && <p className="text-xs text-amber-400 flex items-center gap-1 justify-end"><AlertTriangle className="w-3.5 h-3.5" />Moroso</p>}
          {cfg?.sinpeNumero && <p className="text-xs text-muted mt-1">SINPE ASADA: <span className="font-mono text-white">{cfg.sinpeNumero}</span></p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /><h3 className="font-semibold text-white">Facturas</h3><span className="ml-auto text-xs text-muted">{sub.invoices.length}</span></div>
          <div className="divide-y divide-white/5 max-h-[420px] overflow-auto">
            {sub.invoices.map(inv => (
              <div key={inv.id} className="p-3 flex items-center justify-between">
                <div><p className="text-sm text-white font-mono">{inv.periodoFacturacion} • {inv.consecutivo.slice(-10)}</p><p className="text-xs text-muted">{new Date(inv.fechaVencimiento).toLocaleDateString("es-CR")} • {inv.estadoHacienda}</p></div>
                <div className="text-right"><p className="text-sm font-bold text-white">{formatCurrency(Number(inv.total))}</p><p className="text-xs text-muted">Saldo {formatCurrency(Number((inv as any).saldoPendiente ?? inv.total))}</p><span className={`badge text-[11px] ${inv.status === "PAID" ? "badge-green" : inv.status === "PENDING" ? "badge-yellow" : "badge-orange"}`}>{inv.status}</span></div>
              </div>
            ))}
            {sub.invoices.length === 0 && <p className="text-center py-8 text-muted text-sm">Sin facturas</p>}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /><h3 className="font-semibold text-white">Pagos</h3><span className="ml-auto text-xs text-muted">{sub.payments.length}</span></div>
          <div className="divide-y divide-white/5 max-h-[420px] overflow-auto">
            {sub.payments.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between">
                <div><p className="text-sm text-white">{formatCurrency(Number(p.amount))} • <span className="badge badge-cyan text-[11px]">{p.paymentMethod}</span></p><p className="text-xs text-muted font-mono">{p.referenceNumber ?? "—"} • {new Date(p.paymentDate).toLocaleDateString("es-CR")}</p></div>
                <span className={`badge ${p.status === "PROCESSED" ? "badge-green" : "badge-red"}`}>{p.status}</span>
              </div>
            ))}
            {sub.payments.length === 0 && <p className="text-center py-8 text-muted text-sm">Sin pagos</p>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Acciones</h3>
        <div className="flex flex-wrap gap-2">
          <Link href={`/billing?nis=${sub.nis}`} className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm">Facturar lectura</Link>
          <Link href={`/payments?nis=${sub.nis}`} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm">Registrar pago</Link>
          <a href={`https://wa.me/506${(sub.telefono ?? "").replace(/\D/g, "").slice(-8)}?text=Hola%20${encodeURIComponent(sub.name)}%20tu%20deuda%20es%20${formatCurrency(deuda)}%20SINPE%20${cfg?.sinpeNumero ?? ""}`} target="_blank" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">WhatsApp cobro</a>
          <Link href="/notificaciones" className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm">Recordatorio</Link>
          <Link href="/conciliacion" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">Conciliar</Link>
        </div>
      </div>
    </div>
  );
}
