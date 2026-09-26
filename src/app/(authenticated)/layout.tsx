import { AppShell } from "@/components/layout/AppShell";
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
    <AppShell
      userName={session?.user?.email}
      userRole={roleLabels[session?.user?.role ?? ""]}
      initials={initials}
    >
      {children}
    </AppShell>
  );
}