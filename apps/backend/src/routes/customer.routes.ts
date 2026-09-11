import { Router } from 'express';
import { Role } from '@prisma/client';
import { customerController } from '../controllers/customer.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addFollowUpSchema,
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from '../validators/customer.validator';

export const customerRouter = Router();

// Per the RBAC matrix (docs/architecture.md): Warehouse has no customer
// access at all; Accounts is read-only; Sales and Admin have full access.
customerRouter.use(authenticate);

customerRouter.get(
  '/',
  requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  validate(listCustomersSchema),
  customerController.list,
);
customerRouter.get(
  '/:id',
  requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  validate(customerIdParamSchema),
  customerController.getById,
);
customerRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.SALES),
  validate(createCustomerSchema),
  customerController.create,
);
customerRouter.put(
  '/:id',
  requireRole(Role.ADMIN, Role.SALES),
  validate(updateCustomerSchema),
  customerController.update,
);
customerRouter.post(
  '/:id/follow-ups',
  requireRole(Role.ADMIN, Role.SALES),
  validate(addFollowUpSchema),
  customerController.addFollowUp,
);
