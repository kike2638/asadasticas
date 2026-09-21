import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

  const payments = await prisma.payment.findMany({
    where: { tenantId },
    include: { subscriber: true, invoice: true },
    orderBy: { paymentDate: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-500">{payments.length} pagos registrados</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="p-4">Fecha</th>
              <th className="p-4">Abonado</th>
              <th className="p-4">Monto</th>
              <th className="p-4">Método</th>
              <th className="p-4">Referencia</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No hay pagos registrados
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-4 text-sm">
                    {new Date(payment.paymentDate).toLocaleDateString("es-CR")}
                  </td>
                  <td className="p-4">{payment.subscriber.name}</td>
                  <td className="p-4 font-medium">
                    {formatCurrency(payment.amount.toNumber())}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {payment.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 font-mono">
                    {payment.referenceNumber || "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        payment.status === "PROCESSED"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {payment.status}
                    </span>
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
