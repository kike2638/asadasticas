import { prisma } from "@/lib/prisma";

export async function createInvoice({
  tenantId,
  subscriberId,
  meterId,
  currentReading,
}: {
  tenantId: string;
  subscriberId: string;
  meterId: string;
  currentReading: number;
}) {
  // Get last reading
  const lastReading = await prisma.reading.findFirst({
    where: { meterId },
    orderBy: { date: "desc" },
  });

  const consumption = currentReading - (lastReading?.value.toNumber() || 0);

  // Get active tariff
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
  });

  const tariff = await prisma.tariff.findFirst({
    where: {
      tenantId,
      category: subscriber?.category || "DOMICILIAR",
      isActive: true,
    },
    include: { blocks: true },
    orderBy: { validFrom: "desc" },
  });

  if (!tariff) throw new Error("No hay tarifa activa");

  // Calculate amounts
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

  const subtotal = baseCharge + variableCharge;
  const iva = subtotal * 0.13;
  const total = subtotal + iva;

  // Get next consecutive
  const config = await prisma.tenantConfig.findUnique({
    where: { tenantId },
  });

  if (!config) throw new Error("Configuración del tenant no encontrada");

  const consecutivo = String(config.consecutive).padStart(10, "0");
  const clave = `50601000000000000${consecutivo}`;

  // Create invoice in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId,
        subscriberId,
        consecutivo,
        clave,
        estadoHacienda: "PENDIENTE",
        status: "PENDING",
        subtotal,
        impuestoIVA: iva,
        total,
        periodoFacturacion: new Date().toISOString().slice(0, 7),
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        detalleCalculo: {
          consumption,
          baseCharge,
          variableCharge,
          breakdown,
          tariffName: tariff.name,
        },
      },
    });

    // Increment consecutive
    await tx.tenantConfig.update({
      where: { tenantId },
      data: { consecutive: { increment: 1 } },
    });

    // Save reading
    await tx.reading.create({
      data: {
        tenantId,
        meterId,
        value: currentReading,
        date: new Date(),
      },
    });

    return inv;
  });

  return invoice;
}
