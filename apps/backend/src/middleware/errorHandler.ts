import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Centralized error handler: every route funnels here (via asyncHandler or a
// synchronous throw), so the response shape is guaranteed consistent across
// the whole API, per the case study's required error envelope.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code, details: err.details ?? null },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { code: 'VALIDATION_ERROR', details: err.flatten() },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `A record with this ${(err.meta?.target as string[])?.join(', ') ?? 'value'} already exists`,
      error: { code: 'DUPLICATE_VALUE', details: err.meta ?? null },
    });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');

  // Never leak stack traces or internal details to the client in production.
  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error).message,
    error: { code: 'INTERNAL_ERROR', details: null },
  });
}
