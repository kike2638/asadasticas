import { prisma } from "@/lib/prisma";
import { calculateWaterBill } from "@/lib/billing/calculator";
import { generarClave50, generarConsecutivo20 } from "@/lib/fiscal/clave";
import { detectAnomalia } from "@/lib/billing/calculator";

export async function createInvoice({
  tenantId,
  subscriberId,
  meterId,
  currentReading,
  tipoComprobante = "TIQUETE_ELECTRONICO" as const,
  lectorId,
  anomalia,
  observacion,
  gpsLat,
  gpsLng,
}: {
  tenantId: string;
  subscriberId: string;
  meterId: string;
  currentReading: number;
  tipoComprobante?: "FACTURA_ELECTRONICA" | "TIQUETE_ELECTRONICO";
  lectorId?: string;
  anomalia?: string;
  observacion?: string;
  gpsLat?: number;
  gpsLng?: number;
}) {
  const meter = await prisma.meter.findUnique({ where: { id: meterId }, include: { subscriber: true } });
  if (!meter) throw new Error("Medidor no encontrado");

  const lastReading = await prisma.reading.findFirst({ where: { meterId }, orderBy: { date: "desc" } });
  const prevValue = lastReading?.value.toNumber() ?? 0;
  const consumption = currentReading - prevValue;

  if (consumption < 0) throw new Error(`Lectura ${currentReading} menor que anterior ${prevValue} - verifique medidor`);

  const anomaliaDetectada = anomalia ?? detectAnomalia(consumption);
  if (anomaliaDetectada === "CONSUMO_EXCESIVO") {
    // No bloquea pero deja flag para revisión fontanero
    console.warn(`[ASADA] Consumo excesivo ${consumption}m3 para ${meter.subscriber.name}`);
  }

  const tariff = await prisma.tariff.findFirst({
    where: { tenantId, category: meter.subscriber.category, isActive: true, validFrom: { lte: new Date() } },
    include: { blocks: true },
    orderBy: { validFrom: "desc" },
  });
  if (!tariff) throw new Error(`No hay tarifa activa para ${meter.subscriber.category}`);

  const blocks = tariff.blocks.sort((a, b) => a.min - b.min).map((b) => ({ min: b.min, max: b.max, pricePerUnit: b.pricePerUnit.toNumber() }));

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

  // Transacción atómica: lock consecutivo + crear factura + lectura
  const invoice = await prisma.$transaction(async (tx) => {
    const config = await tx.tenantConfig.findUnique({ where: { tenantId } });
    if (!config) throw new Error("Configuración Hacienda no encontrada - complete onboarding");

    const isTE = tipoComprobante === "TIQUETE_ELECTRONICO";
    const tipoCodigo = isTE ? "04" : "01";
    const campoConsec = isTE ? "consecutivoTE" : "consecutivoFE";
    const numeroActual = (config as any)[campoConsec] as number;

    const consecutivo20 = generarConsecutivo20(config.sucursal, config.terminal, tipoCodigo, numeroActual);
    const consecutivo10 = String(numeroActual).padStart(10, "0");

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    const cedula = (tenant?.cedulaJuridica ?? "000000000000").replace(/\D/g, "").padStart(12, "0");

    const clave = generarClave50({
      cedulaJuridica: cedula,
      consecutivo20,
      situacion: "1",
      fecha: new Date(),
    });

    const periodo = new Date().toISOString().slice(0, 7);
    const vence = new Date();
    vence.setDate(vence.getDate() + 15); // ASADAS: vencimiento 15 días, no 30

    const inv = await tx.invoice.create({
      data: {
        tenantId,
        subscriberId,
        tipoComprobante: tipoComprobante as any,
        consecutivo: consecutivo20,
        clave,
        estadoHacienda: "PENDIENTE",
        status: "PENDING",
        subtotal: bill.subtotalGravado + bill.subtotalExento,
        subtotalExento: bill.subtotalExento,
        subtotalGravado: bill.subtotalGravado,
        impuestoIVA: bill.iva,
        total: bill.total,
        saldoPendiente: bill.total,
        periodoFacturacion: periodo,
        fechaVencimiento: vence,
        detalleCalculo: {
          consumption,
          prevValue,
          currentReading,
          baseCubicMeters: tariff.baseCubicMeters,
          baseCharge: bill.baseCharge,
          variableCharge: bill.variableCharge,
          tprh: bill.tprh,
          hidrantes: bill.hidrantes,
          breakdown: bill.breakdown,
          tariffName: tariff.name,
          anomalia: anomaliaDetectada,
        } as any,
      },
    });

    await tx.tenantConfig.update({
      where: { tenantId },
      data: { [campoConsec]: { increment: 1 } } as any,
    });

    await tx.reading.create({
      data: {
        tenantId,
        meterId,
        value: currentReading,
        anomalia: (anomaliaDetectada as any) ?? "NONE",
        observacion: observacion ?? null,
        gpsLat: gpsLat ?? null,
        gpsLng: gpsLng ?? null,
        lectorId: lectorId ?? null,
        consumoCalculado: consumption,
      } as any,
    });

    return inv;
  });

  return invoice;
}

// Facturación masiva por ciclo/ruta - la killer feature ASADA
export async function createBulkInvoices(tenantId: string, periodo: string, ruta?: string) {
  const meters = await prisma.meter.findMany({
    where: { tenantId, ...(ruta ? { subscriber: { rutaLectura: ruta } } : {}) },
    include: { subscriber: true },
  });

  // Filtra solo los que tienen lectura pendiente del periodo
  const pendientes = [];
  for (const m of meters) {
    const hasInvoice = await prisma.invoice.findFirst({
      where: { tenantId, subscriberId: m.subscriberId, periodoFacturacion: periodo },
    });
    if (!hasInvoice) pendientes.push(m);
  }
  return pendientes;
}
