import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownToLine, PiggyBank, Clock, Lightbulb } from "lucide-react";
import WithdrawForm from "./withdraw-form";

export const dynamic = "force-dynamic";

const badgeTipo: Record<string, string> = {
  DEPOSITO_BANCO: "badge-cyan",
  OPERATIVO: "badge-gray",
  UTILIDADES: "badge-green",
};

const labelTipo: Record<string, string> = {
  DEPOSITO_BANCO: "Depósito banco",
  OPERATIVO: "Operativo",
  UTILIDADES: "Utilidades",
};

export default async function CajaPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");
  const tenantId = session.user.tenantId;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pagosHoy, cierreHoy, ingresosMesAgg, efectivoMesAgg, efectivo7Agg, retirosMes, retirosHist] = await Promise.all([
    prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: today } }, include: { subscriber: true } }),
    prisma.cashClosing.findFirst({ where: { tenantId, fecha: { gte: today } }, orderBy: { fecha: "desc" } }),
    prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: inicioMes } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: inicioMes }, paymentMethod: "EFECTIVO" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: hace7 }, paymentMethod: "EFECTIVO" }, _sum: { amount: true } }),
    prisma.cashWithdrawal.groupBy({ by: ["tipo"], where: { tenantId, fecha: { gte: inicioMes } }, _sum: { monto: true } }),
    prisma.cashWithdrawal.findMany({ where: { tenantId }, orderBy: { fecha: "desc" }, take: 20, include: { responsable: { select: { name: true, email: true } } } }),
  ]);

  const totalHoy = pagosHoy.reduce((s, p) => s + p.amount.toNumber(), 0);
  const porMetodo = pagosHoy.reduce((a, p) => { const k = p.paymentMethod; a[k] = (a[k] || 0) + p.amount.toNumber(); return a; }, {} as Record<string, number>);

  const ingresosMes = Number(ingresosMesAgg._sum.amount ?? 0);
  const efectivoMes = Number(efectivoMesAgg._sum.amount ?? 0);
  const efectivo7 = Number(efectivo7Agg._sum.amount ?? 0);
  const porTipo = Object.fromEntries(retirosMes.map(r => [r.tipo, Number(r._sum.monto ?? 0)])) as Record<string, number>;
  const retirosMesTotal = Object.values(porTipo).reduce((a, b) => a + b, 0);
  const operativosYUtil = (porTipo.OPERATIVO || 0) + (porTipo.UTILIDADES || 0);

  const saldoEfectivo = efectivoMes - retirosMesTotal;
  const excedente = ingresosMes - operativosYUtil;
  const umbral = (efectivo7 / 7) * 3;
  const sugerido = saldoEfectivo - umbral;

  const ultimo = retirosHist[0];
  const diasDesdeRetiro = ultimo ? Math.floor((Date.now() - ultimo.fecha.getTime()) / (24 * 60 * 60 * 1000)) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Caja</p>
        <h1 className="page-title">Arqueo diario y retiros</h1>
        <p className="page-subtitle">{pagosHoy.length} pagos hoy • {formatCurrency(totalHoy)} • Saldo de efectivo del mes {formatCurrency(saldoEfectivo)}</p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted"><ArrowDownToLine className="w-3.5 h-3.5" aria-hidden="true" />Efectivo del mes</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(saldoEfectivo)}</p>
          <p className="text-xs text-muted">después de retiros</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted"><PiggyBank className="w-3.5 h-3.5" aria-hidden="true" />Excedente del mes</p>
          <p className={`text-xl font-bold mt-1 ${excedente >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(excedente)}</p>
          <p className="text-xs text-muted">ingresos − operativos − utilidades</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted"><Clock className="w-3.5 h-3.5" aria-hidden="true" />Último retiro</p>
          <p className="text-xl font-bold text-white mt-1">{diasDesdeRetiro === null ? "—" : diasDesdeRetiro === 0 ? "Hoy" : `Hace ${diasDesdeRetiro} días`}</p>
          <p className="text-xs text-muted">{ultimo ? formatCurrency(Number(ultimo.monto)) : "sin retiros registrados"}</p>
        </div>
        <div className={`rounded-xl p-4 border ${sugerido > 0 ? "bg-emerald-500/10 border-emerald-500/25" : "bg-white/[0.04] border-white/10"}`}>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />¿Retirar hoy?</p>
          <p className={`text-xl font-bold mt-1 ${sugerido > 0 ? "text-emerald-400" : "text-white"}`}>{sugerido > 0 ? formatCurrency(sugerido) : "Todavía no"}</p>
          <p className="text-xs text-muted">{sugerido > 0 ? "sobre el mínimo de 3 días" : `faltan ${formatCurrency(Math.max(0, -sugerido))}`}</p>
        </div>
      </div>

      {/* Regla de retiro */}
      <div className={`p-4 rounded-xl border text-sm flex flex-col md:flex-row md:items-center gap-3 ${sugerido > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-gray-300"}`}>
        <Lightbulb className="w-5 h-5 shrink-0" aria-hidden="true" />
        <p>
          {sugerido > 0 ? (
            <>Retirá al banco <strong>{formatCurrency(sugerido)}</strong>: tu efectivo supera los 3 días de cobro promedio ({formatCurrency(umbral)}). Dejá ese mínimo para el giro de la semana.</>
          ) : (
            <>Regla de oro: conservá en caja <strong>{formatCurrency(umbral)}</strong> (3 días de cobro en efectivo) y retirá lo que supere eso al banco. Con esa regla {saldoEfectivo > 0 ? `aún te faltan ${formatCurrency(Math.max(0, -sugerido))}` : "este mes no hay excedente de efectivo"}.</>
          )}
          {excedente > 0 && <> El excedente del mes ({formatCurrency(excedente)}) podés repartirlo como <strong>utilidades</strong> después de cuadrar la caja.</>}
        </p>
      </div>

      {/* Registrar retiro */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Registrar retiro</h3>
          <WithdrawForm excedente={excedente} saldo={saldoEfectivo} />
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold text-white">Últimos retiros</h3>
            <p className="text-xs text-muted mt-0.5">Historial de depósitos, operativos y utilidades</p>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="table-modern">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th className="text-right">Monto</th></tr></thead>
              <tbody>
                {retirosHist.map(r => (
                  <tr key={r.id}>
                    <td className="text-gray-300 text-sm">{r.fecha.toLocaleDateString("es-CR")}<span className="text-muted ml-2">{r.fecha.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</span></td>
                    <td><span className={`badge ${badgeTipo[r.tipo] ?? "badge-gray"}`}>{labelTipo[r.tipo] ?? r.tipo}</span></td>
                    <td className="text-sm text-gray-300">
                      <span className="block truncate max-w-[180px]">{r.motivo || "—"}</span>
                      <span className="text-xs text-muted">{r.responsable.name ?? r.responsable.email}</span>
                    </td>
                    <td className="text-right font-semibold text-white">{formatCurrency(Number(r.monto))}</td>
                  </tr>
                ))}
                {retirosHist.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted">Sin retiros registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagos de hoy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries({ EFECTIVO: porMetodo.EFECTIVO || 0, SINPE_MOVIL: porMetodo.SINPE_MOVIL || 0, TRANSFERENCIA: porMetodo.TRANSFERENCIA || 0, TARJETA: porMetodo.TARJETA || 0 }).map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-4 text-center"><p className="text-sm text-muted">{k}</p><p className="text-lg font-bold text-white">{formatCurrency(v)}</p></div>
        ))}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>Hora</th><th>Abonado</th><th>Monto</th><th>Método</th><th>Ref</th></tr></thead><tbody>
          {pagosHoy.map(p => <tr key={p.id}><td className="text-gray-300">{new Date(p.paymentDate).toLocaleTimeString("es-CR")}</td><td className="text-white">{p.subscriber.name}</td><td className="text-white font-semibold">{formatCurrency(p.amount.toNumber())}</td><td><span className="badge badge-cyan">{p.paymentMethod}</span></td><td className="font-mono text-xs text-gray-400">{p.referenceNumber ?? "-"}</td></tr>)}
        </tbody></table></div>
      </div>
      {cierreHoy ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          Caja cerrada hoy {new Date(cierreHoy.fecha).toLocaleTimeString("es-CR")} por {cierreHoy.responsableId.slice(0, 8)} - Total {formatCurrency(Number(cierreHoy.total))} - no se puede volver a cerrar
        </div>
      ) : pagosHoy.length === 0 ? (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">Sin pagos hoy - nada que cerrar</div>
      ) : (
        <form action={async () => {
          "use server";
          const { prisma: p } = await import("@/lib/prisma");
          const s = await getServerUser();
          if (!s) return;
          const today2 = new Date(); today2.setHours(0, 0, 0, 0);
          const exists = await p.cashClosing.findFirst({ where: { tenantId: s.user.tenantId, fecha: { gte: today2 } } });
          if (exists) return;
          await p.cashClosing.create({ data: { tenantId: s.user.tenantId, responsableId: s.user.id, montoEfectivo: porMetodo.EFECTIVO || 0, montoSinpe: porMetodo.SINPE_MOVIL || 0, montoTransferencia: porMetodo.TRANSFERENCIA || 0, montoTarjeta: porMetodo.TARJETA || 0, total: totalHoy, estado: "CERRADO" } as any });
        }} >
          <button className="btn-primary">Cerrar caja hoy - {formatCurrency(totalHoy)} ({pagosHoy.length} pagos)</button>
        </form>
      )}
    </div>
  );
}
