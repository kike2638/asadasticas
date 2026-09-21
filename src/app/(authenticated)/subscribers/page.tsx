import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Droplets,
  MoreVertical,
  Eye,
} from "lucide-react";

export default async function SubscribersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

  const subscribers = await prisma.subscriber.findMany({
    where: { tenantId },
    include: { meters: true },
    orderBy: { nis: "asc" },
  });

  const categoryColors: Record<string, string> = {
    DOMICILIAR: "badge-blue",
    COMERCIAL: "badge-purple",
    INDUSTRIAL: "badge-orange",
    PUBLICO: "badge-cyan",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Abonados</h1>
          <p className="text-gray-400">{subscribers.length} abonados registrados</p>
        </div>
        <Link
          href="/subscribers/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Abonado
        </Link>
      </div>

      {/* Search Bar */}
      <div className="glass rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o NIS..."
            className="input-modern pl-12"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{subscribers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {subscribers.filter((s) => s.category === "DOMICILIAR").length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Domiciliar</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {subscribers.filter((s) => s.category === "COMERCIAL").length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Comercial</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">
            {subscribers.filter((s) => s.category === "PUBLICO").length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Público</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "300ms" }}>
        {subscribers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-4">No hay abonados registrados</p>
            <Link href="/subscribers/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Agregar Primer Abonado
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>NIS</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Medidor</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub, index) => (
                  <tr
                    key={sub.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                  >
                    <td>
                      <span className="font-mono text-sm text-gray-300 bg-white/5 px-2 py-1 rounded">
                        {sub.nis}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {sub.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-white">{sub.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${categoryColors[sub.category] || "badge-blue"}`}>
                        {sub.category}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        {sub.meters.length > 0 ? sub.meters[0].number : "—"}
                      </div>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/subscribers/${sub.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
