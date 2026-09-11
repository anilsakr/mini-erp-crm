import { Response } from 'express';

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { statusCode?: number; message?: string; pagination?: Pagination } = {},
) {
  const { statusCode = 200, message, pagination } = options;
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
}
