import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SubscribersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

  const subscribers = await prisma.subscriber.findMany({
    where: { tenantId },
    include: { meters: true },
    orderBy: { nis: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonados</h1>
          <p className="text-gray-500">{subscribers.length} abonados registrados</p>
        </div>
        <Link
          href="/subscribers/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + Nuevo Abonado
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="p-4">NIS</th>
              <th className="p-4">Nombre</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Medidor</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No hay abonados registrados. Importe un CSV o agregue uno nuevo.
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-4 font-mono text-sm">{sub.nis}</td>
                  <td className="p-4">{sub.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                      {sub.category}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {sub.meters.length > 0 ? sub.meters[0].number : "Sin medidor"}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/subscribers/${sub.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
