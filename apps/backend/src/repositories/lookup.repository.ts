import { prisma } from '../config/prisma';

// Simple read-only lookups backing frontend dropdowns (category/warehouse
// pickers on the product form). Deliberately not full CRUD modules — the
// case study does not require managing categories/warehouses as their own
// screens, only using them as product attributes.
export const lookupRepository = {
  listCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },
  listWarehouses() {
    return prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  },
};
