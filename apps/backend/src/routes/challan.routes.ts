import { Router } from 'express';
import { Role } from '@prisma/client';
import { challanController } from '../controllers/challan.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  challanIdParamSchema,
  createChallanSchema,
  listChallansSchema,
  updateChallanSchema,
} from '../validators/challan.validator';

export const challanRouter = Router();

challanRouter.use(authenticate);

// Everyone can read challans (Warehouse and Accounts need visibility into
// what's been sold); only Admin/Sales can create or change their state.
challanRouter.get('/', validate(listChallansSchema), challanController.list);
challanRouter.get('/:id', validate(challanIdParamSchema), challanController.getById);
challanRouter.post('/', requireRole(Role.ADMIN, Role.SALES), validate(createChallanSchema), challanController.create);
challanRouter.put('/:id', requireRole(Role.ADMIN, Role.SALES), validate(updateChallanSchema), challanController.update);
challanRouter.post(
  '/:id/confirm',
  requireRole(Role.ADMIN, Role.SALES),
  validate(challanIdParamSchema),
  challanController.confirm,
);
challanRouter.post(
  '/:id/cancel',
  requireRole(Role.ADMIN, Role.SALES),
  validate(challanIdParamSchema),
  challanController.cancel,
);
