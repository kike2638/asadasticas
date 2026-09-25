"use client";

export default function DemoForm() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = f.get("asada"), c = f.get("contacto"), a = f.get("abonados");
    window.open(`https://wa.me/50687607243?text=${encodeURIComponent(`Hola AquaLectura, soy ${n} (${c}) con ${a} abonados. Quiero demo`)}`, "_blank");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="asada" required placeholder="ASADA San Rafael" className="input-modern w-full" />
      <div className="grid grid-cols-2 gap-3">
        <input name="contacto" required placeholder="WhatsApp 8888-0000" className="input-modern" />
        <input name="abonados" required placeholder="Abonados ej: 350" className="input-modern" />
      </div>
      <button type="submit" className="btn-primary w-full">Enviar por WhatsApp → 8760-7243</button>
      <p className="text-xs text-muted text-center">o escribe directo a <a href="https://wa.me/50687607243" className="text-cyan-400 underline">wa.me/50687607243</a></p>
    </form>
  );
}
