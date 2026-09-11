import { Request, Response } from 'express';
import { z } from 'zod';
import { challanService } from '../services/challan.service';
import { listChallansSchema } from '../validators/challan.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

type ListChallansQuery = z.infer<typeof listChallansSchema>['query'];

export const challanController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, status, customerId } = req.query as unknown as ListChallansQuery;
    const result = await challanService.list({ page, pageSize, status, customerId });
    sendSuccess(res, result.items, { pagination: result.pagination });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const challan = await challanService.getById(req.params.id);
    sendSuccess(res, challan);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const challan = await challanService.create(req.body, req.user.id);
    sendSuccess(res, challan, { statusCode: 201, message: 'Draft challan created' });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const challan = await challanService.update(req.params.id, req.body);
    sendSuccess(res, challan, { message: 'Challan updated' });
  }),

  confirm: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const challan = await challanService.confirm(req.params.id, req.user.id);
    sendSuccess(res, challan, { message: 'Challan confirmed and stock updated' });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const challan = await challanService.cancel(req.params.id);
    sendSuccess(res, challan, { message: 'Challan cancelled' });
  }),
};
