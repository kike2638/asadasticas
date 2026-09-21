import { prisma } from '@/lib/prisma';
import { SubscriberCategory } from '@prisma/client';

export async function getActiveTariff(tenantId: string, category: SubscriberCategory) {
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
