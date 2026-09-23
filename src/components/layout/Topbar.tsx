"use client";

import { usePathname } from "next/navigation";

const sections: Record<string, { group: string; title: string }> = {
  "/dashboard": { group: "Panel", title: "Dashboard" },
  "/subscribers": { group: "Operaciones", title: "Abonados" },
  "/billing": { group: "Operaciones", title: "Facturación" },
  "/payments": { group: "Operaciones", title: "Pagos" },
  "/lecturas": { group: "Operaciones", title: "Lecturas" },
};

export function Topbar({
  userName,
  userRole,
  initials,
}: {
  userName?: string | null;
  userRole?: string;
  initials?: string;
}) {
  const pathname = usePathname();
  const section = Object.entries(sections).find(([href]) =>
    pathname.startsWith(href)
  )?.[1];

  const today = new Date().toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="h-16 shrink-0 border-b border-[rgba(96,165,250,0.08)] bg-[rgba(5,9,22,0.6)] backdrop-blur-xl flex items-center justify-between px-6 lg:px-8">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        {section && (
          <>
            <span className="text-[13px] text-muted">{section.group}</span>
            <Chevron />
            <span className="text-[13px] text-white font-medium">{section.title}</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-[rgba(96,165,250,0.12)] bg-[rgba(5,10,24,0.6)] px-3.5 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[12px] text-secondary capitalize">{today}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-grad)] flex items-center justify-center text-[13px] font-bold text-[#042635] shadow-[0_4px_16px_rgba(34,211,238,0.35)]">
            {initials ?? "U"}
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-[13px] font-medium text-white max-w-[180px] truncate">
              {userName ?? "Usuario"}
            </p>
            <p className="text-[11px] text-muted">{userRole ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}