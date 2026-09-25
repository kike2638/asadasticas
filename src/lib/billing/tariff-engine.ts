import { prisma } from '@/lib/prisma';
import { SubscriberCategory } from '@prisma/client';
import { calculateWaterBill, TariffCharges } from './calculator';

export async function getActiveTariff(tenantId: string, category: SubscriberCategory) {
  return await prisma.tariff.findFirst({
    where: {
      tenantId,
      category,
      isActive: true,
      validFrom: { lte: new Date() }
    },
    include: { blocks: true },
    orderBy: { validFrom: 'desc' }
  });
}

// Motor unificado: usa calculateWaterBill con baseCubicMeters dinámico y cargos ARESEP
export async function calculateBillForConsumption(
  tenantId: string,
  category: SubscriberCategory,
  consumption: number
) {
  const tariff = await getActiveTariff(tenantId, category);
  if (!tariff) throw new Error(`No hay tarifa activa para ${category}`);

  const blocks = tariff.blocks
    .sort((a, b) => a.min - b.min)
    .map((b) => ({ min: b.min, max: b.max, pricePerUnit: b.pricePerUnit.toNumber() }));

  // Cargos adicionales vienen del tenant (config ARESEP) - por ahora desde Tariff + defaults
  const charges: TariffCharges = {
    cargoFijoAcueducto: tariff.baseCharge.toNumber(),
    tprh: (tariff as any).tprh?.toNumber?.() ?? 0,
    hidrantes: (tariff as any).hidrantes?.toNumber?.() ?? 0,
  };

  return {
    tariff,
    result: calculateWaterBill(consumption, tariff.baseCharge.toNumber(), blocks, tariff.baseCubicMeters, charges, category),
  };
}
