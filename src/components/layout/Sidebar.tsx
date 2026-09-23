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
    label: "Inicio",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { href: "/subscribers", label: "Abonados", icon: Users },
      { href: "/billing", label: "Facturación", icon: FileText },
      { href: "/payments", label: "Pagos", icon: CreditCard },
      { href: "/lecturas", label: "Lecturas", icon: Gauge },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      className={`h-screen sticky top-0 shrink-0 bg-[#0c0c0f] border-r border-[#1f1f25] flex flex-col transition-[width] duration-300 ${
        collapsed ? "w-[76px]" : "w-60"
      }`}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center border-b border-[#1f1f25] ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight text-white leading-none">
                ASADAS
              </p>
              <p className="text-[11px] text-secondary mt-1 leading-none tracking-wide">
                ERP · Agua
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors hidden lg:flex"
            aria-label="Colapsar menú"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-[26px] p-1 rounded-full bg-[#121216] border border-[#232329] text-muted hover:text-white transition-colors hidden lg:flex"
            aria-label="Expandir menú"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {!collapsed &&
          navMain.map((group) => (
            <div key={group.label} className="mb-6 px-4">
              <p className="section-label mb-2 px-2">{group.label}</p>
              <div className="space-y-0.5">
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
          ))}
        {collapsed && (
          <div className="flex flex-col items-center gap-1 px-2">
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
        )}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#1f1f25]">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-xl text-sm font-medium text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all w-full px-3 py-2.5 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
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
            ? "text-sky-400 bg-sky-500/10"
            : "text-muted hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon className="w-5 h-5" />
        {active && <span className="absolute left-0 w-[3px] h-5 rounded-full bg-sky-400" />}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        active
          ? "text-white bg-white/[0.04]"
          : "text-secondary hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute left-0 w-[3px] h-5 rounded-full bg-sky-400" />
      )}
      <Icon
        className={`w-5 h-5 shrink-0 ${active ? "text-sky-400" : "text-muted group-hover:text-white"}`}
      />
      <span>{label}</span>
    </Link>
  );
}