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
  if (meter.tenantId !== tenantId) throw new Error("Medidor no pertenece a esta ASADA");
  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (!subscriber || subscriber.tenantId !== tenantId) throw new Error("Abonado no pertenece a esta ASADA");
  if (meter.subscriberId !== subscriberId) throw new Error("Medidor no corresponde al abonado");

  const lastReading = await prisma.reading.findFirst({ where: { meterId }, orderBy: { date: "desc" } });
  const prevValue = lastReading?.value.toNumber() ?? 0;
  const consumption = currentReading - prevValue;
  if (consumption < 0) throw new Error(`Lectura ${currentReading} menor que anterior ${prevValue} - verifique medidor`);
  if (!lastReading && currentReading > 800) throw new Error(`Primera lectura ${currentReading} m³ inválida - verifique medidor nuevo`);
  if (consumption > 100) throw new Error(`Consumo ${consumption} m³ atípico - requiere confirmación supervisor`);

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

  // Validar periodo duplicado
  const periodoCheck = new Date().toISOString().slice(0, 7);
  const dup = await prisma.invoice.findFirst({ where: { tenantId, subscriberId, periodoFacturacion: periodoCheck } });
  if (dup) throw new Error(`Ya existe factura para periodo ${periodoCheck} (consecutivo ${dup.consecutivo})`);

  // Transacción atómica: lock consecutivo + crear factura + lectura
  const invoice = await prisma.$transaction(async (tx) => {
    // Lock pesimista para evitar consecutivo duplicado en bulk concurrente
    await tx.$executeRaw`SELECT * FROM "TenantConfig" WHERE "tenantId" = ${tenantId} FOR UPDATE`;
    const config = await tx.tenantConfig.findUnique({ where: { tenantId } });
    if (!config) throw new Error("Configuración Hacienda no encontrada - complete onboarding");
    if (!config.sinpeNumero) throw new Error("Configure SINPE de la ASADA antes de facturar");

    const isTE = tipoComprobante === "TIQUETE_ELECTRONICO";
    const tipoCodigo = isTE ? "04" : "01";
    const campoConsec = isTE ? "consecutivoTE" : "consecutivoFE";
    const numeroActual = (config as any)[campoConsec] as number;

    const consecutivo20 = generarConsecutivo20(config.sucursal, config.terminal, tipoCodigo, numeroActual);

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    let cedula = (tenant?.cedulaJuridica ?? "").replace(/\D/g, "").padStart(12, "0");
    if (!tenant?.cedulaJuridica || cedula === "000000000000") throw new Error("Cédula jurídica ASADA no configurada - complete en Configuración");
    if (cedula.length !== 12) throw new Error(`Cédula ${cedula} inválida para Hacienda (debe ser 12 dígitos)`);

    const clave = generarClave50({
      cedulaJuridica: cedula,
      consecutivo20,
      situacion: "1",
      fecha: new Date(),
    });

    const periodo = new Date().toISOString().slice(0, 7);
    const vence = new Date();
    vence.setDate(vence.getDate() + 15);
    // Redondeo final centavos
    const totalRedondeado = Math.round(bill.total * 100) / 100;
    const ivaRedondeado = Math.round(bill.iva * 100) / 100;

    const inv = await tx.invoice.create({
      data: {
        tenantId,
        subscriberId,
        tipoComprobante: tipoComprobante as any,
        consecutivo: consecutivo20,
        clave,
        estadoHacienda: "PENDIENTE",
        status: "PENDING",
        subtotal: Math.round((bill.subtotalGravado + bill.subtotalExento) * 100) / 100,
        subtotalExento: Math.round(bill.subtotalExento * 100) / 100,
        subtotalGravado: Math.round(bill.subtotalGravado * 100) / 100,
        impuestoIVA: ivaRedondeado,
        total: totalRedondeado,
        saldoPendiente: totalRedondeado,
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
