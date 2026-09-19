import Dexie, { Table } from 'dexie';

export interface ReadingEntry {
  id?: number;
  meterId: string;
  subscriberName: string;
  lastReading: number;
  currentReading?: number;
  photoData?: string; // Base64
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: 'pending' | 'synced';
  timestamp: number;
}

export class AsadaDatabase extends Dexie {
  readings!: Table<ReadingEntry>;

  constructor() {
    super('AsadaOfflineDB');
    this.version(1).stores({
      readings: '++id, meterId, status'
    });
  }
}

export const db = new AsadaDatabase();
