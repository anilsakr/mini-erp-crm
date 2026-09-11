import { Request, Response } from 'express';
import { lookupRepository } from '../repositories/lookup.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const lookupController = {
  listCategories: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await lookupRepository.listCategories());
  }),
  listWarehouses: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await lookupRepository.listWarehouses());
  }),
};
