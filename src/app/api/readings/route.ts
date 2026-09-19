import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// POST /api/readings
// Recibe un array de lecturas: [{ meterId: string, value: number }]
export async function POST(request: Request) {
  try {
    const tenantId = headers().get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'Tenant no identificado' }, { status: 401 });

    const body = await request.json();
    const { readings } = body; // Esperamos { readings: [{ meterId, value, date }] }

    if (!Array.isArray(readings)) {
      return NextResponse.json({ error: 'Formato inválido, se esperaba un array de lecturas' }, { status: 400 });
    }

    // Procesamiento en transacción para asegurar consistencia
    const result = await prisma.$transaction(
      readings.map((reading) =>
        prisma.reading.create({
          data: {
            tenantId,
            meterId: reading.meterId,
            value: reading.value,
            date: reading.date ? new Date(reading.date) : new Date(),
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error) {
    console.error('Error al registrar lecturas:', error);
    return NextResponse.json({ error: 'Error procesando las lecturas' }, { status: 500 });
  }
}
