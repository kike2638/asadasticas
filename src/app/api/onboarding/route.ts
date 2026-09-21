import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.tenantName || !data.haciendaUser || !data.llaveCryptBase64) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenantName,
          slug: data.slug,
          status: 'ACTIVE',
          plan: 'BASIC',
        },
      });

      await tx.tenantConfig.create({
        data: {
          tenantId: tenant.id,
          haciendaUser: data.haciendaUser,
          haciendaPassword: encrypt(data.haciendaPassword),
          llaveCryptBase64: data.llaveCryptBase64,
          llavePin: encrypt(data.llavePin),
        },
      });

      return tenant;
    });

    return NextResponse.json({ success: true, tenantId: result.id });
  } catch (error) {
    console.error('Error en onboarding:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
