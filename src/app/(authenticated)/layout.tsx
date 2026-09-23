import { Sidebar } from "@/components/layout/Sidebar";
import { getServerUser } from "@/lib/auth/helper";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerUser();

  const roleLabels: Record<string, string> = {
    PLATFORM_OWNER: "Plataforma",
    ADMIN: "Administrador",
    ACCOUNTING: "Contabilidad",
    FIELD_STAFF: "Campo",
  };

  const today = new Date().toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const initials =
    session?.user?.email
      ?.split("@")[0]
      ?.replace(/[._-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-[#1f1f25] bg-[#0a0a0c]/80 backdrop-blur flex items-center justify-between px-6 lg:px-8">
          <p className="text-sm capitalize text-muted">{today}</p>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-sky-500/20">
              {initials}
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-medium text-white">
                {session?.user?.email ?? "Usuario"}
              </p>
              <p className="text-xs text-muted">
                {roleLabels[session?.user?.role ?? ""] ?? ""}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}