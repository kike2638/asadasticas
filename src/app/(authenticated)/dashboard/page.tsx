import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;

  const [subscriberCount, invoiceCount, pendingInvoices, recentPayments] =
    await Promise.all([
      prisma.subscriber.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } } }),
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

  // Revenue per month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const monthPayments = await prisma.payment.findMany({
    where: { tenantId, status: "PROCESSED", paymentDate: { gte: sixMonthsAgo } },
    select: { amount: true, paymentDate: true },
  });

  const monthBuckets: Record<string, number> = {};
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d
      .toLocaleDateString("es-CR", { month: "short" })
      .replace(".", "");
    monthLabels.push(label);
    monthBuckets[key] = 0;
  }
  for (const p of monthPayments) {
    const d = new Date(p.paymentDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in monthBuckets) monthBuckets[key] += p.amount.toNumber();
  }
  const revenueByMonth = monthLabels.map((label, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { label, value: monthBuckets[`${d.getFullYear()}-${d.getMonth()}`] };
  });

  // Subscribers per category
  const categoryCounts = await prisma.subscriber.groupBy({
    by: ["category"],
    where: { tenantId },
    _count: { _all: true },
  });

  const categoryMeta: Record<string, { label: string; color: string }> = {
    DOMICILIAR: { label: "Domiciliar", color: "#22d3ee" },
    COMERCIAL: { label: "Comercial", color: "#60a5fa" },
    INDUSTRIAL: { label: "Industrial", color: "#a78bfa" },
    PUBLICO: { label: "Público", color: "#fbbf24" },
  };

  const categorySegments = categoryCounts.map((c) => ({
    key: c.category,
    count: c._count._all,
    ...(categoryMeta[c.category] ?? {
      label: c.category,
      color: "#5c6d96",
    }),
  }));

  const kpis = [
    {
      label: "Total abonados",
      value: subscriberCount.toString(),
      delta: "+12%",
      up: true,
      icon: Users,
      tile: "from-sky-400 to-cyan-500",
      glow: "shadow-[0_8px_24px_rgba(34,211,238,0.25)]",
    },
    {
      label: "Facturas emitidas",
      value: invoiceCount.toString(),
      delta: "+8%",
      up: true,
      icon: FileText,
      tile: "from-blue-400 to-indigo-500",
      glow: "shadow-[0_8px_24px_rgba(96,165,250,0.25)]",
    },
    {
      label: "Pendientes",
      value: pendingInvoices.toString(),
      delta: "-3%",
      up: false,
      icon: Clock,
      tile: "from-amber-400 to-orange-500",
      glow: "shadow-[0_8px_24px_rgba(251,191,36,0.25)]",
    },
    {
      label: "Ingresos totales",
      value: formatCurrency(totalRevenue._sum.amount?.toNumber() || 0),
      delta: "+18%",
      up: true,
      icon: TrendingUp,
      tile: "from-emerald-400 to-teal-500",
      glow: "shadow-[0_8px_24px_rgba(52,211,153,0.25)]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
        <div>
          <p className="section-label mb-1.5">Panel de control</p>
          <h1 className="page-title mb-1">Dashboard</h1>
          <p className="page-subtitle">
            Resumen operativo de tu ASADA en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[rgba(96,165,250,0.12)] bg-[rgba(5,10,24,0.6)] px-3.5 py-1.5 w-fit">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[12px] text-secondary">Datos actualizados</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="glass p-5 animate-fade-in hover:border-[rgba(34,211,238,0.35)] transition-colors"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${kpi.tile} ${kpi.glow} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    kpi.up ? "text-emerald-400" : "text-[var(--rose)]"
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
              <p className="text-[24px] font-bold tracking-tight leading-none mb-1.5">
                {kpi.value}
              </p>
              <p className="text-[13px] text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div
          className="lg:col-span-3 glass p-6 animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white">
                Ingresos por mes
              </h2>
              <p className="text-[13px] text-muted mt-0.5">
                Últimos 6 meses
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-secondary">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Evolución</span>
            </div>
          </div>

          {revenueByMonth.every((m) => m.value === 0) ? (
            <EmptyState text="Sin ingresos registrados aún" />
          ) : (
            <RevenueBarChart data={revenueByMonth} />
          )}
        </div>

        <div
          className="lg:col-span-2 glass p-6 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="text-[15px] font-semibold tracking-tight text-white mb-1">
            Abonados por categoría
          </h2>
          <p className="text-[13px] text-muted mb-6">Distribución de cartera</p>

          {categorySegments.length === 0 ? (
            <EmptyState text="Sin abonados todavía" />
          ) : (
            <CategoryDonut segments={categorySegments} total={subscriberCount} />
          )}
        </div>
      </div>

      {/* Quick actions + Recent payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass p-6 animate-fade-in" style={{ animationDelay: "360ms" }}>
          <h2 className="text-[15px] font-semibold tracking-tight text-white mb-1">
            Acciones rápidas
          </h2>
          <p className="text-[13px] text-muted mb-5">
            Operación diaria de tu ASADA
          </p>
          <div className="space-y-1.5">
            <QuickAction
              href="/billing"
              icon={<FileText className="w-5 h-5 text-[var(--brand)]" />}
              title="Nueva factura"
              desc="Generar factura para abonado"
              tint="bg-[rgba(34,211,238,0.1)]"
            />
            <QuickAction
              href="/subscribers"
              icon={<Users className="w-5 h-5 text-[#60a5fa]" />}
              title="Ver abonados"
              desc="Abonados activos del sistema"
              tint="bg-[rgba(96,165,250,0.1)]"
            />
            <QuickAction
              href="/payments"
              icon={<Zap className="w-5 h-5 text-[#34d399]" />}
              title="Registrar pago"
              desc="Registrar pago de un abonado"
              tint="bg-[rgba(52,211,153,0.1)]"
            />
          </div>
        </div>

        <div
          className="lg:col-span-2 glass p-6 animate-fade-in"
          style={{ animationDelay: "420ms" }}
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
              className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] transition-colors"
            >
              Ver todos
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          {recentPayments.length === 0 ? (
            <EmptyState text="No hay pagos registrados aún" />
          ) : (
            <div className="divide-y divide-[rgba(96,165,250,0.08)]">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-soft)] border border-[rgba(34,211,238,0.2)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[var(--brand-hover)]">
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
                      {formatCurrency(payment.amount.toNumber())}
                    </p>
                    <span className="badge badge-cyan text-xs">
                      {payment.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "480ms" }}>
        {[
          { value: "15", label: "Lecturas hoy", icon: Droplets, tint: "text-[var(--brand)]" },
          { value: "98%", label: "Cobrabilidad", icon: TrendingUp, tint: "text-emerald-400" },
          { value: "0", label: "Alertas activas", icon: Clock, tint: "text-amber-400" },
          { value: "45 m³", label: "Consumo promedio", icon: Zap, tint: "text-[#60a5fa]" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass p-5 hover:border-[rgba(34,211,238,0.35)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${stat.tint} shrink-0`} />
                <div>
                  <p className="text-xl font-bold tracking-tight text-white leading-none mb-1">
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-muted">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
  tint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
    >
      <div
        className={`w-10 h-10 rounded-[12px] ${tint} border border-[rgba(96,165,250,0.12)] flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-muted truncate">{desc}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted ml-auto shrink-0 group-hover:text-[var(--brand)] transition-colors" />
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Droplets className="w-8 h-8 text-[rgba(96,165,250,0.3)] mb-3" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function RevenueBarChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 560;
  const H = 200;
  const PAD = 10;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (W - PAD * 2) / data.length;
  const barW = bw * 0.52;
  const innerH = H - 24;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={PAD}
            y1={PAD + (innerH - PAD) * (1 - t)}
            x2={W - PAD}
            y2={PAD + (innerH - PAD) * (1 - t)}
            stroke="rgba(96,165,250,0.08)"
            strokeDasharray="3 4"
          />
        </g>
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * (innerH - PAD - 8);
        const x = PAD + i * bw + (bw - barW) / 2;
        const y = innerH - h;
        const active = i === data.length - 1;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active ? "#67e8f9" : "#38bdf8"} />
                <stop offset="100%" stopColor={active ? "#06b6d4" : "#1d4ed8"} />
              </linearGradient>
            </defs>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 3)}
              rx={5}
              fill={`url(#bar${i})`}
              opacity={active ? 1 : 0.72}
            />
            <text
              x={x + barW / 2}
              y={innerH + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#5c6d96"
            >
              {d.label}
            </text>
            <text
              x={x + barW / 2}
              y={y - 7}
              textAnchor="middle"
              fontSize="11"
              fill="#9aa9c9"
            >
              {d.value > 0 ? `₡${Math.round(d.value / 1000)}k` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CategoryDonut({
  segments,
  total,
}: {
  segments: { key: string; label: string; color: string; count: number }[];
  total: number;
}) {
  const R = 46;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[148px] h-[148px] shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="rgba(96,165,250,0.08)"
            strokeWidth="12"
          />
          {segments.map((seg, i) => {
            const frac = seg.count / total;
            const dash = frac * C;
            const el = (
              <circle
                key={i}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeLinecap="butt"
                strokeDasharray={`${dash - 2} ${C - dash + 2}`}
                strokeDashoffset={-offset * C}
              />
            );
            offset += frac;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white leading-none">{total}</p>
          <p className="text-xs text-muted mt-1">abonados</p>
        </div>
      </div>

      <div className="space-y-2.5 flex-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-[4px] shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-[13px] text-secondary flex-1">{seg.label}</span>
            <span className="text-[13px] font-semibold text-white">
              {seg.count}
            </span>
            <span className="text-xs text-muted w-9 text-right">
              {total > 0 ? Math.round((seg.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}