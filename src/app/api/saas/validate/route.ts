import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const h = await headers();
  if (h.get("x-user-role") !== "PLATFORM_OWNER") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  const { id, status, referenciaPago } = await request.json();
  if (!id || !status) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  if (!["PAID", "OVERDUE", "PENDING"].includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const updated = await prisma.saaSSubscription.update({
    where: { id },
    data: { status, referenciaPago: referenciaPago ?? null, fechaPago: status === "PAID" ? new Date() : null },
  });

  // Activa tenant si pagó
  if (status === "PAID") {
    await prisma.tenant.update({ where: { id: updated.tenantId }, data: { subscriptionStatus: "ACTIVE", status: "ACTIVE" } });
  } else if (status === "OVERDUE") {
    await prisma.tenant.update({ where: { id: updated.tenantId }, data: { subscriptionStatus: "PAST_DUE", status: "SUSPENDED" } });
  }

  return NextResponse.json({ success: true, subscription: updated });
}
