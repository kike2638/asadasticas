"use client";
import { useState, useEffect } from "react";
import { Droplets, Camera, MapPin, WifiOff, Wifi, AlertTriangle, Check } from "lucide-react";

interface Props {
  tenantId: string;
  lectorId: string;
}

export default function ReadingCapture({ tenantId, lectorId }: Props) {
  const [pending, setPending] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true), off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }));
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

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

      <div className="space-y-3">
        <select className="select-modern w-full text-sm">
          <option>Ruta: Todas</option>
          <option>RUTA-01 - Centro</option>
          <option>RUTA-02 - Calle Principal</option>
        </select>
        <input placeholder="NIS o medidor" className="input-modern w-full"/>
        <div className="flex gap-2">
          <input type="number" placeholder="Lectura m³" className="input-modern flex-1 text-lg font-bold"/>
          <button className="btn-primary px-4"><Camera className="w-5 h-5"/></button>
        </div>
        <select className="select-modern w-full">
          <option value="NONE">Sin anomalía</option>
          <option value="MEDIDOR_DANADO">Medidor dañado</option>
          <option value="FUGA_VISIBLE">Fuga visible</option>
          <option value="CONSUMO_EXCESIVO">Consumo excesivo</option>
        </select>
        <textarea placeholder="Observación (opcional)" rows={2} className="input-modern w-full text-sm"/>
        <button className="btn-primary w-full flex items-center justify-center gap-2">
          <Check className="w-5 h-5"/>Guardar lectura {isOnline ? "" : "(offline)"}
        </button>
        <button className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4"/> Sincronizar ahora ({pending})
        </button>
        <p className="text-[11px] text-muted flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400"/> Alerta automática si consumo {">"} 200% promedio o {">"}60m³</p>
      </div>
    </div>
  );
}
