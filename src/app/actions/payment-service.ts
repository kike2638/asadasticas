import { prisma } from '@/lib/prisma';

// Pago FIFO: aplica a facturas más antiguas primero, soporta abonos parciales
export async function registerPayment({
  tenantId,
  subscriberId,
  invoiceId,
  amount,
  method,
  reference,
  userId,
  cashClosingId,
}: {
  tenantId: string;
  subscriberId: string;
  invoiceId?: string;
  amount: number;
  method: string;
  reference: string;
  userId: string;
  cashClosingId?: string;
}) {
  if (!reference || reference.trim().length < 3) throw new Error("Referencia requerida (SINPE/comprobante)");
  const existing = await prisma.payment.findFirst({ where: { tenantId, referenceNumber: reference } });
  if (existing) throw new Error("Referencia duplicada - ya registrada");

  return await prisma.$transaction(async (tx: any) => {
    let remaining = amount;
    const applied: { invoiceId: string; applied: number }[] = [];

    if (invoiceId) {
      // Pago directo a factura específica
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv) throw new Error("Factura no encontrada");
      const saldo = inv.saldoPendiente?.toNumber?.() ?? inv.total.toNumber();
      const toApply = Math.min(remaining, saldo);
      applied.push({ invoiceId, applied: toApply });
      const nuevoSaldo = saldo - toApply;
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { saldoPendiente: nuevoSaldo, status: nuevoSaldo <= 0.01 ? "PAID" : "PARTIAL" },
      });
      remaining -= toApply;
    } else {
      // FIFO automático: facturas PENDING/PARTIAL más antiguas primero
      const pendientes = await tx.invoice.findMany({
        where: { tenantId, subscriberId, status: { in: ["PENDING", "PARTIAL"] } },
        orderBy: { fechaEmision: "asc" },
      });
      for (const inv of pendientes) {
        if (remaining <= 0) break;
        const saldo = (inv.saldoPendiente as any)?.toNumber?.() ?? inv.total.toNumber();
        if (saldo <= 0) continue;
        const toApply = Math.min(remaining, saldo);
        applied.push({ invoiceId: inv.id, applied: toApply });
        await tx.invoice.update({
          where: { id: inv.id },
          data: { saldoPendiente: saldo - toApply, status: saldo - toApply <= 0.01 ? "PAID" : "PARTIAL" },
        });
        remaining -= toApply;
      }
    }

    // Si sobra (pago mayor a deuda) -> saldo a favor
    if (remaining > 0.01) {
      await tx.subscriber.update({ where: { id: subscriberId }, data: { saldoFavor: { increment: remaining } } });
    }

    const payment = await tx.payment.create({
      data: {
        tenantId, subscriberId,
        invoiceId: applied[0]?.invoiceId ?? invoiceId ?? null,
        amount,
        paymentMethod: method as any,
        referenceNumber: reference,
        registeredById: userId,
        cashClosingId: cashClosingId ?? null,
      },
    } as any);

    // Actualizar morosidad: si no quedan pendientes, vuelve a ACTIVO
    const stillPending = await tx.invoice.count({ where: { tenantId, subscriberId, status: { in: ["PENDING", "PARTIAL"] } } });
    if (stillPending === 0) {
      await tx.subscriber.update({ where: { id: subscriberId }, data: { status: "ACTIVO" } });
    }

    return { payment, applied, vueltoAFavor: remaining };
  });
}

export async function getEstadoCuenta(tenantId: string, subscriberId: string) {
  const [invoices, payments, subscriber] = await Promise.all([
    prisma.invoice.findMany({ where: { tenantId, subscriberId }, orderBy: { fechaEmision: "desc" } }),
    prisma.payment.findMany({ where: { tenantId, subscriberId }, orderBy: { paymentDate: "desc" }, take: 20 }),
    prisma.subscriber.findUnique({ where: { id: subscriberId } }),
  ]);
  const deuda = invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").reduce((s, i) => s + (i.saldoPendiente?.toNumber?.() ?? i.total.toNumber()), 0);
  return { subscriber, deuda, invoices, payments, saldoFavor: subscriber?.saldoFavor?.toNumber?.() ?? 0 };
}
