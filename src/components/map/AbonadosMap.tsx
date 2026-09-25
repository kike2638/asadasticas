"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Evita SSR
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

interface Abonado {
  id: string; nis: string; name: string; lat: number; lng: number;
  category: string; status: string; ruta: string | null; telefono: string | null;
  deuda: number; medidor: string;
}

const statusColor: Record<string, string> = {
  ACTIVO: "#22d3ee", MOROSO: "#f59e0b", CORTE: "#ef4444", SUSPENDIDO: "#a78bfa", RETIRADO: "#64748b",
};
const categoryIcon: Record<string, string> = {
  DOMICILIAR: "🏠", COMERCIAL: "🏪", INDUSTRIAL: "🏭", PUBLICO: "🏛️",
};

export default function AbonadosMap({ abonados }: { abonados: Abonado[] }) {
  const [filterRuta, setFilterRuta] = useState<string>("TODAS");
  const [filterCat, setFilterCat] = useState<string>("TODAS");
  const [filterStatus, setFilterStatus] = useState<string>("TODAS");
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    // Carga CSS via link + fix icon
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
    }
    import("leaflet").then(L => {
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeafletReady(true);
    });
  }, []);

  const rutas = [...new Set(abonados.map(a => a.ruta).filter(Boolean))] as string[];
  const filtrados = abonados.filter(a =>
    (filterRuta === "TODAS" || a.ruta === filterRuta) &&
    (filterCat === "TODAS" || a.category === filterCat) &&
    (filterStatus === "TODAS" || a.status === filterStatus)
  );

  const center: [number, number] = filtrados.length
    ? [filtrados.reduce((s, a) => s + a.lat, 0) / filtrados.length, filtrados.reduce((s, a) => s + a.lng, 0) / filtrados.length]
    : [9.93, -84.08]; // San José fallback

  const withGPS = filtrados.filter(a => a.lat && a.lng);
  const sinGPS = filtrados.length - withGPS.length;

  if (!leafletReady) return <div className="glass rounded-2xl p-8 text-center text-muted">Cargando mapa...</div>;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <select value={filterRuta} onChange={e => setFilterRuta(e.target.value)} className="select-modern py-2 text-sm">
          <option value="TODAS">Todas las rutas ({abonados.length})</option>
          {rutas.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="null">Sin ruta</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="select-modern py-2 text-sm">
          <option value="TODAS">Todas categorías</option>
          <option value="DOMICILIAR">Domiciliar</option>
          <option value="COMERCIAL">Comercial</option>
          <option value="PUBLICO">Público</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-modern py-2 text-sm">
          <option value="TODAS">Todos estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="MOROSO">Moroso</option>
          <option value="CORTE">Corte</option>
        </select>
        <span className="ml-auto text-xs text-muted">{withGPS.length} con GPS • {sinGPS} sin ubicar</span>
      </div>

      <div className="glass rounded-2xl overflow-hidden" style={{ height: 520 }}>
        {/* @ts-ignore */}
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
          {/* @ts-ignore */}
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {withGPS.map(a => (
            // @ts-ignore
            <Marker key={a.id} position={[a.lat, a.lng]}>
              {/* @ts-ignore */}
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>{categoryIcon[a.category] ?? "📍"} {a.name}</strong><br />
                  NIS {a.nis} • {a.ruta ?? "Sin ruta"}<br />
                  <span style={{ color: statusColor[a.status] ?? "#666", fontWeight: 600 }}>{a.status}</span> • {a.category}<br />
                  Medidor {a.medidor}<br />
                  {a.deuda > 0 && <span style={{ color: "#ef4444" }}>Deuda ₡{a.deuda.toLocaleString()}</span>}<br />
                  {a.telefono && <a href={`https://wa.me/506${a.telefono.replace(/\D/g, "").slice(-8)}`} target="_blank">WhatsApp</a>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusColor).map(([k, c]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border" style={{ background: `${c}18`, borderColor: `${c}40`, color: c }}>
            <span className="w-2 h-2 rounded-full" style={{ background: c }} /> {k}
          </span>
        ))}
      </div>
    </div>
  );
}
