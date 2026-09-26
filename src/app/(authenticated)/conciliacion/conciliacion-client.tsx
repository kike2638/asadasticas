"use client";
import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Building2, Smartphone, Filter, Loader2, Zap } from "lucide-react";
import { formatCRC } from "@/lib/saas/pricing";

export default function ConciliacionClient({ sinpe, sinpeNombre, role, tenantSlug }: { sinpe: string | null; sinpeNombre: string | null; role: string; tenantSlug: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selected, setSelected] = useState<Record<number, { invoiceId: string; subscriberId: string }>>({});
  const [filter, setFilter] = useState<"ALL" | "AUTO" | "REVIEW">("ALL");

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("preview", "true");
    const res = await fetch("/api/banks/conciliate", { method: "POST", body: fd });
    const data = await res.json();
    setPreview(data);
    // auto-selecciona AUTO_MATCH
    const auto: Record<number, any> = {};
    (data.matches ?? []).forEach((m: any) => {
      if (m.suggestedAction === "AUTO_MATCH" && m.invoice) auto[m.txIndex] = { invoiceId: m.invoice.id, subscriberId: m.invoice.subscriberId };
      if (m.suggestedAction === "AUTO_MATCH" && m.subscription) auto[m.txIndex] = { subscriptionId: m.subscription.id } as any;
    });
    setSelected(auto);
    setLoading(false);
  };

  const handleExecute = async () => {
    const selections = Object.entries(selected).map(([idx, sel]: any) => {
      const m = preview.matches.find((x: any) => x.txIndex === Number(idx));
      if (!m) return null;
      return {
        txRef: m.tx.referencia || m.tx.descripcion.slice(0, 20) || `TX-${idx}`,
        txMonto: Math.abs(m.tx.monto),
        txFecha: m.tx.fecha,
        invoiceId: sel.invoiceId,
        subscriptionId: sel.subscriptionId,
        subscriberId: sel.subscriberId,
      };
    }).filter(Boolean);
    if (selections.length === 0) return alert("Selecciona al menos un match");
    if (!confirm(`¿Conciliar ${selections.length} transacciones y crear pagos?`)) return;
    setExecuting(true);
    const res = await fetch("/api/banks/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selections }) });
    const data = await res.json();
    setExecuting(false);
    if (!res.ok) alert(data.error ?? "Error");
    else { alert(`✓ ${data.conciliados} conciliados. ${data.errores?.length ? data.errores.length + " errores" : ""}`); location.reload(); }
  };

  const visibleMatches = preview?.matches?.filter((m: any) => filter === "ALL" || m.suggestedAction === filter) ?? [];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-400" />1. Importa estado de cuenta</h3>
        <p className="text-sm text-muted mt-1">Soporta BNCR, BCR, BAC, Davivienda, Scotiabank. Acepta CSV con <code className="bg-white/10 px-1 rounded">;</code> o <code className="bg-white/10 px-1 rounded">,</code>. Solo se concilian <span className="text-emerald-300">ingresos</span> (créditos/SINPE).</p>

        {!sinpe && <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">⚠️ Configura tu SINPE en <a href="/configuracion" className="underline">Configuración</a> — sin esto no se puede validar destino.</div>}

        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-white/15 cursor-pointer hover:bg-white/[0.06]">
            <Upload className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-300 truncate">{file ? file.name : "Selecciona CSV del banco"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={handlePreview} disabled={!file || loading} className="btn-primary inline-flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}Previsualizar
          </button>
        </div>

        <details className="mt-3">
          <summary className="text-xs text-muted cursor-pointer">¿Qué formato debe tener el CSV? (ejemplos)</summary>
          <div className="mt-2 p-3 rounded-lg bg-black/40 text-xs font-mono text-gray-300 overflow-x-auto">
            <div>BNCR: Fecha;Descripcion;Referencia;Debito;Credito;Saldo<br />15/03/2026;SINPE 87654321 JUAN PEREZ;123456789;;12850;…</div>
            <div className="mt-2">BAC: Fecha,Descripcion,Monto,Saldo<br />2026-03-15,Transferencia SINPE,12850,500000</div>
            <div className="mt-2">Genérico: fecha,descripcion,referencia,monto</div>
          </div>
        </details>
      </div>

      {preview && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-4 text-center"><p className="text-lg font-bold text-white">{preview.banco}</p><p className="text-xs text-muted">Banco detectado</p></div>
            <div className="glass rounded-2xl p-4 text-center"><p className="text-lg font-bold text-cyan-400">{preview.summary?.ingresos ?? 0}</p><p className="text-xs text-muted">Ingresos • {formatCRC(preview.summary?.totalIngresos ?? 0)}</p></div>
            <div className="glass rounded-2xl p-4 text-center"><p className="text-lg font-bold text-emerald-400">{preview.summary?.auto ?? 0}</p><p className="text-xs text-muted">Auto-match</p></div>
            <div className="glass rounded-2xl p-4 text-center"><p className="text-lg font-bold text-amber-400">{preview.summary?.review ?? 0}</p><p className="text-xs text-muted">Revisión manual</p></div>
          </div>

          {preview.warnings?.length > 0 && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">{preview.warnings.join(" • ")}</div>}

          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-semibold text-white">Transacciones → Facturas</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted" />
                <select value={filter} onChange={e => setFilter(e.target.value as any)} className="select-modern py-1.5 text-xs">
                  <option value="ALL">Todas ({preview.matches?.length ?? 0})</option>
                  <option value="AUTO">Auto ({preview.summary?.auto ?? 0})</option>
                  <option value="REVIEW">Revisión ({preview.summary?.review ?? 0})</option>
                </select>
                <button onClick={handleExecute} disabled={executing || Object.keys(selected).length === 0} className="btn-primary text-sm px-4 py-1.5 inline-flex items-center gap-2">
                  {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}Conciliar {Object.keys(selected).length}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="table-modern text-sm">
                <thead className="sticky top-0 bg-[#0a1020]"><tr><th><input type="checkbox" aria-label="Seleccionar todos" checked={visibleMatches.length > 0 && visibleMatches.every((m: any) => selected[m.txIndex])} onChange={e => { const next: any = { ...selected }; visibleMatches.forEach((m: any) => { if (e.target.checked) { if (m.invoice) next[m.txIndex] = { invoiceId: m.invoice.id, subscriberId: m.invoice.subscriberId }; if (m.subscription) next[m.txIndex] = { subscriptionId: m.subscription.id } as any; } else delete next[m.txIndex]; }); setSelected(next); }} /></th><th>Fecha</th><th>Banco ref</th><th>Monto</th><th>Descripción</th><th>Match</th><th>Score</th></tr></thead>
                <tbody>
                  {visibleMatches.map((m: any) => (
                    <tr key={m.txIndex} className={m.suggestedAction === "AUTO_MATCH" ? "bg-emerald-500/10" : m.suggestedAction === "REVIEW" ? "bg-amber-500/5" : ""}>
                      <td><input type="checkbox" aria-label={`Seleccionar ${m.tx.referencia || m.tx.fecha}`} checked={!!selected[m.txIndex]} onChange={e => setSelected({ ...selected, [m.txIndex]: e.target.checked ? (m.invoice ? { invoiceId: m.invoice.id, subscriberId: m.invoice.subscriberId } : m.subscription ? { subscriptionId: m.subscription.id } as any : null as any) : undefined } as any)} disabled={!m.invoice && !m.subscription} /></td>
                      <td className="text-gray-300 font-mono text-xs">{m.tx.fecha}</td>
                      <td className="font-mono text-xs text-gray-300">{m.tx.referencia || "—"}</td>
                      <td className={`font-bold ${m.tx.monto > 0 ? "text-emerald-400" : "text-gray-400"}`}>{formatCRC(Math.abs(m.tx.monto))}</td>
                      <td className="max-w-[260px] truncate text-gray-300" title={m.tx.descripcion}>{m.tx.descripcion}</td>
                      <td>
                        {m.invoice && <div><span className="text-white font-medium">{m.invoice.nis} {m.invoice.subscriberName.split(" ")[0]}</span><span className="text-xs text-muted ml-1">• {m.invoice.periodo} • {formatCRC(m.invoice.saldo)}</span></div>}
                        {m.subscription && <div><span className="text-white font-medium">{m.subscription.tenantName}</span><span className="text-xs text-muted ml-1">• {m.subscription.periodo} • {formatCRC(m.subscription.monto)}</span></div>}
                        {!m.invoice && !m.subscription && <span className="text-xs text-muted">{m.reason.join(" • ")}</span>}
                        {m.reason?.length > 0 && (m.invoice || m.subscription) && <p className="text-xs text-muted">{m.reason.join(" • ")}</p>}
                      </td>
                      <td><span className={`badge text-xs ${m.suggestedAction === "AUTO_MATCH" ? "badge-green" : m.suggestedAction === "REVIEW" ? "badge-yellow" : "badge-cyan"}`}>{m.suggestedAction} {m.score > 0 && `${m.score}`}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.matches?.length === 0 && <p className="text-center py-8 text-muted">Sin transacciones</p>}
          </div>

          <div className="glass p-4 rounded-2xl">
            <p className="text-xs text-muted">Heurística: monto exacto + NIS/nombre en descripción o referencia + tipo. <span className="text-white">AUTO</span> ≥70 puntos, <span className="text-amber-300">REVIEW</span> 45-69. Abonos parciales detectados si monto &lt; saldo.</p>
          </div>
        </>
      )}
    </div>
  );
}
