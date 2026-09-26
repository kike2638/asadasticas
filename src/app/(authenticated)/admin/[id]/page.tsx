import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, FileText, Hash, Mail, MapPin, Phone, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateSubscription, formatCRC } from "@/lib/saas/pricing";
import StatusToggle from "../status-toggle";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  ACTIVE: "badge-green",
  SUSPENDED: "badge-red",
  INACTIVE: "badge-gray",
};

const subBadge: Record<string, string> = {
  PAID: "badge-green",
  PENDING: "badge-yellow",
  OVERDUE: "badge-red",
  TRIAL: "badge-cyan",
};

export default async function AdminTenantPage({ params }: { params: { id: string } }) {
  const s = await getServerUser(); if (!s) redirect("/login");
  if (s.user.role !== "PLATFORM_OWNER") redirect("/dashboard");

  const t = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { _count: { select: { subscribers: true, invoices: true, payments: true, users: true } } },
  });
  if (!t) notFound();

  const subs = await prisma.saaSSubscription.findMany({
    where: { tenantId: t.id },
    orderBy: { periodo: "desc" },
    take: 6,
  });

  const isPlatform = t.slug === "plataforma-admin";
  const mrr = isPlatform ? 0 : calculateSubscription(t._count.subscribers).montoCRC;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-cyan-400" /></div>
          <div className="min-w-0">
            <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-muted hover:text-white transition-colors"><ArrowLeft className="w-3.5 h-3.5" />ASADAS</Link>
            <h1 className="page-title truncate">{t.name}</h1>
            <p className="page-subtitle flex flex-wrap items-center gap-2">
              <span className={`badge ${statusBadge[t.status] ?? "badge-gray"}`}>{t.status}</span>
              <span className="badge badge-cyan">{t.plan}</span>
              {t.subscriptionStatus === "TRIAL" && <span className="badge badge-cyan">TRIAL</span>}
              {t.subscriptionStatus === "PAST_DUE" && <span className="badge badge-red">PAST_DUE</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/subscriptions" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 min-h-11 inline-flex items-center">Suscripciones</a>
          {!isPlatform && <StatusToggle id={t.id} status={t.status} name={t.name} />}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{t._count.subscribers}</p><p className="text-xs text-muted">Abonados</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-cyan-400">{t._count.invoices}</p><p className="text-xs text-muted">Facturas</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-emerald-400">{t._count.payments}</p><p className="text-xs text-muted">Pagos</p></div>
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{formatCurrency(mrr)}</p><p className="text-xs text-muted">MRR estimado</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Datos de la ASADA</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Hash className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Slug</span><span className="font-mono text-white ml-auto">{t.slug}</span></div>
            <div className="flex items-center gap-3"><Building2 className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Cédula jurídica</span><span className="text-white ml-auto">{t.cedulaJuridica ?? "—"}</span></div>
            <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Teléfono</span><span className="text-white ml-auto">{t.telefono ?? "—"}</span></div>
            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Email</span><span className="text-white ml-auto truncate max-w-[220px]">{t.email ?? "—"}</span></div>
            <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Dirección</span><span className="text-white ml-auto truncate max-w-[220px]">{t.direccion ?? "—"}</span></div>
          </dl>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Estado comercial</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Creada</span><span className="text-white ml-auto">{t.createdAt.toLocaleDateString("es-CR")}</span></div>
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Trial hasta</span><span className="text-white ml-auto">{t.trialEndsAt ? t.trialEndsAt.toLocaleDateString("es-CR") : "—"}</span></div>
            <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Suscripción</span><span className="text-white ml-auto">{t.subscriptionStatus}</span></div>
            <div className="flex items-center gap-3"><Users className="w-4 h-4 text-muted shrink-0" /><span className="text-muted">Usuarios internos</span><span className="text-white ml-auto">{t._count.users}</span></div>
          </dl>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Últimas suscripciones</h3>
          <Link href="/admin/subscriptions" className="text-xs text-cyan-300 hover:text-cyan-200">Validar SINPE →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead><tr><th>Periodo</th><th>Abonados</th><th>Monto</th><th>Ref SINPE</th><th>Vence</th><th>Estado</th></tr></thead>
            <tbody>
              {subs.map(sub => (
                <tr key={sub.id}>
                  <td className="font-mono text-sm text-white">{sub.periodo}</td>
                  <td className="text-center">{sub.abonadosCount}</td>
                  <td className="font-bold text-white">{formatCRC(Number(sub.monto))}</td>
                  <td className="font-mono text-xs text-gray-400">{sub.referenciaPago ?? "—"}</td>
                  <td className="text-gray-300">{sub.fechaVencimiento.toLocaleDateString("es-CR")}</td>
                  <td><span className={`badge ${subBadge[sub.status] ?? "badge-gray"}`}>{sub.status}</span></td>
                </tr>
              ))}
              {subs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted">Sin suscripciones — el cron las genera mensual</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
