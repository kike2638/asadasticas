import { prisma } from '@/lib/prisma';
import { calculateWaterBill } from '@/lib/billing/calculator';
import { getActiveTariff } from '@/lib/billing/tariff-engine';

export async function previewInvoice(meterId: string, currentReading: number) {
  // 1. Obtener datos necesarios
  const meter = await prisma.meter.findUnique({
    where: { id: meterId },
    include: { subscriber: true }
  });

  if (!meter) throw new Error("Medidor no encontrado");

  // 2. Obtener lectura anterior
  const lastReading = await prisma.reading.findFirst({
    where: { meterId },
    orderBy: { date: 'desc' }
  });

  const consumption = currentReading - (lastReading?.value.toNumber() || 0);

  // 3. Obtener tarifa activa para este abonado
  const tariff = await getActiveTariff(meter.tenantId, meter.subscriber.category || 'DOMICILIAR');
  if (!tariff) throw new Error("No hay tarifa activa configurada");

  // 4. Calcular recibo (usando el motor definido previamente)
  const bill = calculateWaterBill(
    consumption,
    tariff.baseCharge.toNumber(),
    tariff.blocks.map(b => ({
      min: b.min,
      max: b.max,
      pricePerUnit: b.pricePerUnit.toNumber()
    }))
  );

  return {
    consumption,
    bill,
    subscriberName: meter.subscriber.name
  };
}
