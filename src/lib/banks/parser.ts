// src/lib/banks/parser.ts - Parser universal para bancos CR
// Soporta: BNCR, BCR, BAC, Davivienda, Scotiabank, Coopealianza, CSV genérico
// BNCR típico: Fecha;Descripcion;Referencia;Debito;Credito;Saldo
// BAC: Fecha,Descripcion,Monto,Saldo
// BCR: Fecha,Concepto,Referencia,Monto

import Papa from "papaparse";

export interface RawTx {
  fecha: string; // ISO o original
  descripcion: string;
  referencia: string;
  monto: number; // positivo = ingreso, negativo = egreso
  debito?: number;
  credito?: number;
  saldo?: number;
  banco?: string;
  raw: Record<string, string>;
}

export interface ParseResult {
  banco: string;
  count: number;
  transactions: RawTx[];
  warnings: string[];
  headers: string[];
}

const HEADER_MAP: Record<string, string[]> = {
  fecha: ["fecha", "date", "fec", "dia"],
  descripcion: ["descripcion", "descripción", "detalle", "concepto", "memo", "observacion", "observación", "narracion", "narración", "movimiento"],
  referencia: ["referencia", "referenc", "comprobante", "numero", "número", "documento", "ndoc", "transaccion", "transacción", "ref"],
  debito: ["debito", "débito", "cargo", "egreso", "retiro", "débito"],
  credito: ["credito", "crédito", "abono", "ingreso", "deposito", "depósito"],
  monto: ["monto", "importe", "amount", "valor", "total"],
  saldo: ["saldo", "balance"],
};

function normHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\./g, "").replace(/\s+/g, " ").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function findCol(headers: string[], keys: string[]): string | null {
  const nHeaders = headers.map(normHeader);
  for (const k of keys) {
    const idx = nHeaders.findIndex(h => h.includes(normHeader(k)));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseMontoCR(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim().replace(/₡/g, "").replace(/\$/g, "").replace(/\s/g, "");
  // "1.234,56" -> 1234.56 | "12,850.00" -> 12850 | "12.850" -> 12850
  // Detecta formato: si contiene "," y "." -> asume "." miles "," decimal
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",") && !s.includes(".")) {
    // "12850,00" o "1,234" -> si termina con ,00 -> decimal
    if (/,\d{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseFechaCR(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const t = raw.trim();
  // 15/03/2026, 2026-03-15, 15-03-2026
  let d: Date | null = null;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(t)) {
    const [a, b, c] = t.split(/[\/\-]/); d = new Date(Number(c), Number(b) - 1, Number(a));
  } else if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    d = new Date(t.slice(0, 10));
  } else if (/^\d{2}-\d{2}-\d{4}/.test(t)) {
    const [a, b, c] = t.split("-"); d = new Date(Number(c), Number(b) - 1, Number(a));
  } else {
    const parsed = new Date(t); if (!isNaN(parsed.getTime())) d = parsed;
  }
  return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : t;
}

export function parseBankCSV(text: string): ParseResult {
  // Detecta delimitador: ; es común en CR (Excel)
  const semicolons = (text.match(/;/g) ?? []).length;
  const commas = (text.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  const parsed = Papa.parse(text, { header: true, delimiter, skipEmptyLines: true, transformHeader: h => h.trim() });
  const headers = (parsed.meta.fields ?? []).map(h => h.trim());
  const warnings: string[] = [];

  if (headers.length === 0) return { banco: "DESCONOCIDO", count: 0, transactions: [], warnings: ["CSV sin cabeceras"], headers };

  // Detecta banco por cabeceras
  const hNorm = headers.map(normHeader).join("|");
  let banco = "GENERICO";
  if (hNorm.includes("oficina") && hNorm.includes("debito")) banco = "BNCR";
  else if (hNorm.includes("bac")) banco = "BAC";
  else if (hNorm.includes("bcr") || hNorm.includes("banco de costa rica")) banco = "BCR";
  else if (hNorm.includes("davivienda")) banco = "DAVIVIENDA";
  else if (hNorm.includes("scotiabank")) banco = "SCOTIABANK";
  else if (semicolons > commas) banco = "BNCR";

  const colFecha = findCol(headers, HEADER_MAP.fecha);
  const colDesc = findCol(headers, HEADER_MAP.descripcion);
  const colRef = findCol(headers, HEADER_MAP.referencia);
  const colDeb = findCol(headers, HEADER_MAP.debito);
  const colCred = findCol(headers, HEADER_MAP.credito);
  const colMonto = findCol(headers, HEADER_MAP.monto);
  const colSaldo = findCol(headers, HEADER_MAP.saldo);

  if (!colDesc) warnings.push("No se encontró columna descripción — se usará la primera columna");
  if (!colFecha) warnings.push("No se encontró columna fecha");

  const txs: RawTx[] = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const rawDesc = colDesc ? row[colDesc] ?? "" : Object.values(row)[1] ?? "";
    const rawRef = colRef ? row[colRef] ?? "" : row["Referencia"] ?? row["Comprobante"] ?? "";
    const rawFecha = colFecha ? row[colFecha] ?? "" : Object.values(row)[0] ?? "";

    let monto = 0;
    if (colDeb && colCred) {
      const deb = parseMontoCR(row[colDeb] ?? "");
      const cred = parseMontoCR(row[colCred] ?? "");
      if (cred > 0) monto = cred;
      else if (deb > 0) monto = -deb;
    } else if (colMonto) {
      monto = parseMontoCR(row[colMonto] ?? "");
      // En algunos bancos egresos vienen con - o paréntesis
      if ((row[colMonto] ?? "").includes("(")) monto = -Math.abs(monto);
    } else if (colCred) {
      monto = parseMontoCR(row[colCred] ?? "");
    }

    if (!rawDesc && monto === 0) continue; // fila vacía / saldo inicial

    txs.push({
      fecha: parseFechaCR(String(rawFecha)),
      descripcion: String(rawDesc ?? "").trim(),
      referencia: String(rawRef ?? "").trim().replace(/\s/g, ""),
      monto,
      debito: colDeb ? parseMontoCR(row[colDeb] ?? "") : undefined,
      credito: colCred ? parseMontoCR(row[colCred] ?? "") : undefined,
      saldo: colSaldo ? parseMontoCR(row[colSaldo] ?? "") : undefined,
      banco,
      raw: row,
    });
  }

  // Solo ingresos (conciliación de cobros)
  // Pero guardamos todo para que usuario vea
  return { banco, count: txs.length, transactions: txs, warnings, headers };
}

// Para test rápido
export function detectBancoFromText(text: string): string {
  return parseBankCSV(text).banco;
}
