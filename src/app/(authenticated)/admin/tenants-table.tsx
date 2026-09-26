"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Eye, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import StatusToggle from "./status-toggle";

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  abonados: number;
  facturas: number;
  mrr: number;
  isPlatform: boolean;
}

const statusBadge: Record<string, string> = {
  ACTIVE: "badge-green",
  SUSPENDED: "badge-red",
  INACTIVE: "badge-gray",
};

export default function TenantsTable({ tenants }: { tenants: TenantRow[] }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("ALL");
  const [plan, setPlan] = useState("ALL");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tenants.filter(t =>
      (t.name.toLowerCase().includes(term) || t.slug.includes(term)) &&
      (estado === "ALL" || t.status === estado) &&
      (plan === "ALL" || t.plan === plan)
    );
  }, [tenants, q, estado, plan]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            aria-label="Buscar ASADAS"
            className="input-modern w-full pl-9"
          />
        </div>
        <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado" className="select-modern py-2 text-sm">
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVE">Activa</option>
          <option value="SUSPENDED">Suspendida</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
        <select value={plan} onChange={e => setPlan(e.target.value)} aria-label="Filtrar por plan" className="select-modern py-2 text-sm">
          <option value="ALL">Todos los planes</option>
          <option value="BASIC">BASIC</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
        <span className="text-xs text-muted ml-auto">{rows.length} de {tenants.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>ASADA</th>
              <th>Plan</th>
              <th>Abonados</th>
              <th>Facturas</th>
              <th>MRR</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id}>
                <td>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4 text-cyan-400" /></div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{t.name}</p>
                      <p className="font-mono text-xs text-muted truncate">/{t.slug}{t.isPlatform && " • plataforma"}</p>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-cyan">{t.plan}</span></td>
                <td className="text-white">{t.abonados}</td>
                <td className="text-gray-300">{t.facturas}</td>
                <td className="text-white font-medium">{formatCurrency(t.mrr)}</td>
                <td>
                  <span className={`badge ${statusBadge[t.status] ?? "badge-gray"}`}>{t.status}</span>
                  {t.subscriptionStatus === "TRIAL" && (
                    <span className="badge badge-cyan ml-1">TRIAL{t.trialEndsAt ? ` ${new Date(t.trialEndsAt).toLocaleDateString("es-CR")}` : ""}</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/${t.id}`} aria-label={`Ver detalle de ${t.name}`} title="Ver detalle" className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-300 hover:bg-white/10 min-h-11 min-w-11 inline-flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {!t.isPlatform && <StatusToggle id={t.id} status={t.status} name={t.name} className="px-3 py-2 text-xs" />}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted">Ninguna ASADA coincide con la búsqueda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
