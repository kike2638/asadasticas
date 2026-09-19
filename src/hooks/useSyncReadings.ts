import { useEffect } from 'react';
import { db } from '@/lib/db';

export function useSyncReadings() {
  useEffect(() => {
    const sync = async () => {
      // 1. Verificar si hay conexión
      if (!navigator.onLine) return;

      // 2. Obtener lecturas pendientes
      const pending = await db.readings.where('status').equals('pending').toArray();
      if (pending.length === 0) return;

      console.log(`Sincronizando ${pending.length} lecturas...`);

      try {
        const response = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readings: pending }),
        });

        if (response.ok) {
          // 3. Si fue exitoso, marcar como synced o borrar
          const ids = pending.map(p => p.id as number);
          await db.readings.bulkDelete(ids);
          console.log('Sincronización completada exitosamente');
        }
      } catch (error) {
        console.error('Error al sincronizar:', error);
      }
    };

    // Escuchar eventos de red
    window.addEventListener('online', sync);

    // Intentar sync cada vez que el usuario abre la app
    sync();

    return () => window.removeEventListener('online', sync);
  }, []);
}
