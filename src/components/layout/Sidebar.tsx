"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Gauge,
  LogOut,
  Droplets,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navMain = [
  {
    label: "Panel",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/subscribers", label: "Abonados", icon: Users },
      { href: "/billing", label: "Facturación", icon: FileText },
      { href: "/bulk", label: "Fact. masiva", icon: FileText },
      { href: "/payments", label: "Pagos / Caja", icon: CreditCard },
      { href: "/lecturas", label: "Lecturas campo", icon: Gauge },
    ],
  },
  {
    label: "Reportes AyA",
    items: [
      { href: "/morosidad", label: "Morosidad", icon: Gauge },
      { href: "/caja", label: "Arqueo", icon: CreditCard },
      { href: "/reportes", label: "Reportes", icon: FileText },
      { href: "/junta", label: "Junta Directiva", icon: FileText },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { href: "/mapa", label: "Mapa abonados", icon: Gauge },
      { href: "/suscripcion", label: "Suscripción", icon: CreditCard },
      { href: "/configuracion", label: "Configuración", icon: FileText },
      { href: "/conciliacion", label: "Conciliación", icon: CreditCard },
      { href: "/notificaciones", label: "Notificaciones", icon: FileText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logoUrl: string | null; sinpe: string | null } | null>(null);
  // Carga logo+SINPE individual por ASADA
  useState(() => {
    if (typeof window !== "undefined") fetch("/api/tenant/info").then(r => r.json()).then(d => setTenantInfo({ name: d.tenant?.name ?? "ASADAS", logoUrl: d.tenant?.logoUrl ?? null, sinpe: d.config?.sinpeNumero ?? null })).catch(() => {});
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      className={`relative shrink-0 h-screen sticky top-0 flex flex-col transition-[width] duration-300 border-r border-[rgba(96,165,250,0.08)] bg-[rgba(5,9,22,0.72)] ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center border-b border-[rgba(96,165,250,0.08)] ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-[0_6px_24px_rgba(34,211,238,0.35)] shrink-0 overflow-hidden">
            {tenantInfo?.logoUrl ? <img src={tenantInfo.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <Droplets className="w-5 h-5 text-[#042635]" />}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold tracking-tight leading-none truncate">{tenantInfo?.name ?? "ASADAS"}<span className="ml-1.5 text-[10px] font-semibold text-[var(--brand)] align-super">v2</span></p>
              <p className="text-[11px] text-muted mt-1 leading-none truncate">{tenantInfo?.sinpe ? `SINPE ${tenantInfo.sinpe}` : "Gestión de Agua"}</p>
            </div>
          )}
        </div>
        {!collapsed ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors hidden lg:flex"
            aria-label="Colapsar menú"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-[26px] p-1 rounded-full bg-[#0d1428] border border-[rgba(96,165,250,0.2)] text-muted hover:text-white transition-colors hidden lg:flex"
            aria-label="Expandir menú"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 px-2">
            {navMain.flatMap((g) => g.items).map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
                collapsed
              />
            ))}
          </div>
        ) : (
          navMain.map((group) => (
            <div key={group.label} className="mb-6 px-4">
              <p className="section-label mb-2 px-3">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* System status + logout */}
      {!collapsed && (
        <div className="mx-4 mb-3 p-3 rounded-xl border border-[rgba(96,165,250,0.1)] bg-[rgba(34,211,238,0.05)]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <div className="text-[12px] leading-tight">
              <p className="text-white font-medium">Sistema operativo</p>
              <p className="text-muted">Base de datos conectada</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-[rgba(96,165,250,0.08)]">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-xl text-sm font-medium text-secondary hover:text-[var(--rose)] hover:bg-[rgba(251,113,133,0.08)] transition-all w-full px-3 py-2.5 ${
            collapsed ? "justify-center" : ""
          }`}
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
          active
            ? "text-[#042635] bg-[var(--brand-grad)] shadow-[0_6px_16px_rgba(34,211,238,0.3)]"
            : "text-muted hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        active
          ? "text-white bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.2)]"
          : "text-secondary hover:text-white hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      {active && (
        <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--brand-grad)] shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
      )}
      <Icon
        className={`w-5 h-5 shrink-0 ${active ? "text-[var(--brand)]" : "text-muted group-hover:text-white"}`}
      />
      <span>{label}</span>
    </Link>
  );
}