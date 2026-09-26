"use client";

export default function DemoForm() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = f.get("asada"), c = f.get("contacto"), a = f.get("abonados");
    window.open(`https://wa.me/50687607243?text=${encodeURIComponent(`Hola AquaLectura, soy ${n} (${c}) con ${a} abonados. Quiero demo`)}`, "_blank");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate={false}>
      <div>
        <label htmlFor="demo-asada" className="block text-xs font-medium text-gray-400 mb-1.5">Nombre de la ASADA *</label>
        <input id="demo-asada" name="asada" required placeholder="ASADA San Rafael" className="input-modern w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="demo-contacto" className="block text-xs font-medium text-gray-400 mb-1.5">WhatsApp *</label>
          <input id="demo-contacto" name="contacto" required inputMode="tel" placeholder="8888-0000" autoComplete="tel" className="input-modern" />
        </div>
        <div>
          <label htmlFor="demo-abonados" className="block text-xs font-medium text-gray-400 mb-1.5">Abonados *</label>
          <input id="demo-abonados" name="abonados" required inputMode="numeric" placeholder="ej. 350" className="input-modern" />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">Enviar por WhatsApp → 8760-7243</button>
      <p className="text-xs text-muted text-center">o escribe directo a <a href="https://wa.me/50687607243" className="text-cyan-400 underline">wa.me/50687607243</a></p>
    </form>
  );
}
