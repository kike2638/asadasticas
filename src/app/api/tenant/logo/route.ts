import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const role = h.get("x-user-role");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (role !== "ADMIN" && role !== "PLATFORM_OWNER") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const url = form.get("url") as string | null;

  let logoUrl: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Logo máx 2MB" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Solo imágenes" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    logoUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  } else if (url) {
    if (!url.startsWith("http") && !url.startsWith("data:")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    logoUrl = url;
  } else {
    return NextResponse.json({ error: "Archivo o URL requerido" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });
  return NextResponse.json({ success: true, logoUrl: tenant.logoUrl });
}

export async function DELETE() {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: null } });
  return NextResponse.json({ success: true });
}
