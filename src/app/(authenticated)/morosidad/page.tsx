import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default async function MorosidadPage() {
  const s = await getServerUser(); if(!s) redirect("/login");
  const tenantId = s.user.tenantId;
  const morosos = await prisma.invoice.findMany({ where: { tenantId, status: { in: ["PENDING","PARTIAL"] }, fechaVencimiento: { lt: new Date() } }, include: { subscriber: true }, orderBy: { fechaVencimiento: "asc" }, take: 100 });
  const porAbonado = morosos.reduce((m,inv)=>{ const k=inv.subscriberId; if(!m[k]) m[k]={ sub: inv.subscriber, deuda:0, facturas:0, masAntigua: inv.fechaVencimiento }; m[k].deuda += (inv.saldoPendiente?.toNumber?.() ?? inv.total.toNumber()); m[k].facturas++; if(inv.fechaVencimiento < m[k].masAntigua) m[k].masAntigua=inv.fechaVencimiento; return m; }, {} as any);
  const lista = Object.values(porAbonado) as any[];

  return (
    <div className="space-y-6">
      <div><p className="section-label">Cobranza</p><h1 className="page-title">Morosidad</h1><p className="page-subtitle">{lista.length} abonados morosos • {morosos.length} facturas vencidas</p></div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>Abonado</th><th>NIS</th><th>Facturas</th><th>Deuda</th><th>Días mora</th><th>Acción</th></tr></thead><tbody>
          {lista.sort((a,b)=>b.deuda-a.deuda).map((r:any)=>{ const dias = Math.floor((Date.now()-new Date(r.masAntigua).getTime())/86400000); return (
            <tr key={r.sub.id}><td className="text-white font-medium">{r.sub.name}</td><td className="font-mono text-gray-300">{r.sub.nis}</td><td className="text-center">{r.facturas}</td><td className="font-bold text-rose-400">{formatCurrency(r.deuda)}</td><td className={`text-center ${dias>60?"text-red-400 font-bold":dias>30?"text-amber-400":"text-gray-400"}`}>{dias}d</td><td><span className={`badge ${dias>60?"badge-red":dias>30?"badge-orange":"badge-yellow"}`}>{dias>60?"CORTE":dias>30?"AVISO":"LEVE"}</span></td></tr>
          )})}
        </tbody></table></div>
        {lista.length===0 && <p className="text-center py-12 text-muted">Sin morosidad - ¡excelente gestión!</p>}
      </div>
    </div>
  );
}
