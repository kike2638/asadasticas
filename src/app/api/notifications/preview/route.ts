import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { templateVencimiento, templateMorosidad } from "@/lib/notifications/whatsapp";

export async function GET(request: Request) {
  const h = await headers();
  if (!h.get("x-tenant-id")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "vencimiento";
  const sample = tipo === "morosidad"
    ? templateMorosidad("Juan Pérez", "¢45,500", 32)
    : templateVencimiento("Juan Pérez", "2026-03", "¢12,850", "15/04/2026", "001");
  return NextResponse.json({ tipo, mensaje: sample, long: sample.length, modo: !process.env.WHATSAPP_TOKEN ? "simulado" : "whatsapp" });
}
