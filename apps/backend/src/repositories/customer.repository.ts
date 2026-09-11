import { CustomerStatus, CustomerType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

interface ListFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

export const customerRepository = {
  async findMany({ page, pageSize, search, status, customerType }: ListFilters) {
    const where: Prisma.CustomerWhereInput = {
      ...(status ? { status } : {}),
      ...(customerType ? { customerType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { businessName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });
  },

  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({ data });
  },

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({ where: { id }, data });
  },

  addFollowUp(data: Prisma.CustomerFollowUpCreateInput) {
    return prisma.customerFollowUp.create({ data });
  },

  count() {
    return prisma.customer.count();
  },

  countByStatus(status: CustomerStatus) {
    return prisma.customer.count({ where: { status } });
  },
};
