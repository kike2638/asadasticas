"use client";
import { useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function ValidateButton({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState("");
  const [show, setShow] = useState(false);

  if (status === "PAID") return <span className="text-xs text-emerald-400">✓ Validado</span>;

  const validate = async (action: "PAID" | "OVERDUE") => {
    if (action === "PAID" && !ref.trim()) return alert("Ingresa referencia SINPE (ej 123456789)");
    setLoading(true);
    const res = await fetch(`/api/saas/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: action, referenciaPago: ref }) });
    setLoading(false);
    if (res.ok) location.reload(); else alert("Error");
  };

  return (
    <div className="flex items-center gap-1">
      {!show ? (
        <button onClick={() => setShow(true)} className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-500/30">Validar</button>
      ) : (
        <div className="flex items-center gap-1">
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Ref SINPE" className="w-24 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white" />
          <button onClick={() => validate("PAID")} disabled={loading} className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}</button>
          <button onClick={() => validate("OVERDUE")} disabled={loading} className="p-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30"><XCircle className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
