import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import NotificacionesClient from "./client";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId }, select: { sinpeNumero: true, sinpeNombre: true } });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const logs = await prisma.notificationLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 });
  const totalEnviados = await prisma.notificationLog.count({ where: { tenantId, status: { in: ["SENT", "SIMULADO"] } } });
  const pendientes = await prisma.invoice.count({ where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } } });

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">WhatsApp • Recordatorios</p>
        <h1 className="page-title">Notificaciones</h1>
        <p className="page-subtitle">{tenant?.name} • {cfg?.sinpeNumero ? `SINPE ${cfg.sinpeNumero}` : "Sin SINPE"} • {totalEnviados} enviados • {pendientes} facturas pendientes</p>
      </div>
      <NotificacionesClient sinpe={cfg?.sinpeNumero ?? null} logs={logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))} />
    </div>
  );
}
