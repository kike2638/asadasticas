import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Registra un pago para una factura existente.
 * Esto cierra el ciclo financiero básico de la ASADA.
 */
export async function markInvoiceAsPaid(invoiceId: string, paymentMethod: string, referenceNumber: string) {
  try {
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID', // Asegúrate de añadir status a tu modelo Invoice
        paymentDetails: JSON.stringify({
          method: paymentMethod,
          reference: referenceNumber,
          paidAt: new Date(),
        }),
      },
    });

    // Refrescamos la vista administrativa para que el pago aparezca inmediatamente
    revalidatePath('/[tenant]/dashboard/facturacion');

    return { success: true, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error registrando el pago:', error);
    return { success: false, error: 'No se pudo registrar el pago' };
  }
}
