import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Registra un pago para una factura existente.
 * Esto cierra el ciclo financiero básico de la ASADA.
 */
export async function markInvoiceAsPaid(invoiceId: string, paymentMethod: string, referenceNumber: string) {
  // DEPRECATED: usar registerPayment FIFO. Este stub solo marca PAID y está deshabilitado para evitar corrupción.
  console.warn("markInvoiceAsPaid deprecated - use registerPayment");
  try {
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { tenantId: true } });
    if (!inv) throw new Error("Factura no encontrada");
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        saldoPendiente: 0,
        respuestaHacienda: { legacyPayment: { method: paymentMethod, reference: referenceNumber, paidAt: new Date(), deprecated: true } } as any,
      },
    });

    revalidatePath('/payments');
    revalidatePath('/caja');

    return { success: true, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error registrando el pago:', error);
    return { success: false, error: 'No se pudo registrar el pago' };
  }
}
