import { prisma } from "@/lib/prisma";

export async function previewInvoice(meterId: string, currentReading: number) {
  const meter = await prisma.meter.findUnique({
    where: { id: meterId },
    include: { subscriber: true },
  });

  if (!meter) throw new Error("Medidor no encontrado");

  const lastReading = await prisma.reading.findFirst({
    where: { meterId },
    orderBy: { date: "desc" },
  });

  const consumption =
    currentReading - (lastReading?.value.toNumber() || 0);

  if (consumption < 0) {
    throw new Error(
      "La lectura actual es menor a la última lectura registrada"
    );
  }

  const tariff = await prisma.tariff.findFirst({
    where: {
      tenantId: meter.tenantId,
      category: meter.subscriber.category,
      isActive: true,
      validFrom: { lte: new Date() },
    },
    include: { blocks: true },
    orderBy: { validFrom: "desc" },
  });

  if (!tariff) throw new Error("No hay tarifa activa configurada");

  // Calculate bill
  const baseCharge = tariff.baseCharge.toNumber();
  const blocks = tariff.blocks
    .sort((a, b) => a.min - b.min)
    .map((b) => ({
      min: b.min,
      max: b.max,
      pricePerUnit: b.pricePerUnit.toNumber(),
    }));

  let remaining = Math.max(0, consumption - tariff.baseCubicMeters);
  let variableCharge = 0;
  const breakdown: { block: string; m3: number; cost: number }[] = [];

  for (const block of blocks) {
    if (remaining <= 0) break;
    const blockRange = block.max - block.min + 1;
    const m3InBlock = Math.min(remaining, blockRange);
    const cost = m3InBlock * block.pricePerUnit;
    variableCharge += cost;
    breakdown.push({
      block: `${block.min}-${block.max}`,
      m3: m3InBlock,
      cost,
    });
    remaining -= m3InBlock;
  }

  const total = baseCharge + variableCharge;

  return {
    consumption,
    bill: {
      baseCharge,
      variableCharge,
      additionalCharges: 0,
      total,
      breakdown,
    },
    subscriberName: meter.subscriber.name,
  };
}
