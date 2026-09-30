"use client";
import { useState } from "react";
import { Landmark, ShieldCheck, Upload, Save, Loader2, CheckCircle, AlertCircle, KeyRound, Eye, EyeOff } from "lucide-react";

interface Fiscal {
  usuario: string;
  passwordConfigurada: boolean;
  p12Configurado: boolean;
  pinConfigurado: boolean;
  sucursal: string;
  terminal: string;
  codigoActividadEmisor: string;
  cabysPrincipal: string;
  emisorProvincia: string;
  emisorCanton: string;
  emisorDistrito: string;
  emisorBarrio: string | null;
}

export default function FiscalClient({ initial, canEdit }: { initial: Fiscal; canEdit: boolean }) {
  const [fiscal, setFiscal] = useState(initial);
  const [p12, setP12] = useState<string>("");
  const [p12Nombre, setP12Nombre] = useState("");
  const [pin, setPin] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [verPin, setVerPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const set = (k: keyof Fiscal, v: string) => setFiscal({ ...fiscal, [k]: v });

  // El P12 se lee aquí en el navegador y viaja cifrado por HTTPS; el servidor lo cifra antes de guardar.
  const handleP12 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setMsg({ type: "err", text: "El .p12 no puede pesar más de 2 MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      setP12(base64);
      setP12Nombre(f.name);
      setMsg(null);
    };
    reader.onerror = () => setMsg({ type: "err", text: "No se pudo leer el archivo" });
    reader.readAsDataURL(f);
  };

  const guardar = async () => {
    if (!p12 && !passNueva && !pin) { setMsg({ type: "err", text: "No hay nada nuevo que guardar" }); return; }
    if (p12 && !pin) { setMsg({ type: "err", text: "Para el certificado nuevo necesitas indicar el PIN" }); return; }
    setSaving(true); setMsg(null);
    const res = await fetch("/api/tenant/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        haciendaUser: fiscal.usuario,
        sucursal: fiscal.sucursal,
        terminal: fiscal.terminal,
        codigoActividadEmisor: fiscal.codigoActividadEmisor,
        cabysPrincipal: fiscal.cabysPrincipal,
        emisorProvincia: fiscal.emisorProvincia,
        emisorCanton: fiscal.emisorCanton,
        emisorDistrito: fiscal.emisorDistrito,
        emisorBarrio: fiscal.emisorBarrio ?? "",
        ...(p12 ? { p12Base64: p12, p12Pin: pin } : {}),
        ...(passNueva ? { haciendaPasswordNew: passNueva, haciendaPassword: fiscal.passwordConfigurada } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "Error al guardar" }); return; }
    setP12(""); setPin(""); setPassNueva(""); setP12Nombre("");
    setFiscal({ ...fiscal, p12Configurado: fiscal.p12Configurado || !!data.config?.p12Configurado, pinConfigurado: fiscal.pinConfigurado || !!data.config?.p12Configurado, passwordConfigurada: fiscal.passwordConfigurada || !!passNueva });
    const extra = data.config?.p12Valido
      ? ` Certificado: ${data.config.p12CertSubject ?? "validado"}${data.config.p12CertVence ? ` (vence ${new Date(data.config.p12CertVence).toLocaleDateString("cr-CR")})` : ""}.`
      : "";
    setMsg({ type: "ok", text: `Credenciales de Hacienda guardadas y cifradas ✓${extra}` });
  };

  const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{label}
    </span>
  );

  const Input = (p: { k: keyof Fiscal; label: string; ph: string; max?: number }) => (
    <div>
      <label htmlFor={`fisc-${p.k}`} className="block text-xs font-medium text-gray-400 mb-1.5">{p.label}</label>
      <input id={`fisc-${p.k}`} value={fiscal[p.k] as string} maxLength={p.max} onChange={e => set(p.k, e.target.value)} placeholder={p.ph} disabled={!canEdit} className="input-modern disabled:opacity-60" />
    </div>
  );

  return (
    <div className="space-y-6">
      {msg && <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${msg.type === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>{msg.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}</div>}

      <div className="glass rounded-2xl p-6 border border-purple-500/20">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-1"><Landmark className="w-5 h-5 text-purple-400" /> Facturación electrónica — credenciales de Hacienda</h3>
        <p className="text-xs text-muted mb-4">
          Cada ASADA usa <span className="text-white">su propio certificado</span>. El archivo .p12 y el PIN se cifran con AES-256-GCM
          usando una clave derivada por ASADA, y <span className="text-white">nunca se vuelven a mostrar</span> — solo se ven en el servidor al firmar.
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          <Badge ok={fiscal.p12Configurado} label={fiscal.p12Configurado ? "Certificado .p12 cargado" : "Sin certificado .p12"} />
          <Badge ok={fiscal.pinConfigurado} label={fiscal.pinConfigurado ? "PIN configurado" : "Sin PIN"} />
          <Badge ok={fiscal.passwordConfigurada} label={fiscal.passwordConfigurada ? "Contraseña ATV configurada" : "Sin contraseña ATV"} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Input k="usuario" label="Usuario ATV (Hacienda)" ph="asada@ejemplo.go.cr" />
          <Input k="sucursal" label="Sucursal (3 dígitos)" ph="001" max={3} />
          <Input k="terminal" label="Terminal (5 dígitos)" ph="00001" max={5} />
        </div>

        <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <p className="text-xs text-gray-400 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Certificado digital (archivo .p12 / .pfx que te da Hacienda)</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 cursor-pointer hover:bg-white/10 inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />{p12Nombre || "Seleccionar .p12"}
              <input type="file" accept=".p12,.pfx,application/x-pkcs12" className="hidden" onChange={handleP12} disabled={!canEdit} />
            </label>
            {fiscal.p12Configurado && !p12 && <span className="text-xs text-emerald-300">Ya hay un certificado cargado. Sube uno nuevo solo si lo cambiaste.</span>}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="fisc-pin" className="block text-xs font-medium text-gray-400 mb-1.5">PIN del certificado</label>
              <div className="relative">
                <input id="fisc-pin" type={verPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder={fiscal.pinConfigurado ? "•••• (dejar vacío si no cambia)" : "PIN del P12"} disabled={!canEdit} className="input-modern pr-10 disabled:opacity-60" />
                <button type="button" onClick={() => setVerPin(!verPin)} aria-label={verPin ? "Ocultar PIN" : "Ver PIN"} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {verPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="fisc-pass" className="block text-xs font-medium text-gray-400 mb-1.5">Contraseña del usuario ATV</label>
              <input id="fisc-pass" type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} placeholder={fiscal.passwordConfigurada ? "•••• (dejar vacío si no cambia)" : "Contraseña"} disabled={!canEdit} className="input-modern disabled:opacity-60" />
            </div>
          </div>
          <p className="text-[11px] text-muted">Al guardar validamos el .p12 con el PIN antes de almacenarlo: si el PIN está mal, te avisamos en el momento.</p>
        </div>

        <button onClick={guardar} disabled={!canEdit || saving} aria-busy={saving} className="btn-primary mt-5 inline-flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando…" : "Guardar credenciales Hacienda"}
        </button>
      </div>

      <div className="glass rounded-2xl p-6 border border-cyan-500/15">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-1"><ShieldCheck className="w-5 h-5 text-cyan-400" /> Datos del emisor en el comprobante</h3>
        <p className="text-xs text-muted mb-4">Estos datos salen impresos en la factura electrónica. Hacienda los rechaza si no coinciden con la ASADA.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <Input k="codigoActividadEmisor" label="Actividad económica (CAESE, 6 dígitos)" ph="360000" max={6} />
          <Input k="cabysPrincipal" label="Código CAByS del servicio (13 dígitos)" ph="5100000000000" max={13} />
          <Input k="emisorProvincia" label="Provincia (1-7)" ph="1" max={1} />
          <Input k="emisorCanton" label="Cantón (2 dígitos)" ph="01" max={2} />
          <Input k="emisorDistrito" label="Distrito (2 dígitos)" ph="01" max={2} />
          <div>
            <label htmlFor="fisc-emisorBarrio" className="block text-xs font-medium text-gray-400 mb-1.5">Barrio</label>
            <input id="fisc-emisorBarrio" value={fiscal.emisorBarrio ?? ""} onChange={e => set("emisorBarrio", e.target.value)} placeholder="Sabanilla" disabled={!canEdit} className="input-modern disabled:opacity-60" />
          </div>
        </div>
        <button onClick={guardar} disabled={!canEdit || saving} className="btn-primary mt-4 inline-flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar datos de emisor
        </button>
      </div>
    </div>
  );
}
