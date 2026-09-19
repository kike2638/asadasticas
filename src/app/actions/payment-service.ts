import { prisma } from '@/lib/prisma';

/**
 * Función para registrar un pago y validar contra la referencia bancaria.
 * Permite evitar pagos duplicados con la misma referencia.
 */
export async function registerPayment({
  tenantId,
  subscriberId,
  invoiceId,
  amount,
  method,
  reference,
  userId
}: {
  tenantId: string;
  subscriberId: string;
  invoiceId?: string;
  amount: number;
  method: string;
  reference: string;
  userId: string;
}) {
  // 1. Prevenir duplicidad de referencia (evitar doble registro de SINPE)
  const existing = await prisma.payment.findFirst({
    where: { tenantId, referenceNumber: reference }
  });

  if (existing) throw new Error("Esta referencia de pago ya ha sido registrada.");

  // 2. Registrar pago e incrementar caja del usuario
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        tenantId,
        subscriberId,
        invoiceId,
        amount,
        paymentMethod: method,
        referenceNumber: reference,
        registeredById: userId
      }
    });

    if (invoiceId) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' }
      });
    }

    return payment;
  });
}
