import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

  const [subscriberCount, invoiceCount, pendingInvoices, recentPayments] =
    await Promise.all([
      prisma.subscriber.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, status: "PENDING" } }),
      prisma.payment.findMany({
        where: { tenantId },
        orderBy: { paymentDate: "desc" },
        take: 5,
        include: { subscriber: true },
      }),
    ]);

  const totalRevenue = await prisma.payment.aggregate({
    where: { tenantId, status: "PROCESSED" },
    _sum: { amount: true },
  });

  const kpis = [
    {
      label: "Total Abonados",
      value: subscriberCount.toString(),
      icon: "👥",
      color: "bg-blue-500",
    },
    {
      label: "Facturas Totales",
      value: invoiceCount.toString(),
      icon: "📄",
      color: "bg-green-500",
    },
    {
      label: "Facturas Pendientes",
      value: pendingInvoices.toString(),
      icon: "⏳",
      color: "bg-yellow-500",
    },
    {
      label: "Ingresos Totales",
      value: formatCurrency(totalRevenue._sum.amount?.toNumber() || 0),
      icon: "💰",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu ASADA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-lg shadow p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {kpi.value}
                </p>
              </div>
              <div
                className={`${kpi.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-xl`}
              >
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Pagos Recientes
          </h2>
        </div>
        <div className="p-6">
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay pagos registrados aún
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3">Abonado</th>
                  <th className="pb-3">Monto</th>
                  <th className="pb-3">Método</th>
                  <th className="pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b last:border-0"
                  >
                    <td className="py-3">{payment.subscriber.name}</td>
                    <td className="py-3 font-medium">
                      {formatCurrency(payment.amount.toNumber())}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(payment.paymentDate).toLocaleDateString("es-CR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
