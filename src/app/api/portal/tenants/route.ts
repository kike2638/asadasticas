import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE", slug: { not: "plataforma-admin" } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({ tenants });
}
