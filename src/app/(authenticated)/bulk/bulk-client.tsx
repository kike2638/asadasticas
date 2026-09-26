"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Zap, Layers, CheckCircle, AlertTriangle, Loader2, FileText } from "lucide-react";

interface Item {
  subscriberId: string; nis: string; name: string; category: string; ruta: string;
  meterId: string; meterNumber: string; lastReading: number;
}

export default function BulkClient({ pendientes, rutas, periodo }: { pendientes: Item[]; rutas: string[]; periodo: string }) {
  const [ruta, setRuta] = useState<string>("TODAS");
  const [lecturas, setLecturas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const filtrados = ruta === "TODAS" ? pendientes : pendientes.filter(p => p.ruta === ruta);

  const handleBulk = async () => {
    const payload = filtrados
      .filter(p => lecturas[p.meterId] && Number(lecturas[p.meterId]) > 0)
      .map(p => ({ meterId: p.meterId, subscriberId: p.subscriberId, currentReading: Number(lecturas[p.meterId]) }));

    if (payload.length === 0) return alert("Ingrese al menos una lectura válida");
    if (!confirm(`¿Generar ${payload.length} tiquetes electrónicos para ${periodo}? Esta acción crea claves Hacienda.`)) return;

    setLoading(true);
    const res = await fetch("/api/billing/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lecturas: payload }) });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const setAll = (val: string) => {
    const next: Record<string, string> = {};
    filtrados.forEach(p => next[p.meterId] = val);
    setLecturas({ ...lecturas, ...next });
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <select value={ruta} onChange={e => setRuta(e.target.value)} className="select-modern py-2 text-sm">
            <option value="TODAS">Todas las rutas ({pendientes.length})</option>
            {rutas.map(r => <option key={r} value={r}>{r} ({pendientes.filter(p => p.ruta === r).length})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted">Cargar ejemplo:</span>
          <button onClick={() => setAll("150")} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">150 m³</button>
          <button onClick={() => setAll("")} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">Limpiar</button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="table-modern">
            <thead className="sticky top-0 bg-[#0a1020]"><tr><th>NIS</th><th>Abonado</th><th>Ruta</th><th>Medidor</th><th>Última</th><th style={{ minWidth: 140 }}>Lectura actual</th><th>Consumo</th></tr></thead>
            <tbody>
              {filtrados.map(p => {
                const curr = lecturas[p.meterId] ? Number(lecturas[p.meterId]) : null;
                const consumo = curr !== null && !isNaN(curr!) ? curr! - p.lastReading : null;
                const alerta = consumo !== null && (consumo < 0 || consumo > 40);
                return (
                  <tr key={p.meterId}>
                    <td className="font-mono text-xs text-gray-300">{p.nis}</td>
                    <td className="text-white text-sm">{p.name} <span className="text-xs text-muted">({p.category})</span></td>
                    <td><span className="badge badge-cyan text-xs">{p.ruta}</span></td>
                    <td className="font-mono text-xs text-gray-300">{p.meterNumber}</td>
                    <td className="text-gray-400 text-sm">{p.lastReading} m³</td>
                    <td><input type="number" aria-label={`Lectura para ${p.name} NIS ${p.nis}`} inputMode="numeric" value={lecturas[p.meterId] ?? ""} onChange={e => setLecturas({ ...lecturas, [p.meterId]: e.target.value })} placeholder={String(p.lastReading + 15)} className={`w-28 px-2 py-1.5 rounded-lg bg-white/[0.06] border text-sm text-white text-center ${alerta ? "border-amber-500/50 bg-amber-500/10" : "border-white/10"}`} /></td>
                    <td className={`text-sm font-bold ${alerta ? "text-amber-400" : "text-cyan-300"}`}>{consumo !== null ? `${consumo} m³` : "—"} {alerta && <AlertTriangle className="w-3 h-3 inline ml-1" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && <p className="text-center py-12 text-muted">Sin pendientes para esta ruta</p>}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted">{filtrados.filter(p => lecturas[p.meterId]).length} con lectura cargada</p>
        <button onClick={handleBulk} disabled={loading} className="btn-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5" />Generar {filtrados.filter(p => lecturas[p.meterId]).length || filtrados.length} tiquetes {periodo}<FileText className="w-4 h-4" /></>}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border ${result.errores?.length ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"}`}>
          <p className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5" />{result.generadas} tiquetes generados • {result.errores?.length || 0} errores</p>
          {result.errores?.length > 0 && <ul className="text-xs mt-2 space-y-1">{result.errores.slice(0, 5).map((e: any, i: number) => <li key={i}>• {e.meterId}: {e.error}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
