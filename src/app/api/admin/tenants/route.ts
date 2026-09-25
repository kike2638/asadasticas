import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { calculateSubscription } from "@/lib/saas/pricing";
import bcrypt from "bcryptjs";

const TRIAL_DAYS = 14;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomPassword(): string {
  const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += charset[Math.floor(Math.random() * charset.length)];
  return out;
}

export async function POST(request: Request) {
  try {
    const h = await headers();
    if (h.get("x-user-role") !== "PLATFORM_OWNER") {
      return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = (body.name ?? "").toString().trim();
    const cedulaJuridica = (body.cedulaJuridica ?? "").toString().trim();
    const abonados = Math.max(0, Math.min(100000, parseInt(body.abonados ?? "0", 10) || 0));
    const slug = slugify((body.slug ?? "").toString().trim() || name);

    if (name.length < 3) return NextResponse.json({ error: "Nombre de ASADA muy corto" }, { status: 400 });
    if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "Slug inválido (a-z, 0-9, guiones)" }, { status: 400 });

    const exists = await prisma.tenant.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: `El slug "${slug}" ya existe` }, { status: 409 });

    const email = `admin@${slug}.cr`;
    const password = randomPassword();
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const sub = calculateSubscription(abonados);
    const now = new Date();
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name,
          slug,
          cedulaJuridica: cedulaJuridica || null,
          plan: "BASIC",
          status: "ACTIVE",
          subscriptionStatus: "TRIAL",
          trialEndsAt,
        },
      });

      await tx.tenantConfig.create({
        data: {
          tenantId: t.id,
          haciendaUser: "",
          haciendaPassword: "",
          llaveCryptBase64: "",
          llavePin: "",
        },
      });

      await tx.user.create({
        data: {
          tenantId: t.id,
          email,
          name: `Admin ${name}`,
          password: await bcrypt.hash(password, 10),
          role: "ADMIN",
        },
      });

      await tx.saaSSubscription.create({
        data: {
          tenantId: t.id,
          periodo,
          abonadosCount: abonados,
          plan: "BASIC",
          monto: sub.montoCRC,
          status: "TRIAL",
          fechaVencimiento: trialEndsAt,
        },
      });

      return t;
    });

    return NextResponse.json({
      success: true,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, trialEndsAt },
      credentials: { email, password, loginUrl: "/login" },
      trialDays: TRIAL_DAYS,
    });
  } catch (error) {
    console.error("Error creando ASADA:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
