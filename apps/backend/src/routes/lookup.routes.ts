import { Router } from 'express';
import { lookupController } from '../controllers/lookup.controller';
import { authenticate } from '../middleware/auth';

export const lookupRouter = Router();

lookupRouter.use(authenticate);
lookupRouter.get('/categories', lookupController.listCategories);
lookupRouter.get('/warehouses', lookupController.listWarehouses);
