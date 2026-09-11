import { Router } from 'express';
import { Role } from '@prisma/client';
import { stockMovementController } from '../controllers/stockMovement.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStockMovementSchema } from '../validators/stockMovement.validator';

export const stockMovementRouter = Router();

stockMovementRouter.use(authenticate);

// Only Admin/Warehouse can record a manual stock adjustment — this is the
// single writable endpoint for stock, per "do not allow arbitrary direct
// stock manipulation without recording a stock movement".
stockMovementRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  validate(createStockMovementSchema),
  stockMovementController.create,
);
