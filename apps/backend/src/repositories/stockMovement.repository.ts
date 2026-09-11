import { prisma } from '../config/prisma';

export const stockMovementRepository = {
  async findByProduct(productId: string, page: number, pageSize: number) {
    const where = { productId };
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { items, total };
  },

  async findRecent(limit: number) {
    return prisma.stockMovement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  },
};
