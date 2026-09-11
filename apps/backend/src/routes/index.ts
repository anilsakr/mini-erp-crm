import { Router } from 'express';
import { authRouter } from './auth.routes';
import { customerRouter } from './customer.routes';
import { productRouter } from './product.routes';
import { stockMovementRouter } from './stockMovement.routes';
import { challanRouter } from './challan.routes';
import { lookupRouter } from './lookup.routes';
import { dashboardRouter } from './dashboard.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/stock-movements', stockMovementRouter);
apiRouter.use('/challans', challanRouter);
apiRouter.use('/lookups', lookupRouter);
apiRouter.use('/dashboard', dashboardRouter);
