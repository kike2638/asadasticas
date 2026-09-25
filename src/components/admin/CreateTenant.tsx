"use client";
import { useState } from "react";
import { Plus, Copy, Check, Loader2, X, Building2, KeyRound } from "lucide-react";

interface Created {
  tenant: { id: string; name: string; slug: string; trialEndsAt: string };
  credentials: { email: string; password: string };
  trialDays: number;
}

export default function CreateTenant() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", cedulaJuridica: "", abonados: "" });

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const reset = () => {
    setOpen(false);
    setCreated(null);
    setError(null);
    setForm({ name: "", slug: "", cedulaJuridica: "", abonados: "" });
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "No se pudo crear");
      setCreated(data);
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const waText = created
    ? `Hola, tu ASADA ${created.tenant.name} ya está lista (demo ${created.trialDays} días). Ingresa en ${window.location.origin}/login con: ${created.credentials.email} / ${created.credentials.password}`
    : "";

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" /> Nueva ASADA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={reset}>
          <div className="glass rounded-2xl p-6 w-full max-w-md bg-[#0b1224]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-white">{created ? "ASADA creada" : "Nueva ASADA"}</h2>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {!created ? (
              <div className="space-y-3">
                <input
                  placeholder="Nombre: ASADA San Rafael"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  className="input-modern w-full"
                  autoFocus
                />
                <input
                  placeholder="Slug: asada-san-rafael"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  className="input-modern w-full font-mono"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Cédula jurídica (opcional)"
                    value={form.cedulaJuridica}
                    onChange={e => setForm({ ...form, cedulaJuridica: e.target.value })}
                    className="input-modern"
                  />
                  <input
                    placeholder="Abonados ej: 350"
                    inputMode="numeric"
                    value={form.abonados}
                    onChange={e => setForm({ ...form, abonados: e.target.value.replace(/\D/g, "") })}
                    className="input-modern"
                  />
                </div>
                <p className="text-xs text-gray-500">Trial 14 días • admin inicial con contraseña aleatoria • SINPE/logo configurables por la ASADA en Configuración.</p>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button onClick={submit} disabled={loading || form.name.trim().length < 3} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Crear demo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-emerald-300">✓ {created.tenant.name} — trial {created.trialDays} días (hasta {new Date(created.tenant.trialEndsAt).toLocaleDateString("es-CR")})</p>

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2 text-sm">
                  <Row label="Email" value={created.credentials.email} onCopy={() => copy(created.credentials.email, "email")} copied={copied === "email"} />
                  <Row label="Contraseña" value={created.credentials.password} onCopy={() => copy(created.credentials.password, "pass")} copied={copied === "pass"} />
                </div>

                <button onClick={() => copy(waText, "wa")} className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
                  {copied === "wa" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === "wa" ? "Copiado — pégalo en WhatsApp" : "Copiar mensaje de WhatsApp"}
                </button>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => { copy(`${created.credentials.email} / ${created.credentials.password}`, "all"); }} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                    Copiar credenciales
                  </button>
                  <button onClick={reset} className="flex-1 btn-primary text-sm">Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-mono text-white truncate">{value}</span>
      <button onClick={onCopy} className="text-cyan-400 hover:text-cyan-300 shrink-0">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
