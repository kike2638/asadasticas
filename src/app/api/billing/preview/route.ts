import { NextResponse } from "next/server";
import { previewInvoice } from "@/app/actions/billing-preview";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { meterId, currentReading } = await request.json();

    if (!meterId || currentReading === undefined) {
      return NextResponse.json(
        { error: "meterId y currentReading son requeridos" },
        { status: 400 }
      );
    }

    const result = await previewInvoice(meterId, currentReading, tenantId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
