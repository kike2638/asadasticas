"use client";
import { useState } from "react";
import ReadingCapture from "@/components/mobile/ReadingCapture";

export default function LecturasClient({ tenantId, lectorId }: { tenantId: string; lectorId: string }) {
  const [tab, setTab] = useState<"captura" | "historial">("captura");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("captura")} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "captura" ? "bg-[var(--brand-grad)] text-[#042635]" : "bg-white/5 text-gray-300 border border-white/10"}`}>📱 Captura campo</button>
        <button onClick={() => setTab("historial")} className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "historial" ? "bg-[var(--brand-grad)] text-[#042635]" : "bg-white/5 text-gray-300 border border-white/10"}`}>📋 Historial</button>
      </div>
      {tab === "captura" && <ReadingCapture tenantId={tenantId} lectorId={lectorId} />}
      {tab === "historial" && <p className="text-sm text-muted">Ver tabla debajo</p>}
    </div>
  );
}
