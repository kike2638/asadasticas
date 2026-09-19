import { prisma } from '@/lib/prisma';

export async function getActiveTariff(tenantId: string, category: string) {
  return await prisma.tariff.findFirst({
    where: {
      tenantId,
      category,
      isActive: true,
      validFrom: { lte: new Date() }
    },
    include: { blocks: true },
    orderBy: { validFrom: 'desc' }
  });
}
