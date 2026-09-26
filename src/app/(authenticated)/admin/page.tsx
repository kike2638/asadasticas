import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import CreateTenant from "@/components/admin/CreateTenant";

export default async function AdminPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  if (s.user.role !== "PLATFORM_OWNER") redirect("/dashboard");

  const tenants = await prisma.tenant.findMany({ include: { _count: { select: { subscribers: true, invoices: true } } }, orderBy: { createdAt: "desc" } });
  const { calculateSubscription } = await import("@/lib/saas/pricing");
  let totalMRR = 0;
  for (const t of tenants) {
    if (t.slug === "plataforma-admin") continue;
    // @ts-ignore
    const c = await prisma.subscriber.count({ where: { tenantId: t.id } });
    totalMRR += calculateSubscription(c).montoCRC;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="section-label">SaaS Admin • Superadmin 87607243</p><h1 className="page-title">Plataforma</h1><p className="page-subtitle">{tenants.length} ASADAS • MRR estimado {formatCurrency(totalMRR)}</p></div>
        <div className="flex items-center gap-3">
          <a href="/admin/subscriptions" className="btn-primary">Validar SINPE →</a>
          <CreateTenant />
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="table-modern"><thead><tr><th>ASADA</th><th>Slug</th><th>Plan</th><th>Abonados</th><th>Facturas</th><th>Estado</th></tr></thead>
          <tbody>{tenants.map(t => <tr key={t.id}><td className="text-white font-medium">{t.name}</td><td className="font-mono text-xs text-gray-400">{t.slug}</td><td><span className="badge badge-cyan">{t.plan}</span></td><td>{t._count.subscribers}</td><td>{t._count.invoices}</td><td><span className={`badge ${t.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>{t.status}</span> {t.subscriptionStatus === "TRIAL" && <span className="badge badge-cyan ml-1">TRIAL{t.trialEndsAt ? ` ${new Date(t.trialEndsAt).toLocaleDateString("es-CR")}` : ""}</span>}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
