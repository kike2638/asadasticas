import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sendReminders } from "@/lib/notifications/scheduler";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { tipos, limit } = body as { tipos?: string[]; limit?: number };
  const result = await sendReminders(tenantId, tipos as any, Math.min(limit ?? 30, 100));
  return NextResponse.json({ success: true, ...result });
}
