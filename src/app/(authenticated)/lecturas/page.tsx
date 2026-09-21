import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function LecturasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lecturas</h1>
        <p className="text-gray-500">{readings.length} lecturas recientes</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="p-4">Fecha</th>
              <th className="p-4">Abonado</th>
              <th className="p-4">Medidor</th>
              <th className="p-4">Lectura (m³)</th>
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No hay lecturas registradas
                </td>
              </tr>
            ) : (
              readings.map((reading) => (
                <tr
                  key={reading.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-4 text-sm">
                    {new Date(reading.date).toLocaleDateString("es-CR")}
                  </td>
                  <td className="p-4">{reading.meter.subscriber.name}</td>
                  <td className="p-4 font-mono text-sm">{reading.meter.number}</td>
                  <td className="p-4 font-medium">{reading.value.toString()} m³</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
