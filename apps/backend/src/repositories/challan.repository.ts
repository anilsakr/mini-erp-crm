import { ChallanStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const challanInclude = {
  customer: { select: { id: true, name: true, businessName: true, mobile: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true } } } },
} satisfies Prisma.ChallanInclude;

interface ListFilters {
  page: number;
  pageSize: number;
  status?: ChallanStatus;
  customerId?: string;
}

export const challanRepository = {
  async findMany({ page, pageSize, status, customerId }: ListFilters) {
    const where: Prisma.ChallanWhereInput = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: challanInclude,
      }),
      prisma.challan.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.challan.findUnique({ where: { id }, include: challanInclude });
  },

  countByStatus(status: ChallanStatus) {
    return prisma.challan.count({ where: { status } });
  },

  async findRecent(limit: number) {
    return prisma.challan.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: challanInclude,
    });
  },

  // Generates the next human-readable challan number via a dedicated Postgres
  // sequence (see prisma/migrations/*_add_challan_sequence). A sequence
  // guarantees no two concurrent requests ever get the same number, which a
  // naive "count existing challans + 1" approach would not.
  async nextChallanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('challan_number_seq')`;
    const seq = result[0].nextval.toString().padStart(6, '0');
    return `CH-${year}-${seq}`;
  },

  includeConfig: challanInclude,
};
