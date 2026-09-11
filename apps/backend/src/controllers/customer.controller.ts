import { Request, Response } from 'express';
import { z } from 'zod';
import { customerService } from '../services/customer.service';
import { listCustomersSchema } from '../validators/customer.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

type ListCustomersQuery = z.infer<typeof listCustomersSchema>['query'];

export const customerController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, search, status, customerType } = req.query as unknown as ListCustomersQuery;
    const result = await customerService.list({ page, pageSize, search, status, customerType });
    sendSuccess(res, result.items, { pagination: result.pagination });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.getById(req.params.id);
    sendSuccess(res, customer);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const customer = await customerService.create(req.body, req.user.id);
    sendSuccess(res, customer, { statusCode: 201, message: 'Customer created' });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.update(req.params.id, req.body);
    sendSuccess(res, customer, { message: 'Customer updated' });
  }),

  addFollowUp: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { note, followUpDate } = req.body;
    const followUp = await customerService.addFollowUp(req.params.id, note, followUpDate, req.user.id);
    sendSuccess(res, followUp, { statusCode: 201, message: 'Follow-up added' });
  }),
};
