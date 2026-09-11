import { z } from 'zod';
import { MovementType } from '@prisma/client';

export const createStockMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Valid product is required'),
    quantityChanged: z.coerce.number().int().positive('Quantity must be greater than zero'),
    movementType: z.nativeEnum(MovementType),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const listStockMovementsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
