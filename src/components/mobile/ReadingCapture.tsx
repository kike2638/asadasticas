import { useState } from 'react';
import { db, ReadingEntry } from '@/lib/db';

export function ReadingCapture({ entry }: { entry: ReadingEntry }) {
  const [currentReading, setCurrentReading] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const handleSave = async () => {
    const val = parseFloat(currentReading);

    // Validación 1: Medidor invertido
    if (val < entry.lastReading) {
      setWarning("Alerta: Lectura menor a la anterior. ¿Medidor cambiado?");
      return;
    }

    // Validación 2: Fuga (consumo > 200% histórico)
    const consumption = val - entry.lastReading;
    if (consumption > (entry.lastReading * 2)) {
      setWarning("Alerta: Consumo inusualmente alto. Verifique fugas y tome foto.");
    }

    await db.readings.add({
      ...entry,
      currentReading: val,
      status: 'pending',
      timestamp: Date.now()
    });

    alert("Lectura guardada localmente");
  };

  return (
    <div className="p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">{entry.subscriberName}</h2>
      <p>Última lectura: {entry.lastReading} m³</p>

      <input
        type="number"
        value={currentReading}
        onChange={(e) => setCurrentReading(e.target.value)}
        className="w-full p-3 border rounded text-lg"
        placeholder="Lectura actual (m³)"
      />

      {warning && <p className="text-red-600 font-bold">{warning}</p>}

      <button onClick={handleSave} className="w-full bg-blue-600 text-white p-4 rounded text-lg">
        Guardar Lectura
      </button>
    </div>
  );
}
