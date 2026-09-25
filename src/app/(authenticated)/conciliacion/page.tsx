import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import ConciliacionClient from "./conciliacion-client";

export const dynamic = "force-dynamic";

export default async function ConciliacionPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId }, select: { sinpeNumero: true, sinpeNombre: true, sinpeBanco: true } });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } });
  const pending = await prisma.invoice.count({ where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } } });

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Conciliación bancaria</p>
        <h1 className="page-title">Banco → Pagos</h1>
        <p className="page-subtitle">
          {tenant?.name} • {cfg?.sinpeNumero ? `SINPE ${cfg.sinpeNumero} • ${cfg.sinpeBanco}` : "⚠️ Sin SINPE configurado"} • {pending} facturas pendientes
        </p>
      </div>
      <ConciliacionClient sinpe={cfg?.sinpeNumero ?? null} sinpeNombre={cfg?.sinpeNombre ?? null} role={s.user.role ?? "ADMIN"} tenantSlug={tenant?.slug ?? ""} />
    </div>
  );
}
