import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { buildReminderQueue } from "@/lib/notifications/scheduler";

export async function GET() {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const queue = await buildReminderQueue(tenantId);
  const byTipo = queue.reduce((a, q) => { a[q.tipo] = (a[q.tipo] ?? 0) + 1; return a; }, {} as Record<string, number>);
  return NextResponse.json({ total: queue.length, byTipo, queue: queue.slice(0, 100) });
}
