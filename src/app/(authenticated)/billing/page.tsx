"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Calculator,
  Droplets,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
  Zap,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface Subscriber {
  id: string;
  name: string;
  nis: string;
  category: string;
  meters: { id: string; number: string }[];
}

interface BillResult {
  consumption: number;
  bill: {
    baseCharge: number;
    variableCharge: number;
    tprh: number;
    hidrantes: number;
    otrosCargos: number;
    subtotalExento: number;
    subtotalGravado: number;
    iva: number;
    total: number;
    breakdown: { block: string; m3: number; cost: number }[];
  };
  subscriberName: string;
  tariffName?: string;
}

export default function BillingPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [result, setResult] = useState<BillResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/subscribers").then((r) => r.json()).then((d) => setSubscribers(d.subscribers || [])).catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!selectedMeterId || !currentReading) { setError("Seleccione medidor y lectura"); return; }
    setLoading(true); setError(""); setSuccess(""); setResult(null);
    try {
      const res = await fetch("/api/billing/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meterId: selectedMeterId, currentReading: parseFloat(currentReading) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!result || !selectedMeterId) return;
    const sub = subscribers.find((s) => s.meters.some((m) => m.id === selectedMeterId));
    if (!sub) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/billing/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meterId: selectedMeterId, subscriberId: sub.id, currentReading: parseFloat(currentReading) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Tiquete ${data.invoice.consecutivo} generado • Clave ${data.invoice.clave.slice(0, 20)}... • Total ${formatCurrency(data.invoice.total)}`);
    } catch (e: any) { setError(e.message); } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="section-label mb-1.5">Operaciones</p>
        <h1 className="page-title mb-1">Facturación</h1>
        <p className="page-subtitle">Motor ARESEP • Tiquete electrónico 04 • IVA exento hasta base</p>
      </div>

      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl flex gap-3"><CheckCircle className="w-5 h-5 flex-shrink-0"/>{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><Calculator className="w-5 h-5 text-white"/></div>
            <div><h2 className="text-lg font-semibold text-white">Calcular</h2><p className="text-xs text-muted">ARESEP + TPRH + Hidrantes</p></div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Abonado / Medidor</label>
              <select value={selectedMeterId} onChange={(e) => setSelectedMeterId(e.target.value)} className="select-modern">
                <option value="">Seleccionar...</option>
                {subscribers.map((sub) => sub.meters.map((m) => <option key={m.id} value={m.id}>{sub.nis} - {sub.name} ({m.number}) [{sub.category}]</option>))}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Lectura actual (m³)</label><input type="number" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} className="input-modern" placeholder="Ej: 142"/></div>
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0"/>{error}</div>}
            <button onClick={handlePreview} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Calculator className="w-5 h-5"/>Calcular con ARESEP</>}</button>
            <div className="flex gap-2">
              <a href="/bulk" className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center text-sm text-gray-300 flex items-center justify-center gap-2"><Layers className="w-4 h-4"/>Facturación masiva</a>
              <a href="/payments" className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center text-sm text-gray-300 flex items-center justify-center gap-2"><Zap className="w-4 h-4"/>Caja</a>
            </div>
          </div>
        </div>

        {result ? (
          <div className="glass rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-white"/></div>
              <div><h2 className="text-lg font-semibold text-white">{result.subscriberName}</h2><p className="text-xs text-muted">{result.tariffName ?? ""} • {result.consumption} m³ consumidos</p></div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center mb-3">
              <span className="flex items-center gap-2 text-gray-300"><Droplets className="w-5 h-5 text-blue-400"/>Consumo</span><span className="text-xl font-bold text-white">{result.consumption} m³</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {result.bill.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between py-1.5 px-3 rounded-lg bg-white/[0.02] text-sm"><span className="text-gray-400">Bloque {b.block}: {b.m3} m³</span><span className="text-gray-300">{formatCurrency(b.cost)}</span></div>
              ))}
              {result.bill.breakdown.length === 0 && <p className="text-xs text-muted text-center py-2">Dentro de base - solo cargo fijo</p>}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Cargo fijo acueducto</span><span className="text-gray-300">{formatCurrency(result.bill.baseCharge)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Variable (exceso base)</span><span className="text-gray-300">{formatCurrency(result.bill.variableCharge)}</span></div>
              {result.bill.tprh > 0 && <div className="flex justify-between"><span className="text-gray-400">TPRH</span><span className="text-gray-300">{formatCurrency(result.bill.tprh)}</span></div>}
              {result.bill.hidrantes > 0 && <div className="flex justify-between"><span className="text-gray-400">Hidrantes Ley 8641</span><span className="text-gray-300">{formatCurrency(result.bill.hidrantes)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Exento</span><span className="text-emerald-300">{formatCurrency(result.bill.subtotalExento)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Gravado</span><span className="text-gray-300">{formatCurrency(result.bill.subtotalGravado)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">IVA 13%</span><span className="text-gray-300">{formatCurrency(result.bill.iva)}</span></div>
              <div className="flex justify-between pt-3 border-t border-white/5"><span className="text-base font-semibold text-white">Total a pagar</span><span className="text-lg font-bold text-green-400">{formatCurrency(result.bill.total)}</span></div>
              <p className="text-xs text-muted flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> Tiquete electrónico 04 • clave 50 dígitos + XAdES</p>
            </div>

            <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
              {generating ? <Loader2 className="w-5 h-5 animate-spin"/> : <><FileText className="w-5 h-5"/>Generar tiquete electrónico<ArrowRight className="w-5 h-5"/></>}
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 flex items-center justify-center" style={{ animationDelay: "200ms" }}>
            <div className="text-center"><div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"><FileText className="w-10 h-10 text-gray-500"/></div><p className="text-gray-400 text-sm">Seleccione medidor y lectura para ver desglose ARESEP</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
