"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Calculator,
  Droplets,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

interface Subscriber {
  id: string;
  name: string;
  nis: string;
  category: string;
  meters: { id: string; number: string }[];
}

interface BillResult {
  consumption: number;
  bill: {
    baseCharge: number;
    variableCharge: number;
    additionalCharges: number;
    total: number;
    breakdown: { block: string; m3: number; cost: number }[];
  };
  subscriberName: string;
}

export default function BillingPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [result, setResult] = useState<BillResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/subscribers")
      .then((res) => res.json())
      .then((data) => setSubscribers(data.subscribers || []))
      .catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!selectedMeterId || !currentReading) {
      setError("Seleccione medidor y ingrese lectura");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/billing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterId: selectedMeterId,
          currentReading: parseFloat(currentReading),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al calcular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-1">Facturación</h1>
        <p className="text-gray-400">Calcule y genere facturas para abonados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <div className="glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Calcular Factura</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Abonado / Medidor
              </label>
              <select
                value={selectedMeterId}
                onChange={(e) => setSelectedMeterId(e.target.value)}
                className="select-modern"
              >
                <option value="">Seleccionar medidor...</option>
                {subscribers.map((sub) =>
                  sub.meters.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {sub.nis} - {sub.name} ({meter.number})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lectura Actual (m³)
              </label>
              <input
                type="number"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                className="input-modern"
                placeholder="Ej: 150"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Calcular Factura
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {result ? (
          <div className="glass rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Resultado</h2>
                <p className="text-sm text-gray-400">{result.subscriberName}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Consumption */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-300">Consumo</span>
                  </div>
                  <span className="text-xl font-bold text-white">{result.consumption} m³</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                {result.bill.breakdown.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]"
                  >
                    <span className="text-sm text-gray-400">
                      Bloque {block.block}: {block.m3} m³
                    </span>
                    <span className="text-sm font-medium text-gray-300">
                      {formatCurrency(block.cost)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cargo fijo</span>
                  <span className="text-gray-300">{formatCurrency(result.bill.baseCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cargo variable</span>
                  <span className="text-gray-300">{formatCurrency(result.bill.variableCharge)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/5">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-lg font-bold text-green-400">
                    {formatCurrency(result.bill.total)}
                  </span>
                </div>
              </div>

              {/* Generate Button */}
              <button className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                <FileText className="w-5 h-5" />
                Generar Factura
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 flex items-center justify-center animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-gray-400">Seleccione un medidor y ingrese la lectura para calcular</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
