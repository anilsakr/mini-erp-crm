import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';

const mobileRegex = /^[0-9+\-\s]{7,15}$/;

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Customer name is required'),
    mobile: z.string().regex(mobileRegex, 'Enter a valid mobile number'),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    businessName: z.string().min(1, 'Business name is required'),
    gstNumber: z.string().optional().or(z.literal('')),
    customerType: z.nativeEnum(CustomerType),
    address: z.string().min(1, 'Address is required'),
    status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
    followUpDate: z.coerce.date().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createCustomerSchema.shape.body.partial(),
});

export const listCustomersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    customerType: z.nativeEnum(CustomerType).optional(),
  }),
});

export const customerIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const addFollowUpSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    note: z.string().min(1, 'Note is required'),
    followUpDate: z.coerce.date().optional(),
  }),
});
