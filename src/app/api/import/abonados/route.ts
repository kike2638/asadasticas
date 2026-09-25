import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], errors: ["CSV vacío"] };
  // Soporta comillas
  const split = (line: string) => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    out.push(cur.trim());
    return out.map(s => s.replace(/^"|"$/g, ""));
  };
  const headers = split(lines[0]).map(h => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = split(lines[i]);
    if (vals.length !== headers.length) errors.push(`Fila ${i + 1}: columnas no coinciden`);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => row[h] = (vals[idx] ?? "").trim());
    rows.push(row);
  }
  return { headers, rows, errors };
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant no autorizado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const previewOnly = formData.get("preview") === "true";
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    const text = await file.text();
    const { headers, rows, errors: parseErrors } = parseCSV(text);

    const required = ["nombre", "nis", "numero_medidor"];
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length) return NextResponse.json({ error: `Faltan columnas: ${missing.join(", ")}` }, { status: 400 });

    // Validación previa sin escribir
    const validated = rows.map((row, idx) => {
      const errs: string[] = [];
      if (!row.nombre) errs.push("nombre vacío");
      if (!row.nis) errs.push("nis vacío");
      if (!row.numero_medidor) errs.push("numero_medidor vacío");
      if (row.identificacion && !/^\d{9,12}$/.test(row.identificacion.replace(/\D/g, ""))) errs.push("identificación inválida");
      if (row.email && !row.email.includes("@")) errs.push("email inválido");
      const cat = (row.categoria ?? "DOMICILIAR").toUpperCase();
      if (!["DOMICILIAR","COMERCIAL","INDUSTRIAL","PUBLICO"].includes(cat)) errs.push(`categoría ${cat} inválida`);
      return { idx: idx + 2, row, errs };
    });

    if (previewOnly) {
      return NextResponse.json({
        preview: true,
        total: rows.length,
        validas: validated.filter(v => v.errs.length === 0).length,
        conErrores: validated.filter(v => v.errs.length > 0).length,
        detalles: validated.slice(0, 20),
        parseErrors,
      });
    }

    let success = 0;
    const errors: string[] = [...parseErrors];

    for (const v of validated) {
      if (v.errs.length) { errors.push(`Fila ${v.idx}: ${v.errs.join(", ")}`); continue; }
      const row = v.row;
      try {
        await prisma.subscriber.create({
          data: {
            tenantId,
            name: row.nombre,
            nis: row.nis,
            category: (row.categoria as any)?.toUpperCase() || "DOMICILIAR",
            tipoIdentificacion: row.tipo_identificacion || (row.identificacion?.length === 10 ? "02" : "01"),
            identificacion: row.identificacion || null,
            email: row.email || null,
            telefono: row.telefono || null,
            direccion: row.direccion || null,
            rutaLectura: row.ruta || row.ruta_lectura || null,
            meters: { create: { tenantId, number: row.numero_medidor } },
          },
        });
        success++;
      } catch (e: any) {
        if (e.code === "P2002") errors.push(`Fila ${v.idx}: NIS ${row.nis} duplicado`);
        else errors.push(`Fila ${v.idx}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, imported: success, errors, total: rows.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error procesando CSV" }, { status: 500 });
  }
}
