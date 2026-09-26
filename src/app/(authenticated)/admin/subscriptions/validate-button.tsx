"use client";
import { useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function ValidateButton({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  if (status === "PAID") return <span className="text-xs text-emerald-400">✓ Validado</span>;

  const validate = async (action: "PAID" | "OVERDUE") => {
    setErr("");
    if (action === "PAID" && !ref.trim()) { setErr("Falta ref SINPE"); return; }
    setLoading(true);
    const res = await fetch(`/api/saas/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: action, referenciaPago: ref }) });
    setLoading(false);
    if (res.ok) location.reload(); else setErr("Error al validar");
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        {!show ? (
          <button onClick={() => setShow(true)} className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-500/30 min-h-11">Validar</button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="Ref SINPE"
              aria-label="Referencia SINPE"
              inputMode="numeric"
              className="w-24 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white min-h-11"
            />
            <button onClick={() => validate("PAID")} disabled={loading} aria-label="Marcar como pagado" className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 min-h-11 min-w-11">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}</button>
            <button onClick={() => validate("OVERDUE")} disabled={loading} aria-label="Marcar como vencido" className="p-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 min-h-11 min-w-11"><XCircle className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      {err && <p role="alert" className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
