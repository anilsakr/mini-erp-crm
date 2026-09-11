import { productRepository } from '../repositories/product.repository';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}

interface CreateProductInput {
  name: string;
  sku: string;
  categoryId: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  warehouseId: string;
}

export const productService = {
  async list(params: ListParams) {
    const { items, total } = await productRepository.findMany(params);
    return { items, pagination: buildPaginationMeta(params.page, params.pageSize, total) };
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw AppError.notFound('Product');
    return product;
  },

  async create(input: CreateProductInput) {
    const existing = await productRepository.findBySku(input.sku);
    if (existing) {
      throw AppError.conflict('DUPLICATE_SKU', `A product with SKU ${input.sku} already exists`);
    }
    return productRepository.create({
      name: input.name,
      sku: input.sku,
      category: { connect: { id: input.categoryId } },
      unitPrice: input.unitPrice,
      currentStock: input.currentStock ?? 0,
      minStockAlert: input.minStockAlert ?? 0,
      warehouse: { connect: { id: input.warehouseId } },
    });
  },

  async update(id: string, input: Partial<Omit<CreateProductInput, 'currentStock'>>) {
    await this.getById(id);

    if (input.sku) {
      const existing = await productRepository.findBySku(input.sku);
      if (existing && existing.id !== id) {
        throw AppError.conflict('DUPLICATE_SKU', `A product with SKU ${input.sku} already exists`);
      }
    }

    return productRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.categoryId !== undefined ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.minStockAlert !== undefined ? { minStockAlert: input.minStockAlert } : {}),
      ...(input.warehouseId !== undefined ? { warehouse: { connect: { id: input.warehouseId } } } : {}),
    });
  },

  async getStats() {
    const [total, lowStock] = await Promise.all([productRepository.count(), productRepository.countLowStock()]);
    return { total, lowStock };
  },
};
