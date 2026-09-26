"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, Loader2 } from "lucide-react";

export default function StatusToggle({ id, status, name, className = "" }: { id: string; status: string; name: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  const reactivar = next === "ACTIVE";

  const toggle = async () => {
    const verb = reactivar ? "Reactiva" : "Suspende";
    const warn = reactivar ? "" : " Los usuarios de la ASADA perderán acceso hasta reactivar.";
    if (!confirm(`${verb} "${name}"?${warn}`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Error al actualizar"); return; }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={reactivar ? `Reactivar ${name}` : `Suspender ${name}`}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium min-h-11 disabled:opacity-50 ${
        reactivar
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
          : "bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25"
      } ${className}`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : reactivar ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
      {busy ? "Actualizando…" : reactivar ? "Reactivar" : "Suspender"}
    </button>
  );
}
