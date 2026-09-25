// src/lib/banks/matcher.ts - Matching heurístico SINPE → factura/abonado/suscripción
import { RawTx } from "./parser";

export interface PendingInvoice {
  id: string;
  subscriberId: string;
  nis: string;
  subscriberName: string;
  total: number;
  saldo: number;
  periodo: string;
  vencimiento: string;
}

export interface PendingSub {
  id: string;
  tenantSlug: string;
  tenantName: string;
  periodo: string;
  monto: number;
}

export interface Match {
  txIndex: number;
  tx: RawTx;
  score: number; // 0-100
  reason: string[];
  invoice?: PendingInvoice;
  subscription?: PendingSub;
  suggestedAction: "AUTO_MATCH" | "REVIEW" | "IGNORE";
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

function containsNIS(text: string, nis: string): boolean {
  if (!nis) return false;
  const t = normalize(text);
  // NIS exacto o con padding
  return t.includes(normalize(nis)) || t.includes(nis.replace(/^0+/, ""));
}

function containsName(text: string, name: string): boolean {
  const t = normalize(text);
  const parts = normalize(name).split(" ").filter(p => p.length >= 3);
  // al menos 2 partes del nombre
  let hits = 0;
  for (const p of parts) if (t.includes(p)) hits++;
  return hits >= 2 || (parts.length === 1 && hits === 1 && t.includes(parts[0]));
}

function amountMatch(a: number, b: number): boolean {
  return Math.abs(Math.abs(a) - Math.abs(b)) < 0.5; // colones exactos
}

export function matchTransactions(
  txs: RawTx[],
  invoices: PendingInvoice[],
  subs?: PendingSub[]
): Match[] {
  const results: Match[] = [];

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const absMonto = Math.abs(tx.monto);
    if (absMonto < 1) { results.push({ txIndex: i, tx, score: 0, reason: ["Monto insignificante"], suggestedAction: "IGNORE" }); continue; }
    if (tx.monto < 0) { results.push({ txIndex: i, tx, score: 0, reason: ["Egreso — no es cobro"], suggestedAction: "IGNORE" }); continue; }

    const textBlob = `${tx.descripcion} ${tx.referencia}`;
    let best: Match | null = null;

    // 1) Intento match suscripción SaaS (para superadmin 87607243)
    if (subs) {
      for (const sub of subs) {
        if (!amountMatch(absMonto, sub.monto)) continue;
        if (containsNIS(textBlob, sub.tenantSlug) || normalize(textBlob).includes(normalize(sub.tenantSlug))) {
          best = { txIndex: i, tx, score: 95, reason: [`Ref contiene slug ${sub.tenantSlug}`, `Monto exacto ${sub.monto}`], subscription: sub, suggestedAction: "AUTO_MATCH" };
          break;
        }
        // Si monto coincide exacto con alguna suscripción, sugiere revisión
        if (amountMatch(absMonto, sub.monto)) {
          best = { txIndex: i, tx, score: 40, reason: [`Monto coincide con suscripción ${sub.tenantName} (${sub.monto})`], subscription: sub, suggestedAction: "REVIEW" };
        }
      }
      if (best?.suggestedAction === "AUTO_MATCH") { results.push(best); continue; }
    }

    // 2) Match facturas por NIS / nombre / monto
    for (const inv of invoices) {
      let score = 0;
      const reasons: string[] = [];

      if (amountMatch(absMonto, inv.saldo) || amountMatch(absMonto, inv.total)) {
        score += 35; reasons.push(`Monto ${absMonto} ≈ deuda ${inv.saldo}`);
        // bono si saldo exacto
        if (amountMatch(absMonto, inv.saldo)) { score += 10; reasons.push("Saldo exacto"); }
      } else {
        // Si monto no coincide, penaliza pero aún puede ser abono parcial
        // Si diferencia > 50% de deuda, descarta
        const diff = Math.abs(absMonto - inv.saldo) / inv.saldo;
        if (diff > 0.7) continue;
        score += 5; reasons.push(`Abono parcial ${absMonto} vs ${inv.saldo}`);
      }

      if (containsNIS(textBlob, inv.nis)) { score += 40; reasons.push(`Contiene NIS ${inv.nis}`); }
      if (containsNIS(tx.referencia, inv.nis)) { score += 10; reasons.push(`Referencia = NIS`); }
      if (containsName(textBlob, inv.subscriberName)) { score += 25; reasons.push(`Nombre ${inv.subscriberName.split(" ")[0]} en descripción`); }

      // Fecha: si transacción es posterior a vencimiento pero dentro de 60 días, ok
      // No penaliza

      if (score >= 35) {
        const action = score >= 70 ? "AUTO_MATCH" : score >= 45 ? "REVIEW" : "IGNORE";
        if (!best || score > best.score) {
          best = { txIndex: i, tx, score, reason: reasons, invoice: inv, suggestedAction: action as any };
        }
      }
    }

    if (best) results.push(best);
    else results.push({ txIndex: i, tx, score: 0, reason: ["Sin coincidencia — asignar manual"], suggestedAction: "REVIEW" });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function summary(matches: Match[]) {
  return {
    auto: matches.filter(m => m.suggestedAction === "AUTO_MATCH").length,
    review: matches.filter(m => m.suggestedAction === "REVIEW").length,
    ignore: matches.filter(m => m.suggestedAction === "IGNORE").length,
  };
}
