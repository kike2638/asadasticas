"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, AlertCircle } from "lucide-react";

export default function NewForm() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", nis: "", meterNumber: "", category: "DOMICILIAR", identificacion: "", telefono: "", email: "", direccion: "", rutaLectura: "RUTA-01", lat: "", lng: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr("");
    const res = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    if (!res.ok) { setErr(d.error); setLoading(false); return; }
    r.push(`/subscribers/${d.subscriber.id}`);
  };

  const Field = (p: any) => {
    const id = `sub-${p.k}`;
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1.5">{p.label}{p.req && " *"}</label>
        <input id={id} value={(form as any)[p.k]} onChange={e => setForm({ ...form, [p.k]: e.target.value })} placeholder={p.ph} required={p.req} className="input-modern" />
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
      {err && <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{err}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nombre completo" k="name" ph="Juan Pérez" req />
        <Field label="NIS" k="nis" ph="001" req />
        <Field label="N° medidor" k="meterNumber" ph="MED-0006" req />
        <div><label htmlFor="sub-category" className="block text-xs font-medium text-gray-400 mb-1.5">Categoría</label><select id="sub-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="select-modern"><option>DOMICILIAR</option><option>COMERCIAL</option><option>INDUSTRIAL</option><option>PUBLICO</option></select></div>
        <Field label="Cédula" k="identificacion" ph="102340567" />
        <Field label="Teléfono" k="telefono" ph="8888-0001" />
        <Field label="Email (FE)" k="email" ph="juan@example.cr" />
        <Field label="Ruta lectura" k="rutaLectura" ph="RUTA-01" />
        <Field label="Dirección" k="direccion" ph="San Rafael centro" />
        <Field label="Lat" k="lat" ph="10.015" />
        <Field label="Lng" k="lng" ph="-84.215" />
      </div>
      <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" />Crear abonado</>}</button>
    </form>
  );
}
