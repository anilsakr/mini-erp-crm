import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const dashboardController = {
  getSummary: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.getSummary());
  }),
};
