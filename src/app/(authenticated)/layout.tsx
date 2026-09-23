import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getServerUser } from "@/lib/auth/helper";

const roleLabels: Record<string, string> = {
  PLATFORM_OWNER: "Propietario de plataforma",
  ADMIN: "Administrador",
  ACCOUNTING: "Contabilidad",
  FIELD_STAFF: "Campo",
};

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerUser();

  const initials = session?.user?.email
    ?.split("@")[0]
    ?.split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          userName={session?.user?.email}
          userRole={roleLabels[session?.user?.role ?? ""]}
          initials={initials}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}