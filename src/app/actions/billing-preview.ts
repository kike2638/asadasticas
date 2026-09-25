import { prisma } from "@/lib/prisma";
import { calculateWaterBill } from "@/lib/billing/calculator";

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

  const blocks = tariff.blocks
    .sort((a, b) => a.min - b.min)
    .map((b) => ({ min: b.min, max: b.max, pricePerUnit: b.pricePerUnit.toNumber() }));

  const bill = calculateWaterBill(
    consumption,
    tariff.baseCharge.toNumber(),
    blocks,
    tariff.baseCubicMeters,
    {
      cargoFijoAcueducto: tariff.baseCharge.toNumber(),
      tprh: (tariff as any).tprh?.toNumber?.() ?? 0,
      hidrantes: (tariff as any).hidrantes?.toNumber?.() ?? 0,
    },
    meter.subscriber.category
  );

  return {
    consumption,
    bill,
    subscriberName: meter.subscriber.name,
    subscriberCategory: meter.subscriber.category,
    tariffName: tariff.name,
  };
}
