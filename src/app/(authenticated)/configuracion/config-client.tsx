"use client";
import { useState } from "react";
import { Building2, Smartphone, Landmark, Droplets, Save, CheckCircle, AlertCircle, Shield, Image as ImageIcon, Trash2, Phone, Mail, MapPin, Loader2 } from "lucide-react";

export default function ConfigClient({ initial, role, tenantInfo }: { initial: any; role: string; tenantInfo: any }) {
  const [form, setForm] = useState(initial);
  const [info, setInfo] = useState(tenantInfo);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenantInfo.logoUrl ?? null);
  const canEdit = role === "ADMIN" || role === "PLATFORM_OWNER";

  const save = async (section: string) => {
    setSaving(true); setMsg(null);
    const res = await fetch("/api/tenant/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setMsg({ type: "err", text: data.error ?? "Error" });
    else setMsg({ type: "ok", text: `${section} guardado ✓` });
  };

  const saveInfo = async () => {
    setSaving(true); setMsg(null);
    const res = await fetch("/api/tenant/info", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(info) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setMsg({ type: "err", text: data.error ?? "Error" });
    else setMsg({ type: "ok", text: "Información ASADA guardada ✓" });
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setMsg({ type: "err", text: "Logo máx 2MB" }); return; }
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/tenant/logo", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) setMsg({ type: "err", text: data.error });
    else { setLogoPreview(data.logoUrl); setMsg({ type: "ok", text: "Logo actualizado ✓" }); }
  };

  const removeLogo = async () => {
    await fetch("/api/tenant/logo", { method: "DELETE" });
    setLogoPreview(null); setMsg({ type: "ok", text: "Logo eliminado" });
  };

  const Field = (p: any) => {
    const id = `cfg-${p.k}`;
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1.5">{p.label}</label>
        <input id={id} value={p.value} onChange={e => setForm({ ...form, [p.k]: e.target.value })} placeholder={p.ph} disabled={!canEdit} className="input-modern disabled:opacity-60" />
      </div>
    );
  };

  const SaveBtn = ({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) => (
    <button onClick={onClick} disabled={!canEdit || saving} aria-busy={saving} className={`btn-primary inline-flex items-center gap-2 ${className}`}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {saving ? "Guardando…" : label}
    </button>
  );

  return (
    <div className="space-y-6">
      {msg && <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${msg.type === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>{msg.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}</div>}
      {!canEdit && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Solo ADMIN puede editar — tu rol: {role}</div>}

      {/* Cabecera ASADA con logo + SINPE individuales */}
      <div className="glass rounded-2xl p-6 border border-cyan-500/20">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><ImageIcon className="w-5 h-5 text-cyan-400" /> Identidad ASADA — logo + información + SINPE</h3>
        <p className="text-xs text-muted mb-4">Cada ASADA mantiene su <span className="text-white">logo, SINPE y datos</span> individuales. Aparecen en facturas, portal abonado y WhatsApp. Tu ASADA se ve como ella, no como plataforma.</p>
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <div className="space-y-3">
            <div className="w-full h-40 rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
              {logoPreview ? <img src={logoPreview} alt="Logo ASADA" className="w-full h-full object-contain p-2" /> : <span className="text-xs text-muted text-center px-4">Sin logo<br />PNG 400x400</span>}
            </div>
            <label className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-gray-300 cursor-pointer hover:bg-white/10 flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />Subir logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} disabled={!canEdit} />
            </label>
            {logoPreview && <button onClick={removeLogo} className="w-full py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />Quitar</button>}
          </div>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nombre ASADA" k="tenantName" value={form.tenantName} ph="ASADA San Rafael" />
              <div><label htmlFor="cfg-cedulaJuridica" className="block text-xs font-medium text-gray-400 mb-1.5">Cédula jurídica</label><input id="cfg-cedulaJuridica" value={form.cedulaJuridica} onChange={e => setForm({ ...form, cedulaJuridica: e.target.value })} placeholder="3002087654" disabled={!canEdit} className="input-modern" /></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label htmlFor="cfg-telefono" className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1"><Phone className="w-3 h-3" />Teléfono ASADA</label><input id="cfg-telefono" value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} placeholder="8888-0000" disabled={!canEdit} className="input-modern" /></div>
              <div><label htmlFor="cfg-email" className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3" />Email</label><input id="cfg-email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} placeholder="asada@ejemplo.cr" disabled={!canEdit} className="input-modern" /></div>
              <div><label htmlFor="cfg-direccion" className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" />Dirección</label><input id="cfg-direccion" value={info.direccion} onChange={e => setInfo({ ...info, direccion: e.target.value })} placeholder="San Rafael, Alajuela" disabled={!canEdit} className="input-modern" /></div>
            </div>
            <SaveBtn label="Guardar identidad" onClick={() => { save("Datos ASADA"); saveInfo(); }} />
            {form.sinpeNumero && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm"><span className="text-emerald-300 font-bold">SINPE activo: {form.sinpeNumero} • {form.sinpeNombre ?? form.tenantName}</span><span className="text-xs text-muted ml-2">— individual por ASADA, visible en portal abonado</span></div>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border border-emerald-500/15">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-1"><Smartphone className="w-5 h-5 text-emerald-400" /> SINPE Móvil — donde pagan tus abonados (individual por ASADA)</h3>
        <p className="text-xs text-muted mb-4">Cada ASADA tiene su <span className="text-white">SINPE distinto</span> junto a su información. El abonado ve el SINPE de <span className="text-white">{form.tenantName}</span>, no un número genérico.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="SINPE principal (8 dígitos)" k="sinpeNumero" value={form.sinpeNumero} ph="8888 0001" />
          <Field label="Nombre titular" k="sinpeNombre" value={form.sinpeNombre} ph="ASADA San Rafael" />
          <div><label htmlFor="cfg-sinpeBanco" className="block text-xs font-medium text-gray-400 mb-1.5">Banco</label>
            <select id="cfg-sinpeBanco" value={form.sinpeBanco} onChange={e => setForm({ ...form, sinpeBanco: e.target.value })} disabled={!canEdit} className="select-modern disabled:opacity-60">
              <option value="BNCR">BNCR</option><option value="BCR">BCR</option><option value="BAC">BAC</option><option value="Davivienda">Davivienda</option><option value="Scotiabank">Scotiabank</option><option value="Otro">Otro</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <Field label="SINPE secundario (opcional)" k="sinpeNumero2" value={form.sinpeNumero2} ph="—" />
          <Field label="Nombre titular 2" k="sinpeNombre2" value={form.sinpeNombre2} ph="—" />
          <div className="flex items-end"><SaveBtn label="Guardar SINPE" onClick={() => save("SINPE")} className="w-full justify-center" /></div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Droplets className="w-5 h-5 text-blue-400" /> Tarifas ARESEP</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label htmlFor="cfg-tprhDomiciliar" className="block text-xs font-medium text-gray-400 mb-1.5">TPRH domiciliar (₡)</label><input id="cfg-tprhDomiciliar" type="number" value={form.tprhDomiciliar} onChange={e => setForm({ ...form, tprhDomiciliar: Number(e.target.value) })} disabled={!canEdit} className="input-modern" /></div>
          <div><label htmlFor="cfg-tprhComercial" className="block text-xs font-medium text-gray-400 mb-1.5">TPRH comercial (₡)</label><input id="cfg-tprhComercial" type="number" value={form.tprhComercial} onChange={e => setForm({ ...form, tprhComercial: Number(e.target.value) })} disabled={!canEdit} className="input-modern" /></div>
          <div><label htmlFor="cfg-hidrantesMensual" className="block text-xs font-medium text-gray-400 mb-1.5">Hidrantes mensual (₡)</label><input id="cfg-hidrantesMensual" type="number" value={form.hidrantesMensual} onChange={e => setForm({ ...form, hidrantesMensual: Number(e.target.value) })} disabled={!canEdit} className="input-modern" /></div>
        </div>
        <SaveBtn label="Guardar tarifas" onClick={() => save("Tarifas")} className="mt-4" />
      </div>

      <div className="glass rounded-2xl p-6 border border-cyan-500/15">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-1"><Smartphone className="w-5 h-5 text-cyan-400" /> WhatsApp remitente — nombre y número de la ASADA</h3>
        <p className="text-xs text-muted mb-4">Los recordatorios saldrán <span className="text-white font-bold">desde el número de la ASADA</span>, no de la plataforma.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="WhatsApp número ASADA (8 dígitos)" k="whatsappNumero" value={form.whatsappNumero} ph="8888 1234" />
          <Field label="Nombre verificado WhatsApp" k="whatsappNombre" value={form.whatsappNombre} ph="ASADA San Rafael" />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Field label="Phone ID (Meta Cloud API)" k="whatsappPhoneId" value={form.whatsappPhoneId} ph="123456789012345" />
          <div><label htmlFor="cfg-whatsappToken" className="block text-xs font-medium text-gray-400 mb-1.5">Token (se encripta)</label><input id="cfg-whatsappToken" type="password" value={form.whatsappToken ?? ""} onChange={e => setForm({ ...form, whatsappToken: e.target.value })} placeholder="EAAx..." disabled={!canEdit} className="input-modern disabled:opacity-60" /></div>
        </div>
        <SaveBtn label="Guardar WhatsApp" onClick={() => save("WhatsApp")} className="mt-4" />
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Landmark className="w-5 h-5 text-purple-400" /> Hacienda (solo ADMIN)</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Usuario ATV" k="haciendaUser" value={form.haciendaUser} ph="test@hacienda.go.cr" />
          <Field label="Sucursal" k="sucursal" value={form.sucursal} ph="001" />
          <Field label="Terminal" k="terminal" value={form.terminal} ph="00001" />
        </div>
      </div>
    </div>
  );
}
