import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE", slug: { not: "plataforma-admin" } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({ tenants });
  } catch {
    return NextResponse.json({ tenants: [] });
  }
}
