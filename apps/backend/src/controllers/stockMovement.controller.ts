import { Request, Response } from 'express';
import { z } from 'zod';
import { stockMovementService } from '../services/stockMovement.service';
import { listStockMovementsSchema } from '../validators/stockMovement.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

type ListStockMovementsQuery = z.infer<typeof listStockMovementsSchema>['query'];

export const stockMovementController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const movement = await stockMovementService.createMovement(req.body, req.user.id);
    sendSuccess(res, movement, { statusCode: 201, message: 'Stock movement recorded' });
  }),

  listForProduct: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as ListStockMovementsQuery;
    const result = await stockMovementService.listForProduct(req.params.id, page, pageSize);
    sendSuccess(res, result.items, { pagination: result.pagination });
  }),
};
