// src/lib/offline/db.ts - Dexie offline-first para lecturas en campo
import Dexie, { Table } from "dexie";

export interface OfflineReading {
  id?: number;
  tenantId: string;
  meterId: string;
  meterNumber: string;
  subscriberName: string;
  nis: string;
  ruta: string;
  value: number;
  date: string; // ISO
  anomalia: string;
  observacion?: string;
  fotoBase64?: string;
  gpsLat?: number;
  gpsLng?: number;
  lectorId: string;
  synced: boolean;
  createdAt: string;
}

export interface OfflineSubscriber {
  nis: string;
  name: string;
  meterNumber: string;
  meterId: string;
  ruta: string;
  lastReading?: number;
}

class AquaDB extends Dexie {
  readings!: Table<OfflineReading, number>;
  subscribersCache!: Table<OfflineSubscriber, string>;

  constructor() {
    super("AquaLecturaDB");
    this.version(1).stores({
      readings: "++id, tenantId, meterId, synced, ruta",
      subscribersCache: "nis, ruta",
    });
  }
}

export const db = new Dexie("AquaLecturaDB") as AquaDB;

// Hook helpers (usar desde componentes)
export async function saveOfflineReading(r: Omit<OfflineReading, "id" | "synced" | "createdAt">) {
  return db.readings.add({ ...r, synced: false, createdAt: new Date().toISOString() } as OfflineReading);
}

export async function getPendingReadings(tenantId: string): Promise<OfflineReading[]> {
  return db.readings.where("[tenantId+synced]").equals([tenantId, 0] as any).toArray()
    .catch(() => db.readings.filter((x) => x.tenantId === tenantId && !x.synced).toArray());
}

export async function markSynced(ids: number[]) {
  await db.readings.bulkUpdate(ids.map((id) => ({ key: id, changes: { synced: true } })));
}

export async function syncWithServer(tenantId: string): Promise<{ synced: number; errors: string[] }> {
  const pending = await db.readings.filter((r) => r.tenantId === tenantId && !r.synced).toArray();
  if (pending.length === 0) return { synced: 0, errors: [] };
  if (!navigator.onLine) return { synced: 0, errors: ["Sin conexión - se reintentará automáticamente"] };

  try {
    const res = await fetch("/api/readings/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readings: pending.map((p) => ({
          meterId: p.meterId,
          value: p.value,
          date: p.date,
          anomalia: p.anomalia,
          observacion: p.observacion,
          gpsLat: p.gpsLat,
          gpsLng: p.gpsLng,
          fotoUrl: p.fotoBase64 ? "offline-foto" : undefined,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error sync");
    await markSynced(pending.map((p) => p.id!));
    return { synced: pending.length, errors: [] };
  } catch (e: any) {
    return { synced: 0, errors: [e.message] };
  }
}
