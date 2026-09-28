"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/auth/helper";

const TIPOS = ["DEPOSITO_BANCO", "OPERATIVO", "UTILIDADES"];
const ROLES_OK = ["ADMIN", "ACCOUNTING", "PLATFORM_OWNER"];

function fmt(n: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(n);
}

export async function registrarRetiro(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const s = await getServerUser();
  if (!s) return { error: "Sesión expirada, volvé a entrar" };
  if (!ROLES_OK.includes(s.user.role)) return { error: "Tu rol no puede registrar retiros" };

  const tenantId = s.user.tenantId;
  const monto = Number(String(formData.get("monto") ?? "").replace(/[^\d]/g, ""));
  const tipo = String(formData.get("tipo") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 120);

  if (!Number.isFinite(monto) || monto <= 0) return { error: "Ingresá un monto mayor a 0" };
  if (!TIPOS.includes(tipo)) return { error: "Tipo de retiro inválido" };

  if (tipo === "UTILIDADES") {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [ingresos, retiros] = await Promise.all([
      prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: inicioMes } }, _sum: { amount: true } }),
      prisma.cashWithdrawal.aggregate({
        where: { tenantId, fecha: { gte: inicioMes }, tipo: { in: ["OPERATIVO", "UTILIDADES"] } },
        _sum: { monto: true },
      }),
    ]);

    const excedente = Number(ingresos._sum.amount ?? 0) - Number(retiros._sum.monto ?? 0);
    if (monto > excedente) {
      return {
        error:
          excedente <= 0
            ? "Este mes no queda excedente: ingresos cubiertos por retiros operativos/utilidades"
            : `Solo hay ${fmt(excedente)} de excedente disponible este mes`,
      };
    }
  }

  await prisma.cashWithdrawal.create({
    data: { tenantId, tipo, monto, motivo: motivo || null, registradoPor: s.user.id },
  });

  revalidatePath("/caja");
  return { ok: true };
}
