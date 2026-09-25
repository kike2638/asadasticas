import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, tenantId },
    include: { subscriber: true, invoice: true, tenant: true },
  });
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  // Retorna JSON para que el frontend genere PDF con @react-pdf/renderer
  // En prod: renderToStream(<ReceiptDoc data={...} />)
  return NextResponse.json({
    data: {
      asadaNombre: payment.tenant.name,
      cedulaJuridica: (payment.tenant as any).cedulaJuridica,
      consecutivo: payment.invoice?.consecutivo ?? payment.id.slice(0, 10),
      clave: payment.invoice?.clave ?? "",
      fecha: payment.paymentDate,
      abonado: payment.subscriber.name,
      nis: payment.subscriber.nis,
      periodo: (payment.invoice as any)?.periodoFacturacion ?? "—",
      consumo: (payment.invoice as any)?.detalleCalculo?.consumption ?? "—",
      prev: (payment.invoice as any)?.detalleCalculo?.prevValue ?? "—",
      curr: (payment.invoice as any)?.detalleCalculo?.currentReading ?? "—",
      medidor: "—",
      detalle: [
        { label: "Subtotal", value: `¢${payment.invoice?.subtotal ?? payment.amount}` },
        { label: "IVA", value: `¢${payment.invoice?.impuestoIVA ?? 0}` },
      ],
      subtotalExento: `¢${payment.invoice?.subtotalExento ?? 0}`,
      subtotalGravado: `¢${payment.invoice?.subtotalGravado ?? 0}`,
      iva: `¢${payment.invoice?.impuestoIVA ?? 0}`,
      total: `¢${payment.invoice?.total ?? payment.amount}`,
      metodoPago: payment.paymentMethod,
      referencia: payment.referenceNumber,
      saldoPendiente: `¢${payment.invoice?.saldoPendiente ?? 0}`,
      telefono: "8888-XXXX",
    },
  });
}
