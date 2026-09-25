import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default async function CajaPage() {
  const session = await getServerUser();
  if (!session) redirect("/login");
  const tenantId = session.user.tenantId;

  const today = new Date(); today.setHours(0,0,0,0);
  const pagosHoy = await prisma.payment.findMany({ where: { tenantId, paymentDate: { gte: today } }, include: { subscriber: true } });
  const totalHoy = pagosHoy.reduce((s,p)=>s+p.amount.toNumber(),0);
  const porMetodo = pagosHoy.reduce((a,p)=>{ const k=p.paymentMethod; a[k]=(a[k]||0)+p.amount.toNumber(); return a; }, {} as Record<string,number>);

  return (
    <div className="space-y-6">
      <div><p className="section-label">Caja</p><h1 className="page-title">Arqueo diario</h1><p className="page-subtitle">{pagosHoy.length} pagos hoy • {formatCurrency(totalHoy)}</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries({ EFECTIVO: porMetodo.EFECTIVO||0, SINPE_MOVIL: porMetodo.SINPE_MOVIL||0, TRANSFERENCIA: porMetodo.TRANSFERENCIA||0, TARJETA: porMetodo.TARJETA||0 }).map(([k,v])=>(
          <div key={k} className="glass rounded-xl p-4 text-center"><p className="text-sm text-muted">{k}</p><p className="text-lg font-bold text-white">{formatCurrency(v)}</p></div>
        ))}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>Hora</th><th>Abonado</th><th>Monto</th><th>Método</th><th>Ref</th></tr></thead><tbody>
          {pagosHoy.map(p=><tr key={p.id}><td className="text-gray-300">{new Date(p.paymentDate).toLocaleTimeString("es-CR")}</td><td className="text-white">{p.subscriber.name}</td><td className="text-white font-semibold">{formatCurrency(p.amount.toNumber())}</td><td><span className="badge badge-cyan">{p.paymentMethod}</span></td><td className="font-mono text-xs text-gray-400">{p.referenceNumber??"—"}</td></tr>)}
        </tbody></table></div>
      </div>
      <form action={async()=>{"use server"; const { prisma: p } = await import("@/lib/prisma"); const s = await getServerUser(); if(!s) return; await p.cashClosing.create({ data: { tenantId: s.user.tenantId, responsableId: s.user.id, montoEfectivo: porMetodo.EFECTIVO||0, montoSinpe: porMetodo.SINPE_MOVIL||0, montoTransferencia: porMetodo.TRANSFERENCIA||0, montoTarjeta: porMetodo.TARJETA||0, total: totalHoy, estado: "CERRADO" } as any });}} >
        <button className="btn-primary">Cerrar caja hoy</button>
      </form>
    </div>
  );
}
