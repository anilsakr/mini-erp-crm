import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { stockMovementRepository } from '../repositories/stockMovement.repository';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';

interface CreateMovementInput {
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
}

export const stockMovementService = {
  // This is the ONLY way current_stock is allowed to change outside of a
  // challan confirmation. Wrapping the read-check-write in a transaction
  // with a row lock prevents two simultaneous manual adjustments (e.g. two
  // warehouse staff correcting the same product at once) from producing an
  // inconsistent current_stock value.
  async createMovement(input: CreateMovementInput, createdById: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.$queryRaw<{ id: string; current_stock: number; sku: string }[]>`
        SELECT id, current_stock, sku FROM products WHERE id = ${input.productId} FOR UPDATE
      `;

      if (product.length === 0) {
        throw AppError.notFound('Product');
      }

      const current = product[0];
      const delta = input.movementType === MovementType.IN ? input.quantityChanged : -input.quantityChanged;
      const newStock = current.current_stock + delta;

      if (newStock < 0) {
        throw AppError.conflict(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for SKU ${current.sku}. Available: ${current.current_stock}, Requested: ${input.quantityChanged}.`,
        );
      }

      await tx.product.update({ where: { id: input.productId }, data: { currentStock: newStock } });

      return tx.stockMovement.create({
        data: {
          product: { connect: { id: input.productId } },
          quantityChanged: input.quantityChanged,
          movementType: input.movementType,
          reason: input.reason,
          createdBy: { connect: { id: createdById } },
        } satisfies Prisma.StockMovementCreateInput,
        include: { product: { select: { id: true, name: true, sku: true } } },
      });
    });
  },

  async listForProduct(productId: string, page: number, pageSize: number) {
    const { items, total } = await stockMovementRepository.findByProduct(productId, page, pageSize);
    return { items, pagination: buildPaginationMeta(page, pageSize, total) };
  },

  listRecent(limit: number) {
    return stockMovementRepository.findRecent(limit);
  },
};
