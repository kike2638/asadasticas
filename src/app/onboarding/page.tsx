"use client";
import { useState } from "react";
import { Droplets, Building2, KeyRound, CheckCircle, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tenantName: "", slug: "", cedula: "", haciendaUser: "", haciendaPassword: "", llavePin: "" });
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    setLoading(true);
    const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, llaveCryptBase64: "placeholder-base64-key" }) });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.success) setStep(3);
  };

  return (
    <div className="min-h-screen bg-[#050a18] flex items-center justify-center p-6">
      <div className="w-full max-w-xl glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"><Droplets className="w-5 h-5 text-[#042635]" /></div>
          <div><p className="font-bold text-white">Registrar mi ASADA</p><p className="text-xs text-gray-400">Paso {step} de 3 • 2 minutos</p></div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-400" /> Datos de la ASADA</h2>
            <div>
              <label htmlFor="ob-nombre" className="block text-xs font-medium text-gray-400 mb-1.5">Nombre de la ASADA *</label>
              <input id="ob-nombre" placeholder="ASADA San Rafael" value={form.tenantName} onChange={e => setForm({ ...form, tenantName: e.target.value })} className="input-modern w-full" />
            </div>
            <div>
              <label htmlFor="ob-slug" className="block text-xs font-medium text-gray-400 mb-1.5">Slug (URL) *</label>
              <input id="ob-slug" placeholder="asada-san-rafael" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, "-") })} className="input-modern w-full" />
            </div>
            <div>
              <label htmlFor="ob-cedula" className="block text-xs font-medium text-gray-400 mb-1.5">Cédula jurídica</label>
              <input id="ob-cedula" placeholder="3002087654" inputMode="numeric" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} className="input-modern w-full" />
            </div>
            <p className="text-xs text-gray-500">La cédula se usa para la clave 50 de Hacienda. Puedes cambiarla luego.</p>
            <button onClick={() => setStep(2)} disabled={!form.tenantName || !form.slug} className="btn-primary w-full">Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><KeyRound className="w-5 h-5 text-cyan-400" /> Hacienda (opcional)</h2>
            <p className="text-sm text-gray-400">Puedes configurarlo después. Sin esto, el sistema funciona en modo simulado.</p>
            <div>
              <label htmlFor="ob-hu" className="block text-xs font-medium text-gray-400 mb-1.5">Usuario ATV Hacienda</label>
              <input id="ob-hu" placeholder="usuario ATV" autoComplete="username" value={form.haciendaUser} onChange={e => setForm({ ...form, haciendaUser: e.target.value })} className="input-modern w-full" />
            </div>
            <div>
              <label htmlFor="ob-hp" className="block text-xs font-medium text-gray-400 mb-1.5">Contraseña ATV</label>
              <input id="ob-hp" placeholder="Contraseña" type="password" autoComplete="current-password" value={form.haciendaPassword} onChange={e => setForm({ ...form, haciendaPassword: e.target.value })} className="input-modern w-full" />
            </div>
            <div>
              <label htmlFor="ob-pin" className="block text-xs font-medium text-gray-400 mb-1.5">PIN llave .p12</label>
              <input id="ob-pin" placeholder="PIN" type="password" autoComplete="off" value={form.llavePin} onChange={e => setForm({ ...form, llavePin: e.target.value })} className="input-modern w-full" />
            </div>
            {result?.error && <p role="alert" className="text-sm text-red-400">{result.error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white">Atrás</button>
              <button type="button" onClick={submit} disabled={loading} aria-busy={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">{loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando…</> : "Crear ASADA"}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">¡ASADA creada!</h2>
            <p className="text-sm text-gray-400 mt-2">ID: {result?.tenantId?.slice(0, 8)}…</p>
            <p className="text-sm text-gray-400">Ya puedes importar tu padrón CSV y cargar tarifas ARESEP.</p>
            <a href="/login" className="btn-primary inline-flex mt-6">Ir al login</a>
          </div>
        )}
      </div>
    </div>
  );
}
