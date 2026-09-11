import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

interface ListFilters {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}

const productInclude = {
  category: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true, location: true } },
} satisfies Prisma.ProductInclude;

export const productRepository = {
  async findMany({ page, pageSize, search, categoryId, lowStockOnly }: ListFilters) {
    const where: Prisma.ProductWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Prisma can't compare two columns of the same row in a `where` filter,
    // so a "current_stock <= min_stock_alert" filter is applied in memory
    // after fetching. Acceptable at this dataset size; a raw SQL query would
    // be the production fix if the product catalog grew large.
    if (lowStockOnly) {
      const all = await prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' } });
      const filtered = all.filter((p) => p.currentStock <= p.minStockAlert);
      const total = filtered.length;
      const items = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
      return { items, total };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: productInclude,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id }, include: productInclude });
  },

  findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku } });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data, include: productInclude });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data, include: productInclude });
  },

  count() {
    return prisma.product.count();
  },

  async countLowStock() {
    const all = await prisma.product.findMany({ select: { currentStock: true, minStockAlert: true } });
    return all.filter((p) => p.currentStock <= p.minStockAlert).length;
  },
};
