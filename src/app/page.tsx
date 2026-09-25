import Link from "next/link";
import { Droplets, ShieldCheck, Zap, MapPin, FileText, TrendingUp, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050a18] text-white">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"><Droplets className="w-5 h-5 text-[#042635]" /></div>
          <span className="font-bold tracking-tight">AquaLectura CR <span className="text-cyan-400 text-xs ml-1">v2 ASADA</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/portal" className="px-4 py-2 text-sm text-emerald-300 hover:text-white font-medium">Portal abonado</Link>
          <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white">Ingresar ASADA</Link>
          <Link href="/onboarding" className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[#042635] font-semibold text-sm">Registrar mi ASADA</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Hecho para ASADAS comunales de Costa Rica • AyA • ARESEP • Hacienda
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-6 leading-tight">
          La ASADA que <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">cobra a tiempo</span><br />y reporta sin Excel
        </h1>
        <p className="text-lg text-gray-400 mt-4 max-w-2xl">
          Lecturas offline con GPS, facturación ARESEP con tiquete electrónico 04, SINPE FIFO y WhatsApp automático. De 3 días de facturación a 20 minutos.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link href="/portal" className="px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-[#042635] font-bold">Portal abonado — consulta tu deuda</Link>
          <Link href="/onboarding" className="px-6 py-3 rounded-xl bg-white text-[#050a18] font-semibold">Registrar mi ASADA</Link>
          <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white">Ver demo</Link>
        </div>
        <div className="flex flex-wrap gap-6 mt-8 text-sm text-gray-400">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />Offline-first campo</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />Tiquete 04 Hacienda</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />Sin Excel</span>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-4 pb-10">
        {[
          { icon: Zap, title: "Campo offline", desc: "Dexie + GPS + foto. Sincroniza cuando hay señal. Valida pico de consumo.", color: "from-cyan-400 to-blue-500" },
          { icon: ShieldCheck, title: "Hacienda real", desc: "Clave 50, consecutivo 20, XAdES-BES. Tiquete electrónico 04 automático.", color: "from-emerald-400 to-teal-500" },
          { icon: TrendingUp, title: "Caja que cuadra", desc: "SINPE FIFO, arqueo diario, recibo 80mm, WhatsApp de cobro.", color: "from-amber-400 to-orange-500" },
          { icon: MapPin, title: "Por ruta", desc: "RUTA-01/RUTA-02. Facturación masiva por caminador. Mapa abonados.", color: "from-blue-400 to-indigo-500" },
          { icon: FileText, title: "Reportes AyA", desc: "Cobrabilidad, ANC, morosidad 30/60d, CSV Junta Directiva.", color: "from-purple-400 to-pink-500" },
          { icon: Droplets, title: "ARESEP correcto", desc: "Base dinámica, TPRH, hidrantes, IVA exento hasta 15m³.", color: "from-cyan-400 to-blue-500" },
        ].map(card => (
          <div key={card.title} className="glass p-5 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}><card.icon className="w-5 h-5 text-white" /></div>
            <h3 className="font-semibold text-white">{card.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">¿ASADA con 300-2000 abonados?</p>
            <p className="text-sm text-gray-400">Migra tu Excel en 1 día. Soporte en español, de ASADA a ASADA.</p>
          </div>
          <Link href="/onboarding" className="px-6 py-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[#042635] font-bold shrink-0">Solicitar migración</Link>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">Hecho con 💧 en Costa Rica • Cumple AyA • ARESEP 2026 • Hacienda v4.3</p>
      </section>
    </div>
  );
}
