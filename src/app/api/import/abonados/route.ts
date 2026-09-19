import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

// POST /api/import/abonados
// Procesa un archivo CSV con columnas: nombre, nis, numero_medidor, categoria
export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'Tenant no autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

    const text = await file.text();
    const { data } = Papa.parse(text, { header: true });

    // Validar y procesar en transacción
    const result = await prisma.$transaction(
      (data as any[]).map((row) =>
        prisma.subscriber.create({
          data: {
            tenantId,
            name: row.nombre,
            nis: row.nis,
            meters: {
              create: {
                tenantId,
                number: row.numero_medidor,
              }
            }
          }
        })
      )
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error) {
    console.error('Error importando abonados:', error);
    return NextResponse.json({ error: 'Error procesando el CSV' }, { status: 500 });
  }
}
