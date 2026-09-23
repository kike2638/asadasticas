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
      change: "+12%",
      up: true,
      icon: Users,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Facturas Emitidas",
      value: invoiceCount.toString(),
      change: "+8%",
      up: true,
      icon: FileText,
      gradient: "from-purple-500 to-pink-400",
      shadow: "shadow-purple-500/20",
    },
    {
      label: "Pendientes",
      value: pendingInvoices.toString(),
      change: "-3%",
      up: false,
      icon: Clock,
      gradient: "from-orange-500 to-yellow-400",
      shadow: "shadow-orange-500/20",
    },
    {
      label: "Ingresos Totales",
      value: `₡${(totalRevenue._sum.amount?.toNumber() || 0).toLocaleString()}`,
      change: "+18%",
      up: true,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-400",
      shadow: "shadow-green-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Resumen de tu ASADA</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="glass rounded-2xl p-6 hover:bg-white/[0.03] transition-all group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-lg ${kpi.shadow}`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    kpi.up ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {kpi.up ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {kpi.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
              <p className="text-sm text-gray-400">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h2 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            <a
              href="/billing"
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent hover:from-blue-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Nueva Factura</p>
                <p className="text-xs text-gray-400">Generar factura para abonado</p>
              </div>
            </a>
            <a
              href="/subscribers"
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent hover:from-purple-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Ver Abonados</p>
                <p className="text-xs text-gray-400">Gestionar abonados activos</p>
              </div>
            </a>
            <a
              href="/payments"
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent hover:from-green-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Registrar Pago</p>
                <p className="text-xs text-gray-400">Registrar pago de abonado</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Pagos Recientes</h2>
            <a href="/payments" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Ver todos →
            </a>
          </div>

          {recentPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Droplets className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No hay pagos registrados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-400">
                        {payment.subscriber.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {payment.subscriber.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(payment.paymentDate).toLocaleDateString("es-CR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      ₡{payment.amount.toNumber().toLocaleString()}
                    </p>
                    <span className="badge badge-green text-[10px]">
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
      <div className="glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">15</p>
            <p className="text-sm text-gray-400 mt-1">Lecturas Hoy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">98%</p>
            <p className="text-sm text-gray-400 mt-1">Colección</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">3</p>
            <p className="text-sm text-gray-400 mt-1">Alertas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">45m³</p>
            <p className="text-sm text-gray-400 mt-1">Promedio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
