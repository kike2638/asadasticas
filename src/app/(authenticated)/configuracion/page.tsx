import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import ConfigClient from "./config-client";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  const tenantId = s.user.tenantId;

  const tenant: any = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const cfg = await prisma.tenantConfig.findUnique({ where: { tenantId } });

  if (!cfg) return <div className="glass p-8 text-center text-muted">Sin configuración — complete onboarding</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Administración</p>
        <h1 className="page-title">Configuración ASADA</h1>
        <p className="page-subtitle">{tenant?.name} • {tenant?.slug} • Edita SINPE, Hacienda y tarifas</p>
      </div>
      <ConfigClient
        tenantInfo={{
          logoUrl: tenant?.logoUrl ?? null,
          telefono: tenant?.telefono ?? "",
          email: tenant?.email ?? "",
          direccion: tenant?.direccion ?? "",
        }}
        initial={{
          tenantName: tenant?.name ?? "",
          cedulaJuridica: tenant?.cedulaJuridica ?? "",
          sinpeNumero: cfg.sinpeNumero ?? "",
          sinpeNombre: cfg.sinpeNombre ?? "",
          sinpeBanco: cfg.sinpeBanco ?? "BNCR",
          sinpeNumero2: cfg.sinpeNumero2 ?? "",
          sinpeNombre2: cfg.sinpeNombre2 ?? "",
          whatsappNumero: (cfg as any).whatsappNumero ?? "",
          whatsappNombre: (cfg as any).whatsappNombre ?? "",
          whatsappPhoneId: (cfg as any).whatsappPhoneId ?? "",
          whatsappToken: "",
          tprhDomiciliar: Number(cfg.tprhDomiciliar),
          tprhComercial: Number(cfg.tprhComercial),
          hidrantesMensual: Number(cfg.hidrantesMensual),
          haciendaUser: cfg.haciendaUser,
          sucursal: cfg.sucursal,
          terminal: cfg.terminal,
        }}
        role={s.user.role ?? "ADMIN"}
      />
    </div>
  );
}
