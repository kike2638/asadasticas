"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2, Landmark, Wrench, Coins } from "lucide-react";
import { registrarRetiro } from "./actions";

const TIPOS = [
  { value: "DEPOSITO_BANCO", label: "Depósito al banco", icon: Landmark, hint: "Efectivo que sale de caja al banco" },
  { value: "OPERATIVO", label: "Operativo", icon: Wrench, hint: "Nómina, proveedores, mantenimiento" },
  { value: "UTILIDADES", label: "Utilidades", icon: Coins, hint: "Excedente para la Junta — se valida contra el excedente del mes" },
];

export default function WithdrawForm({ excedente, saldo }: { excedente: number; saldo: number }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("DEPOSITO_BANCO");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setOk("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("monto", monto);
      fd.set("tipo", tipo);
      fd.set("motivo", motivo);
      const res = await registrarRetiro(fd) as { error?: string; ok?: boolean };
      if (res?.error) { setError(res.error); return; }
      setOk("Retiro registrado");
      setMonto(""); setMotivo("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const hint = tipo === "UTILIDADES"
    ? `Excedente disponible este mes: ${new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(excedente)}`
    : `Efectivo en caja este mes: ${new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(saldo)}`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <legend className="sr-only">Tipo de retiro</legend>
        {TIPOS.map(t => (
          <label
            key={t.value}
            className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm min-h-11 transition-colors ${
              tipo === t.value ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.07]"
            }`}
          >
            <input type="radio" name="tipo" value={t.value} checked={tipo === t.value} onChange={() => setTipo(t.value)} className="sr-only" />
            <t.icon className="w-4 h-4 shrink-0 text-cyan-400" aria-hidden="true" />
            {t.label}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="wr-monto" className="block text-xs font-medium text-gray-400 mb-1.5">Monto (CRC) *</label>
          <input
            id="wr-monto"
            value={monto}
            onChange={e => setMonto(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            required
            placeholder="250000"
            className="input-modern w-full"
          />
        </div>
        <div>
          <label htmlFor="wr-motivo" className="block text-xs font-medium text-gray-400 mb-1.5">Motivo</label>
          <input
            id="wr-motivo"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            maxLength={120}
            placeholder={tipo === "UTILIDADES" ? "Reparto junta directiva" : "Depósito BNCR"}
            className="input-modern w-full"
          />
        </div>
      </div>

      <p className="text-xs text-muted">{hint}</p>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {ok && <p role="status" className="text-sm text-emerald-400">{ok}</p>}

      <button type="submit" disabled={busy || !monto} className="btn-primary w-full inline-flex items-center justify-center gap-2" aria-busy={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Banknote className="w-4 h-4" aria-hidden="true" />}
        Registrar retiro
      </button>
    </form>
  );
}
