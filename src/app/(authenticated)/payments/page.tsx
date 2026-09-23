import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
} from "lucide-react";

export default async function PaymentsPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;

  const payments = await prisma.payment.findMany({
    where: { tenantId },
    include: { subscriber: true, invoice: true },
    orderBy: { paymentDate: "desc" },
    take: 50,
  });

  const totalPayments = payments.reduce(
    (sum, p) => sum + p.amount.toNumber(),
    0
  );

  const methodColors: Record<string, string> = {
    SINPE_MOVIL: "badge-cyan",
    TRANSFERENCIA: "badge-blue",
    EFECTIVO: "badge-green",
    TARJETA: "badge-purple",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-1">Pagos</h1>
        <p className="text-gray-400">{payments.length} pagos registrados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Recibido</p>
              <p className="text-xl font-bold text-white">
                ₡{totalPayments.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Transacciones</p>
              <p className="text-xl font-bold text-white">{payments.length}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Último Pago</p>
              <p className="text-xl font-bold text-white">
                {payments.length > 0
                  ? new Date(payments[0].paymentDate).toLocaleDateString("es-CR")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "200ms" }}>
        {payments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">No hay pagos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Abonado</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${300 + index * 30}ms` }}
                  >
                    <td>
                      <span className="text-gray-300">
                        {new Date(payment.paymentDate).toLocaleDateString("es-CR")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {payment.subscriber.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-white">
                          {payment.subscriber.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-white">
                        {formatCurrency(payment.amount.toNumber())}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${methodColors[payment.paymentMethod] || "badge-blue"}`}>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-gray-400">
                        {payment.referenceNumber || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          payment.status === "PROCESSED" ? "badge-green" : "badge-red"
                        }`}
                      >
                        {payment.status === "PROCESSED" ? "Procesado" : "Revertido"}
                      </span>
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
