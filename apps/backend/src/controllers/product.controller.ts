import { Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service';
import { listProductsSchema } from '../validators/product.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, search, categoryId, lowStockOnly } = req.query as unknown as ListProductsQuery;
    const result = await productService.list({ page, pageSize, search, categoryId, lowStockOnly });
    sendSuccess(res, result.items, { pagination: result.pagination });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    sendSuccess(res, product);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    sendSuccess(res, product, { statusCode: 201, message: 'Product created' });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    sendSuccess(res, product, { message: 'Product updated' });
  }),
};
