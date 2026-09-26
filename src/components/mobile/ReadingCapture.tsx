"use client";
import { useState, useEffect, useRef } from "react";
import { Droplets, Camera, MapPin, WifiOff, Wifi, AlertTriangle, Check, Loader2 } from "lucide-react";

interface Props { tenantId: string; lectorId: string; }

export default function ReadingCapture({ tenantId, lectorId }: Props) {
  const [pending, setPending] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [ruta, setRuta] = useState("TODAS");
  const [nis, setNis] = useState("");
  const [lectura, setLectura] = useState("");
  const [anomalia, setAnomalia] = useState("NONE");
  const [obs, setObs] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true), off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true });
      const id = navigator.geolocation.watchPosition(p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }));
      return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); navigator.geolocation.clearWatch(id); };
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    // Carga pendientes Dexie
    import("@/lib/offline/db").then(m => m.db.readings.filter(r => r.tenantId === tenantId && !r.synced).count().then(setPending).catch(() => {}));
  }, [tenantId]);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 3 * 1024 * 1024) { setMsg("Foto máx 3MB"); return; }
    const r = new FileReader(); r.onload = () => setFoto(r.result as string); r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!nis || !lectura) { setMsg("NIS y lectura requeridos"); return; }
    const val = Number(lectura);
    if (isNaN(val) || val < 0) { setMsg("Lectura inválida"); return; }
    setSaving(true); setMsg("");
    try {
      // Busca meter por NIS o número
      const res = await fetch(`/api/subscribers?search=${encodeURIComponent(nis)}`);
      // Fallback: intenta lookup directo via subscribers list
      const subsRes = await fetch("/api/subscribers");
      const subsData = await subsRes.json();
      const found = (subsData.subscribers ?? []).find((s: any) => s.nis === nis || s.meters?.[0]?.number === nis);
      if (!found) throw new Error(`Abonado/medidor ${nis} no encontrado`);
      const meterId = found.meters[0]?.id;
      const meterNumber = found.meters[0]?.number;
      if (!meterId) throw new Error("Sin medidor");

      if (!isOnline) {
        const { saveOfflineReading } = await import("@/lib/offline/db");
        await saveOfflineReading({ tenantId, meterId, meterNumber, subscriberName: found.name, nis: found.nis, ruta: ruta === "TODAS" ? found.rutaLectura ?? "SIN-RUTA" : ruta, value: val, date: new Date().toISOString(), anomalia, observacion: obs, fotoBase64: foto ?? undefined, gpsLat: gps?.lat, gpsLng: gps?.lng, lectorId });
        setPending(p => p + 1); setMsg(`✓ Guardado offline para ${found.name} (${found.nis})`);
      } else {
        const r = await fetch("/api/readings/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readings: [{ meterId, value: val, date: new Date().toISOString(), anomalia, observacion: obs, gpsLat: gps?.lat, gpsLng: gps?.lng, fotoUrl: foto ? "foto" : undefined }] }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error);
        setMsg(`✓ Lectura ${val} m³ para ${found.name} guardada`);
      }
      setNis(""); setLectura(""); setAnomalia("NONE"); setObs(""); setFoto(null);
    } catch (e: any) { setMsg(e.message); }
    setSaving(false);
  };

  const handleSync = async () => {
    setSyncing(true); setMsg("");
    try {
      const { syncWithServer } = await import("@/lib/offline/db");
      const r = await syncWithServer(tenantId);
      if (r.errors.length) setMsg(r.errors.join(" "));
      else { setMsg(`✓ ${r.synced} sincronizadas`); setPending(0); }
    } catch (e: any) { setMsg(e.message); }
    setSyncing(false);
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2"><Droplets className="w-5 h-5 text-cyan-400"/>Captura en campo</h3>
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${isOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5"/> : <WifiOff className="w-3.5 h-3.5"/>}
          {isOnline ? "En línea" : "Offline - guarda local"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-gray-400">Pendientes por sincronizar</p>
          <p className="text-xl font-bold text-white">{pending}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>GPS</p>
          <p className="text-xs font-mono text-gray-300">{gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "Buscando..."}</p>
        </div>
      </div>

      {msg && <div className={`p-3 rounded-xl text-sm ${msg.startsWith("✓") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>{msg}</div>}

      <div className="space-y-3">
        <select value={ruta} onChange={e => setRuta(e.target.value)} aria-label="Ruta de lectura" className="select-modern w-full text-sm">
          <option value="TODAS">Ruta: Todas</option>
          <option value="RUTA-01">RUTA-01 - Centro</option>
          <option value="RUTA-02">RUTA-02 - Calle Principal</option>
        </select>
        <input value={nis} onChange={e => setNis(e.target.value)} placeholder="NIS o número medidor (ej 001)" aria-label="NIS o número de medidor" inputMode="numeric" className="input-modern w-full"/>
        <div className="flex gap-2">
          <input type="number" value={lectura} onChange={e => setLectura(e.target.value)} placeholder="Lectura m³" aria-label="Lectura en metros cúbicos" inputMode="decimal" className="input-modern flex-1 text-lg font-bold"/>
          <button onClick={() => fileRef.current?.click()} aria-label="Tomar o subir foto del medidor" className="btn-primary px-4 min-h-11"><Camera className="w-5 h-5"/></button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Foto del medidor" onChange={handleFoto} />
        </div>
        {foto && <img src={foto} alt="preview" className="w-full h-32 object-cover rounded-xl" />}
        <select value={anomalia} onChange={e => setAnomalia(e.target.value)} className="select-modern w-full">
          <option value="NONE">Sin anomalía</option>
          <option value="MEDIDOR_DANADO">Medidor dañado</option>
          <option value="FUGA_VISIBLE">Fuga visible</option>
          <option value="CONSUMO_EXCESIVO">Consumo excesivo</option>
          <option value="CONSUMO_CERO">Consumo cero</option>
        </select>
        <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observación (opcional)" rows={2} className="input-modern w-full text-sm"/>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Check className="w-5 h-5"/>Guardar lectura {isOnline ? "" : "(offline)"}</>}
        </button>
        <button onClick={handleSync} disabled={syncing || pending===0} className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 flex items-center justify-center gap-2 disabled:opacity-40">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4"/>} Sincronizar ahora ({pending})
        </button>
        <p className="text-xs text-muted flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400"/> Alerta si consumo &gt; 200% promedio o &gt;60m³ — queda en anomalía para fontanero</p>
      </div>
    </div>
  );
}
