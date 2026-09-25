import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const role = h.get("x-user-role");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (role !== "ADMIN" && role !== "PLATFORM_OWNER") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  const { telefono, email, direccion } = await request.json();
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { telefono: telefono ?? null, email: email ?? null, direccion: direccion ?? null } as any });
  return NextResponse.json({ success: true, tenant });
}
