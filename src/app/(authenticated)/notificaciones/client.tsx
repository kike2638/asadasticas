"use client";
import { useEffect, useState } from "react";
import { Bell, Send, CheckCircle, AlertTriangle, Smartphone, Clock, Filter, Loader2, MessageCircle } from "lucide-react";

export default function NotificacionesClient({ sinpe, logs }: { sinpe: string | null; logs: any[] }) {
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>("TODOS");

  const loadQueue = async () => {
    setLoading(true);
    const res = await fetch("/api/notifications/queue");
    const data = await res.json();
    setQueue(data);
    setLoading(false);
  };

  useEffect(() => { loadQueue(); }, []);

  const send = async (tipos?: string[]) => {
    if (!confirm(`¿Enviar ${tipos ? tipos.join(", ") : "toda la cola"} por WhatsApp?`)) return;
    setSending(true);
    const res = await fetch("/api/notifications/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipos, limit: 50 }) });
    const data = await res.json();
    setSending(false);
    alert(`Enviados: ${data.enviados} • Fallidos: ${data.fallidos} • Modo: ${data.detalles?.[0]?.modo ?? "—"}`);
    loadQueue();
  };

  const filtered = queue?.queue?.filter((q: any) => filterTipo === "TODOS" || q.tipo === filterTipo) ?? [];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-cyan-400" /> Cola de recordatorios (cron diario)</h3>
        <p className="text-sm text-muted mt-1">Se genera automático por vencimiento: <span className="text-white">5 días antes, hoy, 7/15/30 días mora, 45 aviso corte</span>. Usa SINPE de la ASADA <span className="font-mono text-cyan-300">{sinpe ?? "— sin configurar"}</span> en el mensaje.</p>

        {!sinpe && <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">Configura SINPE en <a href="/configuracion" className="underline">Configuración</a> para que abonados sepan dónde pagar.</div>}

        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl bg-white/[0.04] p-3 text-center"><p className="text-xl font-bold text-white">{queue?.total ?? "—"}</p><p className="text-xs text-muted">En cola hoy</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3 text-center"><p className="text-xl font-bold text-cyan-400">{(queue?.byTipo?.RECORDATORIO_5 ?? 0) + (queue?.byTipo?.VENCIMIENTO_HOY ?? 0)}</p><p className="text-xs text-muted">Por vencer</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3 text-center"><p className="text-xl font-bold text-amber-400">{(queue?.byTipo?.MOROSO_7 ?? 0) + (queue?.byTipo?.MOROSO_15 ?? 0) + (queue?.byTipo?.MOROSO_30 ?? 0)}</p><p className="text-xs text-muted">Morosos</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3 text-center"><p className="text-xl font-bold text-red-400">{queue?.byTipo?.CORTE_AVISO ?? 0}</p><p className="text-xs text-muted">Aviso corte</p></div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => loadQueue()} disabled={loading} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}Actualizar cola</button>
          <button onClick={() => send()} disabled={sending || !queue?.total} className="btn-primary flex items-center gap-2"><Send className="w-4 h-4" />{sending ? "Enviando..." : `Enviar toda la cola (${queue?.total ?? 0})`}</button>
          <button onClick={() => send(["RECORDATORIO_5", "VENCIMIENTO_HOY"])} disabled={sending} className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm">Solo por vencer</button>
          <button onClick={() => send(["MOROSO_7", "MOROSO_15", "MOROSO_30"])} disabled={sending} className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm">Solo morosos</button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-400" /> Cola detallada</h3>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="select-modern py-1 text-xs">
            <option value="TODOS">Todos</option>
            <option value="RECORDATORIO_5">Recordatorio 5d</option>
            <option value="VENCIMIENTO_HOY">Vence hoy</option>
            <option value="MOROSO_7">Moroso 7d</option>
            <option value="MOROSO_15">Moroso 15d</option>
            <option value="MOROSO_30">Moroso 30d</option>
            <option value="CORTE_AVISO">Aviso corte</option>
          </select>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="table-modern text-sm">
            <thead className="sticky top-0 bg-[#0a1020]"><tr><th>NIS</th><th>Abonado</th><th>Tel</th><th>Periodo</th><th>Vence</th><th>Tipo</th><th>Monto</th></tr></thead>
            <tbody>
              {filtered.map((q: any) => (
                <tr key={q.invoiceId} className={q.tipo.includes("MOROSO") || q.tipo === "CORTE_AVISO" ? "bg-red-500/5" : q.tipo === "VENCIMIENTO_HOY" ? "bg-amber-500/5" : ""}>
                  <td className="font-mono text-xs text-white">{q.nis}</td>
                  <td className="text-white">{q.subscriberName}</td>
                  <td className="font-mono text-xs text-gray-300">{q.telefono}</td>
                  <td className="text-gray-300">{q.periodo}</td>
                  <td className="text-xs text-gray-400">{new Date(q.vencimiento).toLocaleDateString("es-CR")}<span className="ml-1 text-muted">({q.dias > 0 ? `en ${q.dias}d` : `${Math.abs(q.dias)}d vencida`})</span></td>
                  <td><span className={`badge text-[11px] ${q.tipo.includes("MOROSO") ? "badge-red" : q.tipo === "RECORDATORIO_5" ? "badge-cyan" : q.tipo === "VENCIMIENTO_HOY" ? "badge-yellow" : "badge-orange"}`}>{q.tipo}</span></td>
                  <td className="font-bold text-white">₡{q.total.toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted text-sm">Sin recordatorios para este filtro — ¡al día!</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3">Plantillas (editables en <code className="bg-white/10 px-1 rounded">src/lib/notifications/whatsapp.ts</code>)</h3>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="font-bold text-cyan-300">RECORDATORIO_5</p><p className="text-muted mt-1">Hola Juan 👋 ASADA te recuerda: Periodo 2026-03 • NIS 001 • Total: ₡12,850 • Vence: 15/04/2026 • SINPE 88881234 - Ref: 001</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="font-bold text-red-300">MOROSO_30</p><p className="text-muted mt-1">⚠️ Juan, tu servicio tiene 30 días de mora. Deuda: ₡45,500. Evita el corte - regulariza hoy por SINPE o en oficina.</p></div>
        </div>
        <p className="text-xs text-muted mt-3">Cron diario <code className="bg-white/10 px-1 rounded">GET /api/cron/daily?tenant=xxx</code> envía automático 7am. Modo simulado si no hay WHATSAPP_TOKEN — ver logs en esta tabla.</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><h3 className="font-semibold text-white">Historial envíos (20 últimos)</h3></div>
        <div className="divide-y divide-white/5">
          {logs.length === 0 ? <p className="text-center py-6 text-muted text-sm">Sin envíos aún</p> : logs.map((l: any) => (
            <div key={l.id} className="p-3 flex items-center justify-between text-sm">
              <div><span className={`badge text-[11px] ${l.tipo.includes("MOROSO") ? "badge-red" : "badge-cyan"}`}>{l.tipo}</span><span className="ml-2 text-white">{l.destino}</span><span className="text-xs text-muted ml-2">{new Date(l.createdAt).toLocaleString("es-CR")}</span></div>
              <span className={`badge text-[11px] ${l.status === "SENT" ? "badge-green" : l.status === "SIMULADO" ? "badge-yellow" : "badge-red"}`}>{l.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
