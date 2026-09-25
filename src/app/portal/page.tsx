"use client";
import { useEffect, useState } from "react";
import { Droplets, Search, Smartphone, FileText, AlertTriangle, CheckCircle, MapPin, Calendar, CreditCard } from "lucide-react";
import { formatCRC } from "@/lib/saas/pricing";

export default function PortalPage() {
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([]);
  const [slug, setSlug] = useState("asada-ejemplo");
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal/tenants").then(r => r.json()).then(d => setTenants(d.tenants ?? [])).catch(() => {});
  }, []);

  const buscar = async () => {
    if (!slug || !nis) { setError("Selecciona ASADA y NIS"); return; }
    setLoading(true); setError(""); setData(null);
    const res = await fetch(`/api/portal/lookup?tenant=${encodeURIComponent(slug)}&nis=${encodeURIComponent(nis)}`);
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else setData(json);
    setLoading(false);
  };

  const qrData = data ? `SINPE:${data.sinpe.numero}?amount=${data.deuda.total}&reference=${data.abonado.nis}&asada=${slug}` : "";
  const qrUrl = qrData ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}` : "";

  return (
    <div className="min-h-screen bg-[#050a18] text-white">
      <header className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"><Droplets className="w-5 h-5 text-[#042635]" /></div>
        <div>
          <p className="font-bold tracking-tight">Portal del Abonado</p>
          <p className="text-xs text-gray-400">Consulta tu deuda y paga por SINPE Móvil</p>
        </div>
        <a href="/" className="ml-auto text-sm text-gray-400 hover:text-white">← Inicio</a>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-white flex items-center gap-2"><Search className="w-5 h-5 text-cyan-400" />Consulta tu estado de cuenta</h2>
          <p className="text-sm text-muted mt-1">Selecciona tu ASADA e ingresa tu NIS (número de abonado que aparece en tu factura).</p>
          <div className="grid md:grid-cols-[1.5fr_1fr_auto] gap-3 mt-4">
            <select value={slug} onChange={e => setSlug(e.target.value)} className="select-modern">
              {tenants.length === 0 && <option value="asada-ejemplo">ASADA San Rafael (demo)</option>}
              {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
            <input value={nis} onChange={e => setNis(e.target.value)} placeholder="NIS ej: 001" className="input-modern" onKeyDown={e => e.key === "Enter" && buscar()} />
            <button onClick={buscar} disabled={loading} className="btn-primary px-6 flex items-center justify-center gap-2">
              {loading ? "Buscando..." : <><Search className="w-4 h-4" />Consultar</>}
            </button>
          </div>
          <p className="text-xs text-muted mt-2">Prueba demo: ASADA San Rafael + NIS 001, 002, 003</p>
          {error && <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
        </div>

        {data && (
          <>
            <div className="glass rounded-2xl p-6 border border-cyan-500/15">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {data.asada.logoUrl && <img src={data.asada.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1" />}
                  <div>
                    <p className="text-sm text-muted flex items-center gap-1"><MapPin className="w-4 h-4" />{data.asada.name}</p>
                    <h3 className="text-xl font-bold text-white">{data.abonado.name}</h3>
                    <p className="text-sm text-muted">NIS {data.abonado.nis} • {data.abonado.category} • <span className={`badge ${data.abonado.status === "ACTIVO" ? "badge-green" : "badge-orange"}`}>{data.abonado.status}</span> • Medidor {data.abonado.medidor}</p>
                    {data.asada.direccion && <p className="text-xs text-muted">{data.asada.direccion}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Deuda total</p>
                  <p className={`text-2xl font-bold ${data.deuda.total > 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCRC(data.deuda.total)}</p>
                  <p className="text-xs text-muted">{data.deuda.cantidad} factura{data.deuda.cantidad !== 1 ? "s" : ""} pendiente{data.deuda.cantidad !== 1 ? "s" : ""} {data.deuda.vencida > 0 && `• ${data.deuda.vencida} vencida`}</p>
                </div>
              </div>

              {data.deuda.total === 0 ? (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-300"><CheckCircle className="w-5 h-5" />¡Al día! No tienes deuda pendiente.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="rounded-2xl bg-white p-4 flex flex-col items-center">
                    <img src={qrUrl} alt="QR SINPE" width={220} height={220} className="rounded-xl" />
                    <p className="text-xs text-gray-900 font-bold mt-2">Escanea para pagar por SINPE Móvil</p>
                    <p className="text-[11px] text-gray-500 text-center">Abre tu banco → SINPE Móvil → Escanear QR o digita manual</p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                      <p className="text-xs font-bold text-cyan-300 flex items-center gap-2"><Smartphone className="w-4 h-4" /> PAGA AQUÍ — SINPE Móvil</p>
                      <p className="text-2xl font-mono font-bold text-white mt-2 tracking-widest">{data.sinpe.numero ? `${data.sinpe.numero.slice(0, 4)}-${data.sinpe.numero.slice(4)}` : "—"}</p>
                      <p className="text-sm text-gray-300">{data.sinpe.nombre} • {data.sinpe.banco}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-black/40 p-2"><p className="text-muted">Monto exacto</p><p className="font-bold text-white text-sm">{formatCRC(data.deuda.total)}</p></div>
                        <div className="rounded-lg bg-black/40 p-2"><p className="text-muted">Referencia</p><p className="font-mono font-bold text-white">{data.abonado.nis}</p></div>
                      </div>
                      <p className="text-[11px] text-muted mt-2">En tu app del banco pon <span className="text-white">Referencia: {data.abonado.nis}</span> para que se concilie automático.</p>
                      <a href={`https://wa.me/506${data.sinpe.numero}?text=Hola%20pago%20NIS%20${data.abonado.nis}%20${formatCRC(data.deuda.total)}`} target="_blank" className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold text-center block">Enviar comprobante por WhatsApp</a>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />Después de pagar, envía el comprobante SINPE por WhatsApp a la ASADA para validar en minutos.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /><h3 className="font-semibold text-white">Facturas pendientes</h3></div>
              {data.facturas.length === 0 ? <p className="text-center py-8 text-muted text-sm">Sin facturas pendientes</p> : (
                <div className="divide-y divide-white/5">
                  {data.facturas.map((f: any) => (
                    <div key={f.id} className="p-4 flex items-center justify-between">
                      <div><p className="text-sm text-white font-mono">{f.periodo} • {f.consecutivo.slice(-10)}</p><p className="text-xs text-muted flex items-center gap-1"><Calendar className="w-3 h-3" />Vence {new Date(f.vencimiento).toLocaleDateString("es-CR")} • {f.estado}</p></div>
                      <div className="text-right"><p className="text-sm font-bold text-white">{formatCRC(f.saldo)}</p><p className="text-xs text-muted">{formatCRC(f.total)} total</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.pagosRecientes.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /><h3 className="font-semibold text-white">Últimos pagos</h3></div>
                <div className="divide-y divide-white/5">
                  {data.pagosRecientes.map((p: any, i: number) => (
                    <div key={i} className="p-3 flex justify-between text-sm"><span className="text-gray-400">{new Date(p.fecha).toLocaleDateString("es-CR")}</span><span className="text-white">{formatCRC(p.monto)} • {p.metodo}</span></div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-500">Portal público • No necesitas cuenta • Datos actualizados • Si tu NIS no aparece, contacta a tu ASADA</p>
      </main>
    </div>
  );
}
