import { Router } from 'express';
import { Role } from '@prisma/client';
import { productController } from '../controllers/product.controller';
import { stockMovementController } from '../controllers/stockMovement.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductSchema, listProductsSchema, productIdParamSchema, updateProductSchema } from '../validators/product.validator';
import { listStockMovementsSchema } from '../validators/stockMovement.validator';

export const productRouter = Router();

// All roles can view products/stock; only Admin/Warehouse can create/edit
// products (see RBAC matrix).
productRouter.use(authenticate);

productRouter.get('/', validate(listProductsSchema), productController.list);
productRouter.get('/:id', validate(productIdParamSchema), productController.getById);
productRouter.post('/', requireRole(Role.ADMIN, Role.WAREHOUSE), validate(createProductSchema), productController.create);
productRouter.put('/:id', requireRole(Role.ADMIN, Role.WAREHOUSE), validate(updateProductSchema), productController.update);
productRouter.get(
  '/:id/stock-movements',
  validate(listStockMovementsSchema),
  stockMovementController.listForProduct,
);
