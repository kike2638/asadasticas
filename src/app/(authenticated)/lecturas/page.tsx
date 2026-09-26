import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import {
  Gauge,
  Droplets,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import LecturasClient from "./client";

export default async function LecturasPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;

  const readings = await prisma.reading.findMany({
    where: { tenantId },
    include: {
      meter: {
        include: { subscriber: true },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="section-label mb-1.5">Operaciones</p>
        <h1 className="page-title mb-1">Lecturas</h1>
        <p className="page-subtitle">{readings.length} lecturas recientes • modo offline + GPS + foto</p>
      </div>

      <LecturasClient tenantId={tenantId} lectorId={session.user.id} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Lecturas</p>
              <p className="text-xl font-bold text-white">{readings.length}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Promedio Consumo</p>
              <p className="text-xl font-bold text-white">25 m³</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Última Lectura</p>
              <p className="text-xl font-bold text-white">
                {readings.length > 0
                  ? new Date(readings[0].date).toLocaleDateString("es-CR")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "200ms" }}>
        {readings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Gauge className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">No hay lecturas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                    <th>Fecha</th>
                  <th>Abonado</th>
                  <th>Medidor</th>
                  <th>Lectura</th>
                  <th>Estado</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading, index) => (
                  <tr
                    key={reading.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${300 + index * 30}ms` }}
                  >
                    <td>
                      <span className="text-gray-300">
                        {new Date(reading.date).toLocaleDateString("es-CR")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {reading.meter.subscriber.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-white">
                          {reading.meter.subscriber.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        {reading.meter.number}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {reading.value.toString()}
                        </span>
                        <span className="text-sm text-gray-400">m³</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge text-xs ${(reading as any).anomalia !== "NONE" ? "badge-orange" : "badge-green"}`}>
                        {(reading as any).anomalia ?? "OK"}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400 font-mono">
                      {(reading as any).gpsLat ? `${Number((reading as any).gpsLat).toFixed(3)}, ${Number((reading as any).gpsLng).toFixed(3)}` : "—"}
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
