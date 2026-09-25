import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { registerPayment } from "@/app/actions/payment-service";
import { validateSinpeRef } from "@/lib/sinpe/validator";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  if (!tenantId || !userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { selections } = await request.json() as {
    selections: { txRef: string; txMonto: number; txFecha: string; invoiceId?: string; subscriptionId?: string; subscriberId?: string }[]
  };
  if (!Array.isArray(selections) || selections.length === 0) return NextResponse.json({ error: "Sin selecciones" }, { status: 400 });

  const results: any[] = [];
  const errors: any[] = [];

  for (const sel of selections) {
    try {
      // SaaS subscription (superadmin)
      if (sel.subscriptionId && role === "PLATFORM_OWNER") {
        const sub = await prisma.saaSSubscription.findUnique({ where: { id: sel.subscriptionId } });
        if (!sub) throw new Error("Suscripción no encontrada");
        // Valida referencia SINPE
        if (sel.txRef) {
          const v = validateSinpeRef(sel.txRef);
          if (!v.valid) throw new Error(v.error);
        }
        await prisma.saaSSubscription.update({
          where: { id: sel.subscriptionId },
          data: { status: "PAID", referenciaPago: sel.txRef, fechaPago: new Date(sel.txFecha ?? new Date()) },
        });
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { subscriptionStatus: "ACTIVE" } });
        results.push({ subscriptionId: sel.subscriptionId, ok: true });
        continue;
      }

      // Pago abonado
      if (!sel.invoiceId || !sel.subscriberId) throw new Error("Falta invoice/subscriber");
      const v = sel.txRef ? validateSinpeRef(sel.txRef) : { valid: true, normalized: sel.txRef };
      if (!v.valid) throw new Error((v as any).error);

      await registerPayment({
        tenantId,
        subscriberId: sel.subscriberId,
        invoiceId: sel.invoiceId,
        amount: Number(sel.txMonto),
        method: "SINPE_MOVIL",
        reference: (v as any).normalized ?? sel.txRef ?? `BANCO-${Date.now()}`,
        userId,
      });
      results.push({ invoiceId: sel.invoiceId, ok: true });
    } catch (e: any) {
      errors.push({ selection: sel, error: e.message });
    }
  }

  return NextResponse.json({ success: true, conciliados: results.length, errores: errors, results });
}
