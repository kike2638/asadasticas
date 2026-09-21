import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/config";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenantId = (session.user as any).tenantId;

  const subscribers = await prisma.subscriber.findMany({
    where: { tenantId },
    include: { meters: true },
    orderBy: { nis: "asc" },
  });

  return NextResponse.json({ subscribers });
}
