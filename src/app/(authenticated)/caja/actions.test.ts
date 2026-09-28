import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/helper", () => ({ getServerUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: { aggregate: vi.fn() },
    cashWithdrawal: { aggregate: vi.fn(), create: vi.fn() },
  },
}));

import { registrarRetiro } from "./actions";
import { getServerUser } from "@/lib/auth/helper";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const mockUser = (role: string) => ({
  user: { id: "user-1", role, tenantId: "t-1" },
});

function fd(data: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerUser).mockResolvedValue(mockUser("ADMIN") as never);
  vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as never);
  vi.mocked(prisma.cashWithdrawal.aggregate).mockResolvedValue({ _sum: { monto: 0 } } as never);
  vi.mocked(prisma.cashWithdrawal.create).mockResolvedValue({} as never);
});

describe("registrarRetiro: permisos", () => {
  it("rechaza sin sesión", async () => {
    vi.mocked(getServerUser).mockResolvedValue(null as never);
    const r = await registrarRetiro(fd({ monto: "5000", tipo: "OPERATIVO" }));
    expect(r.ok).toBeUndefined();
    expect(r.error).toBeTruthy();
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("rechaza a FIELD_STAFF", async () => {
    vi.mocked(getServerUser).mockResolvedValue(mockUser("FIELD_STAFF") as never);
    const r = await registrarRetiro(fd({ monto: "5000", tipo: "OPERATIVO" }));
    expect(r.error).toMatch(/rol/i);
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("acepta ADMIN, ACCOUNTING y PLATFORM_OWNER", async () => {
    for (const role of ["ADMIN", "ACCOUNTING", "PLATFORM_OWNER"]) {
      vi.clearAllMocks();
      vi.mocked(getServerUser).mockResolvedValue(mockUser(role) as never);
      vi.mocked(prisma.cashWithdrawal.create).mockResolvedValue({} as never);
      const r = await registrarRetiro(fd({ monto: "5000", tipo: "OPERATIVO" }));
      expect(r.ok, role).toBe(true);
    }
  });
});

describe("registrarRetiro: validación de entrada", () => {
  it("rechaza monto 0 o vacío", async () => {
    for (const monto of ["0", "", "no-es-numero"]) {
      const r = await registrarRetiro(fd({ monto, tipo: "OPERATIVO" }));
      expect(r.error, monto).toBeTruthy();
    }
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("rechaza tipo inválido", async () => {
    const r = await registrarRetiro(fd({ monto: "5000", tipo: "ROBO" }));
    expect(r.error).toMatch(/tipo/i);
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("parsea montos con formato ₡ y comas", async () => {
    const r = await registrarRetiro(fd({ monto: "₡50,000", tipo: "OPERATIVO" }));
    expect(r.ok).toBe(true);
    expect(prisma.cashWithdrawal.create).toHaveBeenCalledWith({
      data: { tenantId: "t-1", tipo: "OPERATIVO", monto: 50000, motivo: null, registradoPor: "user-1" },
    });
  });

  it("trunca motivos a 120 caracteres", async () => {
    const r = await registrarRetiro(fd({ monto: "1000", tipo: "OPERATIVO", motivo: "x".repeat(300) }));
    expect(r.ok).toBe(true);
    const data = vi.mocked(prisma.cashWithdrawal.create).mock.calls[0][0].data;
    expect(data.motivo).toHaveLength(120);
  });
});

describe("registrarRetiro: excedente de utilidades", () => {
  const setExcedente = (ingresos: number, retirosPrevios: number) => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: ingresos } } as never);
    vi.mocked(prisma.cashWithdrawal.aggregate).mockResolvedValue({ _sum: { monto: retirosPrevios } } as never);
  };

  it("OPERATIVO no valida excedente (solo ingresa)", async () => {
    setExcedente(0, 999999);
    const r = await registrarRetiro(fd({ monto: "100000", tipo: "OPERATIVO" }));
    expect(r.ok).toBe(true);
    expect(prisma.payment.aggregate).not.toHaveBeenCalled();
  });

  it("UTILIDADES acepta hasta el excedente exacto", async () => {
    setExcedente(10000, 4000); // excedente = 6000
    const r = await registrarRetiro(fd({ monto: "6000", tipo: "UTILIDADES" }));
    expect(r.ok).toBe(true);
    expect(prisma.cashWithdrawal.create).toHaveBeenCalledTimes(1);
  });

  it("UTILIDADES rechaza monto que supera el excedente", async () => {
    setExcedente(10000, 4000); // excedente = 6000
    const r = await registrarRetiro(fd({ monto: "6001", tipo: "UTILIDADES" }));
    expect(r.ok).toBeUndefined();
    expect(r.error).toMatch(/excedente/i);
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("UTILIDADES sin excedente da mensaje específico", async () => {
    setExcedente(5000, 5000); // excedente = 0
    const r = await registrarRetiro(fd({ monto: "1", tipo: "UTILIDADES" }));
    expect(r.ok).toBeUndefined();
    expect(r.error).toMatch(/no queda excedente/i);
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("UTILIDADES con excedente negativo (sobregiro) se rechaza", async () => {
    setExcedente(5000, 9000); // excedente = -4000
    const r = await registrarRetiro(fd({ monto: "100", tipo: "UTILIDADES" }));
    expect(r.ok).toBeUndefined();
    expect(prisma.cashWithdrawal.create).not.toHaveBeenCalled();
  });

  it("solo cuentan retiros OPERATIVO y UTILIDADES del mes (el filtro está en la query)", async () => {
    setExcedente(10000, 4000);
    await registrarRetiro(fd({ monto: "1000", tipo: "UTILIDADES" }));
    const where = vi.mocked(prisma.cashWithdrawal.aggregate).mock.calls[0][0].where;
    expect(where.tipo).toEqual({ in: ["OPERATIVO", "UTILIDADES"] });
    expect(where.tenantId).toBe("t-1");
    expect(where.fecha.gte).toBeInstanceOf(Date);
  });
});

describe("registrarRetiro: éxito", () => {
  it("revalide la ruta /caja al tener éxito", async () => {
    const r = await registrarRetiro(fd({ monto: "2000", tipo: "DEPOSITO_BANCO" }));
    expect(r.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/caja");
  });
});
