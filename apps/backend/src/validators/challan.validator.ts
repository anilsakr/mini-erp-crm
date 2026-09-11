import { z } from 'zod';
import { ChallanStatus } from '@prisma/client';

const challanItemSchema = z.object({
  productId: z.string().uuid('Valid product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
});

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Valid customer is required'),
    items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  }),
});

export const updateChallanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z.array(challanItemSchema).min(1, 'At least one item is required').optional(),
  }),
});

export const listChallansSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(ChallanStatus).optional(),
    customerId: z.string().uuid().optional(),
  }),
});

export const challanIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
