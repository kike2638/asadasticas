import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Zap,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;

  const [subscriberCount, invoiceCount, pendingInvoices, recentPayments] =
    await Promise.all([
      prisma.subscriber.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, status: "PENDING" } }),
      prisma.payment.findMany({
        where: { tenantId },
        orderBy: { paymentDate: "desc" },
        take: 5,
        include: { subscriber: true },
      }),
    ]);

  const totalRevenue = await prisma.payment.aggregate({
    where: { tenantId, status: "PROCESSED" },
    _sum: { amount: true },
  });

  const kpis = [
    {
      label: "Total Abonados",
      value: subscriberCount.toString(),
      delta: "+12%",
      up: true,
      icon: Users,
      tint: "text-sky-400 bg-sky-500/10",
      ring: "ring-sky-500/20",
    },
    {
      label: "Facturas Emitidas",
      value: invoiceCount.toString(),
      delta: "+8%",
      up: true,
      icon: FileText,
      tint: "text-violet-400 bg-violet-500/10",
      ring: "ring-violet-500/20",
    },
    {
      label: "Pendientes",
      value: pendingInvoices.toString(),
      delta: "-3%",
      up: false,
      icon: Clock,
      tint: "text-amber-400 bg-amber-500/10",
      ring: "ring-amber-500/20",
    },
    {
      label: "Ingresos Totales",
      value: `₡${(totalRevenue._sum.amount?.toNumber() || 0).toLocaleString()}`,
      delta: "+18%",
      up: true,
      icon: TrendingUp,
      tint: "text-emerald-400 bg-emerald-500/10",
      ring: "ring-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="section-label mb-1.5">Resumen general</p>
        <h1 className="page-title mb-1">Dashboard</h1>
        <p className="page-subtitle">Panorama de tu ASADA hoy</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="card card-hover p-5 animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-10 h-10 rounded-[10px] ${kpi.tint} flex items-center justify-center ring-1 ${kpi.ring}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    kpi.up ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {kpi.up ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {kpi.delta}
                </span>
              </div>
              <p className="text-[26px] font-semibold tracking-tight text-white leading-none mb-1.5">
                {kpi.value}
              </p>
              <p className="text-[13px] text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="card p-6 animate-fade-in" style={{ animationDelay: "240ms" }}>
          <h2 className="text-[15px] font-semibold tracking-tight text-white mb-1">
            Acciones rápidas
          </h2>
          <p className="text-[13px] text-muted mb-5">
            Atajos para operar tu ASADA
          </p>
          <div className="space-y-1.5">
            <a
              href="/billing"
              className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="w-10 h-10 rounded-[10px] bg-sky-500/10 ring-1 ring-sky-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Nueva factura</p>
                <p className="text-xs text-muted">Generar factura para abonado</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted ml-auto group-hover:text-sky-400 transition-colors" />
            </a>
            <a
              href="/subscribers"
              className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="w-10 h-10 rounded-[10px] bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Ver abonados</p>
                <p className="text-xs text-muted">Abonados activos del sistema</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted ml-auto group-hover:text-violet-400 transition-colors" />
            </a>
            <a
              href="/payments"
              className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="w-10 h-10 rounded-[10px] bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Registrar pago</p>
                <p className="text-xs text-muted">Registrar pago de un abonado</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted ml-auto group-hover:text-emerald-400 transition-colors" />
            </a>
          </div>
        </div>

        {/* Recent Payments */}
        <div
          className="lg:col-span-2 card p-6 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white mb-0.5">
                Pagos recientes
              </h2>
              <p className="text-[13px] text-muted">
                Últimos abonos registrados
              </p>
            </div>
            <a
              href="/payments"
              className="inline-flex items-center gap-1 text-sm text-[var(--accent-text)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Ver todos
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          {recentPayments.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Droplets className="w-7 h-7 text-muted" />
              </div>
              <p className="text-secondary text-sm">No hay pagos registrados aún</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1f1f25]">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/15 to-cyan-400/15 ring-1 ring-white/5 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {payment.subscriber.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {payment.subscriber.name}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(payment.paymentDate).toLocaleDateString("es-CR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">
                      ₡{payment.amount.toNumber().toLocaleString()}
                    </p>
                    <span className="badge badge-green text-[11px]">
                      {payment.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "360ms" }}>
        {[
          { value: "15", label: "Lecturas hoy" },
          { value: "98%", label: "Colección" },
          { value: "3", label: "Alertas" },
          { value: "45 m³", label: "Promedio" },
        ].map((stat) => (
          <div key={stat.label} className="card card-hover p-5 text-center">
            <p className="text-2xl font-semibold tracking-tight text-white">
              {stat.value}
            </p>
            <p className="text-[13px] text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}