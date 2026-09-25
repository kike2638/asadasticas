import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createInvoice } from "@/app/actions/invoice-service";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { meterId, subscriberId, currentReading } = await request.json();
  if (!meterId || !subscriberId || currentReading === undefined) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  try {
    const invoice = await createInvoice({ tenantId, subscriberId, meterId, currentReading: Number(currentReading) });
    return NextResponse.json({ success: true, invoice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
