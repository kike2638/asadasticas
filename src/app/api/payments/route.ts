import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { registerPayment } from "@/app/actions/payment-service";
import { validateSinpeRef, validateSinpeAmount, getSinpeHelpText } from "@/lib/sinpe/validator";
import { sendWhatsApp, templatePagoRecibido } from "@/lib/notifications/whatsapp";
import { auditLog } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const userId = h.get("x-user-id");
  if (!tenantId || !userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { subscriberId, amount, method, reference, invoiceId } = body;

  if (!subscriberId || !amount || !method) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  // Validación SINPE estricta
  if (method === "SINPE_MOVIL") {
    const v = validateSinpeRef(reference ?? "");
    if (!v.valid) return NextResponse.json({ error: v.error, help: getSinpeHelpText() }, { status: 400 });
    body.reference = v.normalized;
  }
  const amtCheck = validateSinpeAmount(Number(amount));
  if (!amtCheck.valid) return NextResponse.json({ error: amtCheck.error }, { status: 400 });

  try {
    const result = await registerPayment({
      tenantId,
      subscriberId,
      invoiceId: invoiceId || undefined,
      amount: Number(amount),
      method,
      reference: body.reference ?? reference ?? `EF-${Date.now()}`,
      userId,
    });

    await auditLog(tenantId, userId, "REGISTER_PAYMENT", `payment:${result.payment.id}`, { amount, method, reference });

    // WhatsApp automático de confirmación (no bloquea)
    try {
      const sub = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
      if (sub?.telefono) {
        const saldo = (result as any).vueltoAFavor > 0 ? "¢0 (saldo a favor)" : "consulte estado cuenta";
        await sendWhatsApp(sub.telefono, templatePagoRecibido(sub.name, formatCurrency(Number(amount)), saldo));
      }
    } catch {}

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
