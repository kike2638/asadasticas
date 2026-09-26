"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Plus } from "lucide-react";

export default function SubscribersClient({ subscribers }: { subscribers: any[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return subscribers;
    const nq = q.toLowerCase();
    return subscribers.filter(s => s.name.toLowerCase().includes(nq) || s.nis.includes(q) || s.meters?.[0]?.number.includes(q));
  }, [q, subscribers]);

  return (
    <>
      <div className="glass rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, NIS o medidor..." aria-label="Buscar abonados por nombre, NIS o medidor" className="input-modern pl-12" type="search" />
        </div>
        {q && <p className="text-xs text-muted mt-2">{filtered.length} resultados para &quot;{q}&quot;</p>}
      </div>
      {q && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">Sin resultados</p>
        </div>
      )}
    </>
  );
}
