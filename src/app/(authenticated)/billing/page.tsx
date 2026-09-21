"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-gray-500">Calcule y genere facturas para abonados</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-100 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Calcular Factura</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abonado / Medidor
            </label>
            <select
              value={selectedMeterId}
              onChange={(e) => setSelectedMeterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lectura Actual (m³)
            </label>
            <input
              type="number"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ej: 150"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Calculando..." : "Calcular Factura"}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">
            Resultado - {result.subscriberName}
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Consumo</span>
              <span className="font-medium">{result.consumption} m³</span>
            </div>

            {result.bill.breakdown.map((block, i) => (
              <div key={i} className="flex justify-between py-1 text-sm text-gray-500">
                <span>
                  Bloque {block.block}: {block.m3} m³
                </span>
                <span>{formatCurrency(block.cost)}</span>
              </div>
            ))}

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Cargo fijo</span>
              <span>{formatCurrency(result.bill.baseCharge)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Cargo variable</span>
              <span>{formatCurrency(result.bill.variableCharge)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(result.bill.total)}</span>
            </div>
          </div>

          <button className="w-full mt-4 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700">
            Generar Factura
          </button>
        </div>
      )}
    </div>
  );
}
