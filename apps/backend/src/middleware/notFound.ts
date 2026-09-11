import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: { code: 'ROUTE_NOT_FOUND', details: null },
  });
}
