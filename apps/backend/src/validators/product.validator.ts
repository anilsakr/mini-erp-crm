import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU is required'),
    categoryId: z.string().uuid('Valid category is required'),
    unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative'),
    currentStock: z.coerce.number().int().nonnegative('Stock cannot be negative').default(0),
    minStockAlert: z.coerce.number().int().nonnegative('Minimum stock cannot be negative').default(0),
    warehouseId: z.string().uuid('Valid warehouse is required'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  // currentStock is intentionally excluded from updates — stock is only ever
  // changed through a recorded StockMovement (see stock.validator.ts), never
  // by directly PATCHing the product.
  body: createProductSchema.shape.body.omit({ currentStock: true }).partial(),
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    lowStockOnly: z.coerce.boolean().optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
