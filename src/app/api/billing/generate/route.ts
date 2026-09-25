import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createInvoice } from "@/app/actions/invoice-service";

export async function POST(request: Request) {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const { meterId, subscriberId, currentReading, observacion, gpsLat, gpsLng } = body;
  if (!meterId || !subscriberId || currentReading === undefined) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const curr = Number(currentReading);
  if (isNaN(curr) || curr < 0) return NextResponse.json({ error: "Lectura inválida" }, { status: 400 });
  try {
    const invoice = await createInvoice({ tenantId, subscriberId, meterId, currentReading: curr, observacion, gpsLat, gpsLng });
    return NextResponse.json({ success: true, invoice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
