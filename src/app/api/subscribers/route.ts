import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { tenantId },
    include: { meters: true },
    orderBy: { nis: "asc" },
  });

  return NextResponse.json({ subscribers });
}
