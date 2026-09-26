import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { calculateSubscription } from "@/lib/saas/pricing";
import CreateTenant from "@/components/admin/CreateTenant";
import TenantsTable from "./tenants-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  if (s.user.role !== "PLATFORM_OWNER") redirect("/dashboard");

  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { subscribers: true, invoices: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = tenants.map(t => {
    const isPlatform = t.slug === "plataforma-admin";
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      subscriptionStatus: t.subscriptionStatus,
      trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      abonados: isPlatform ? 0 : t._count.subscribers,
      facturas: t._count.invoices,
      mrr: isPlatform ? 0 : calculateSubscription(t._count.subscribers).montoCRC,
      isPlatform,
    };
  });

  const totalMRR = rows.reduce((a, r) => a + r.mrr, 0);
  const activas = rows.filter(r => r.status === "ACTIVE").length;
  const trials = rows.filter(r => r.subscriptionStatus === "TRIAL").length;
  const suspensas = rows.filter(r => r.status === "SUSPENDED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Plataforma • Superadmin</p>
          <h1 className="page-title">Gestión de ASADAS</h1>
          <p className="page-subtitle">{rows.length} ASADAS • MRR estimado {formatCurrency(totalMRR)}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/subscriptions" className="btn-primary">Validar SINPE →</a>
          <CreateTenant />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 text-center"><p className="text-2xl font-bold text-white">{rows.length}</p><p className="text-xs text-muted">ASADAS totales</p></div>
        <div className="glass rounded-2xl p-5 text-center border border-emerald-500/20"><p className="text-2xl font-bold text-emerald-400">{activas}</p><p className="text-xs text-muted">Activas</p></div>
        <div className="glass rounded-2xl p-5 text-center border border-cyan-500/20"><p className="text-2xl font-bold text-cyan-400">{trials}</p><p className="text-xs text-muted">En trial</p></div>
        <div className="glass rounded-2xl p-5 text-center border border-red-500/20"><p className="text-2xl font-bold text-red-400">{suspensas}</p><p className="text-xs text-muted">Suspendidas</p></div>
      </div>

      <TenantsTable tenants={rows} />
    </div>
  );
}
