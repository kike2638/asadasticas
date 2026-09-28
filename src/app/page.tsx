import Link from "next/link";
import {
  Droplets,
  ShieldCheck,
  Zap,
  MapPin,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  WifiOff,
  Receipt,
  MessageCircle,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import DemoForm from "@/components/landing/DemoForm";
import { TIERS, type Tier } from "@/lib/saas/pricing";

const features = [
  { icon: Zap, title: "Campo offline", desc: "Dexie + GPS + foto del medidor. Sincroniza cuando hay señal y detecta picos de consumo." },
  { icon: ShieldCheck, title: "Hacienda real", desc: "Clave 50, consecutivo 20 y firma XAdES-BES. Tiquete electrónico 04 emitido automáticamente." },
  { icon: TrendingUp, title: "Caja que cuadra", desc: "Conciliación SINPE FIFO, arqueo diario, recibo de 80 mm y cobro por WhatsApp." },
  { icon: MapPin, title: "Facturación por ruta", desc: "RUTA-01/RUTA-02: facturás toda la ruta de un solo tiro y seguís cada abonado en el mapa." },
  { icon: FileText, title: "Reportes para Junta", desc: "Cobrabilidad, ANC, morosidad a 30/60 días y exportación CSV lista para la Junta Directiva." },
  { icon: Droplets, title: "Tarifa ARESEP correcta", desc: "Base dinámica, TPRH, hidrantes e IVA exento hasta 15 m³, según la tarifa vigente." },
];

const pasos = [
  { n: 1, title: "Creá tu ASADA", desc: "Activás tu cuenta de prueba de 14 días con un correo y contraseña. Sin tarjeta." },
  { n: 2, title: "Migrás tu padrón", desc: "Nos pasás tu Excel y en un día tenés abonados, medidores y saldos cargados." },
  { n: 3, title: "Facturás y cobrás", desc: "Lecturas en campo, factura con tiquete 04 y recordatorios por WhatsApp automáticos." },
];

const faqs = [
  {
    q: "¿Cuánto cuesta?",
    a: "El precio depende de la cantidad de abonados: desde ₡14.900 al mes para hasta 50 abonados. Incluye actualizaciones, soporte por WhatsApp y tiquetes electrónicos. Empezás con 14 días gratis, sin tarjeta.",
  },
  {
    q: "¿Migran mis datos del Excel?",
    a: "Sí. Nos compartís tu padrón actual (abonados, medidores y saldos) y lo cargamos por vos en el primer día. Vos seguís trabajando en Excel hasta que estés listo.",
  },
  {
    q: "¿Funciona sin señal en el campo?",
    a: "Sí. La captura de lecturas funciona offline con GPS y foto del medidor: guardás en el celular y sincroniza solo cuando vuelve la conexión.",
  },
  {
    q: "¿Es válido ante Hacienda y la ARESEP?",
    a: "Sí. El sistema firma el tiquete electrónico 04 con clave 50 y consecutivo 20, y aplica la tarifa ARESEP vigente (base dinámica, TPRH, IVA exento hasta 15 m³).",
  },
  {
    q: "¿Mis abonados pueden ver su estado?",
    a: "Sí. Cada abonado consulta su deuda y factura desde el Portal del Abonado con su NIS, sin necesidad de llamadas ni visitas a la oficina.",
  },
];

function tierRange(t: Tier) {
  if (t.max === Infinity) return `${t.min.toLocaleString("es-CR")}+ abonados`;
  return `${t.min}–${t.max} abonados`;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--base)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(3,6,18,0.82)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"><Droplets className="w-5 h-5 text-[var(--on-brand)]" aria-hidden="true" /></span>
            <span className="font-bold tracking-tight">AquaLectura CR</span>
          </Link>
          <nav aria-label="Secciones" className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#funciones" className="hover:text-white transition-colors">Funciones</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#preguntas" className="hover:text-white transition-colors">Preguntas</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/portal" className="hidden sm:inline-flex px-3 py-2 text-sm text-emerald-300 hover:text-white font-medium min-h-11 items-center">Portal abonado</Link>
            <Link href="/login" className="px-3 py-2 text-sm text-gray-300 hover:text-white min-h-11 inline-flex items-center">Ingresar</Link>
            <Link href="/onboarding" className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[var(--on-brand)] font-semibold text-sm min-h-11 inline-flex items-center">Registrar mi ASADA</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              Software costarricense para ASADAS comunales
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-6 leading-[1.1] animate-fade-in-1">
              Tu ASADA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">cobra a tiempo</span> y reporta sin Excel
            </h1>
            <p className="text-lg text-gray-400 mt-5 max-w-xl leading-relaxed animate-fade-in-1">
              Lecturas offline con GPS, facturación ARESEP con tiquete electrónico 04, conciliación SINPE y cobro por WhatsApp. De 3 días de facturación a 20 minutos.
            </p>
            <div className="flex flex-wrap gap-3 mt-8 animate-fade-in-2">
              <Link href="#demo" className="px-6 py-3.5 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[var(--on-brand)] font-bold inline-flex items-center gap-2 min-h-11">
                Solicitar demo <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="#precios" className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium inline-flex items-center min-h-11 hover:bg-white/10 transition-colors">
                Ver precios
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-gray-400">
              {["Sin tarjeta de crédito", "Trial de 14 días", "Migración incluida"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />{item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vista previa del panel */}
          <div className="glass rounded-3xl p-5 border border-cyan-500/15 animate-fade-in-2">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" /> Panel de la ASADA
              </span>
              <span className="text-xs text-muted">Hoy</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <p className="text-lg font-bold text-white">₡1 284 500</p>
                <p className="text-xs text-muted">Facturado hoy</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <p className="text-lg font-bold text-cyan-400">42 / 42</p>
                <p className="text-xs text-muted">Lecturas sincronizadas</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <p className="text-lg font-bold text-emerald-400">38</p>
                <p className="text-xs text-muted">WhatsApp de cobro enviados</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <p className="text-lg font-bold text-amber-400">₡312 000</p>
                <p className="text-xs text-muted">Por cobrar esta semana</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                "Tiquete 04 firmado y enviado a Hacienda",
                "Caja de ayer cuadrada al colón",
                "Recordatorios enviados a 38 abonados",
              ].map(t => (
                <li key={t} className="flex items-center gap-2.5 text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Confianza */}
      <section aria-label="Cumplimiento normativo" className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-400">
          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Cumple ARESEP 2026</span>
          <span className="flex items-center gap-2"><Receipt className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Hacienda v4.3 · Tiquete 04</span>
          <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-cyan-400" aria-hidden="true" /> SINPE Móvil</span>
          <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Reportes AyA</span>
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Datos alojados en Costa Rica</span>
        </div>
      </section>

      {/* Antes / después */}
      <section id="funciones" className="max-w-6xl mx-auto px-6 pt-14 pb-4 scroll-mt-20">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
          Del Excel y el cobro manual <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">al cobro automático</span>
        </h2>
        <p className="text-center text-gray-400 mt-3 max-w-2xl mx-auto">Lo que cambia cuando tu ASADA deja la hoja de cálculo.</p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm font-semibold text-red-300 mb-4">Hoy, con Excel</p>
            <ul className="space-y-3 text-sm text-gray-400">
              {[
                "3 días de facturación por ruta, a mano",
                "Descuadres de caja que nadie detecta a tiempo",
                "Cobro recordado al abonado, uno por uno",
                "Reportes de la Junta armados la noche antes",
                "Sin lecturas cuando no hay señal",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5">
                  <XCircle className="w-[18px] h-[18px] text-red-400 mt-0.5 shrink-0" aria-hidden="true" />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-2xl p-6 border border-cyan-500/20">
            <p className="text-sm font-semibold text-cyan-300 mb-4">Con AquaLectura CR</p>
            <ul className="space-y-3 text-sm text-gray-200">
              {[
                "Toda la ruta facturada en 20 minutos",
                "SINPE conciliado automáticamente (FIFO)",
                "WhatsApp de cobro y recordatorios automáticos",
                "Reportes de cobrabilidad y morosidad al clic",
                "Lecturas offline con GPS y foto del medidor",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle className="w-[18px] h-[18px] text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Todo lo que tu ASADA necesita, en un solo lugar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {features.map(card => (
            <div key={card.title} className="glass p-5 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-500/25 border border-cyan-500/20 flex items-center justify-center mb-3">
                <card.icon className="w-5 h-5 text-cyan-300" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-white">{card.title}</h3>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 pt-14 pb-4 scroll-mt-20">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Listo en 3 pasos</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {pasos.map(p => (
            <div key={p.n} className="glass p-6 rounded-2xl">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[var(--on-brand)] font-bold flex items-center justify-center mb-4">{p.n}</span>
              <h3 className="font-semibold text-white">{p.title}</h3>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="max-w-6xl mx-auto px-6 pt-14 pb-4 scroll-mt-20">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Precio por cantidad de abonados</h2>
          <p className="text-gray-400 mt-3">Pagás según el padrón que tenés, no por usuario. Trial de 14 días sin tarjeta.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {TIERS.map(t => (
              <div key={t.label} className="glass p-5 rounded-2xl flex flex-col">
                <p className="text-sm text-gray-400">{tierRange(t)}</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {"\u20A1"}{t.priceCRC.toLocaleString("es-CR")}
                  <span className="text-sm font-normal text-muted">/mes</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-300 flex-1">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />Tiquete 04 Hacienda</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />Lecturas offline con GPS</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />Conciliación SINPE y WhatsApp</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />Reportes de Junta y morosidad</li>
                </ul>
                <Link href="#demo" className="mt-5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-medium text-center hover:bg-white/10 transition-colors min-h-11 inline-flex items-center justify-center">
                  Empezar prueba
                </Link>
              </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted mt-5">
          Más de 1 000 abonados: se agrega ₡60 por abonado extra al mes. ¿No sabés tu tramo? Escribinos al 8760-7243.
        </p>
      </section>

      {/* Demo */}
      <section id="demo" className="max-w-6xl mx-auto px-6 pt-14 pb-4 scroll-mt-20">
        <div className="glass rounded-3xl p-6 md:p-8 grid md:grid-cols-2 gap-8">
          <div>
            <p className="section-label">Demo personalizada</p>
            <h2 className="text-2xl font-bold text-white mt-2">Solicita tu demo en 30 segundos</h2>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Te respondemos directo a tu WhatsApp <span className="text-white font-mono">8760-7243</span> — AquaLectura CR. Sin compromiso: revisamos tu Excel y tu SINPE con vos.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-gray-300">
              {[
                "Migración de tu Excel en 1 día",
                "SINPE Móvil y logo de tu ASADA",
                "Probás con tus propios abonados",
              ].map(t => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />{t}
                </li>
              ))}
            </ul>
          </div>
          <DemoForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="max-w-3xl mx-auto px-6 pt-14 pb-4 scroll-mt-20">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-3">
          {faqs.map(f => (
            <details key={f.q} className="group glass rounded-2xl">
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none min-h-11">
                <span className="font-medium text-white">{f.q}</span>
                <ChevronDown className="w-4 h-4 text-muted shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 -mt-1 text-sm text-gray-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-6">
        <div className="glass rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-5 border border-cyan-500/15">
          <div>
            <h2 className="text-xl font-bold text-white">¿Lista para cobrar a tiempo?</h2>
            <p className="text-sm text-gray-400 mt-1.5">Empezá gratis 14 días. Pagás solo cuando estés facturando.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="#demo" className="px-6 py-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[var(--on-brand)] font-bold min-h-11 inline-flex items-center">Solicitar demo</Link>
            <Link href="/login" className="px-6 py-3 rounded-xl bg-white text-[var(--base)] font-semibold min-h-11 inline-flex items-center">Ingresar ASADA</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"><Droplets className="w-[18px] h-[18px] text-[var(--on-brand)]" aria-hidden="true" /></span>
              <span className="font-bold text-white">AquaLectura CR</span>
            </div>
            <p className="text-gray-400 mt-3 leading-relaxed">Gestión de agua para ASADAS comunales de Costa Rica: facturación, cobro y reportes sin Excel.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Producto</p>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#funciones" className="hover:text-white transition-colors">Funciones</a></li>
              <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
              <li><Link href="/portal" className="hover:text-white transition-colors">Portal del abonado</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Contacto</p>
            <ul className="space-y-2 text-gray-400">
              <li><a href="https://wa.me/50687607243" className="hover:text-white transition-colors">WhatsApp 8760-7243</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Ingresar ASADA</Link></li>
              <li><Link href="/onboarding" className="hover:text-white transition-colors">Registrar mi ASADA</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <p className="max-w-6xl mx-auto px-6 py-5 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2026 AquaLectura CR</span>
            <span>Cumple ARESEP 2026 · Hacienda v4.3 · Reportes AyA</span>
            <span className="flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5" aria-hidden="true" />Hecho para campo, con agua pura en Costa Rica</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
