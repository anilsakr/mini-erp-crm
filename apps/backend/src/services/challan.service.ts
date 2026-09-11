import { ChallanStatus, MovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { challanRepository } from '../repositories/challan.repository';
import { productRepository } from '../repositories/product.repository';
import { customerRepository } from '../repositories/customer.repository';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

interface ListParams {
  page: number;
  pageSize: number;
  status?: ChallanStatus;
  customerId?: string;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Builds the denormalized item rows for a challan. Snapshots are taken from
// the product's CURRENT name/sku/price at this exact moment — if the product
// is renamed or repriced later, this challan will still show what was
// actually agreed and sold (see schema.prisma comment on ChallanItem, and
// docs/architecture.md "Why Product Snapshots").
async function buildItemsWithSnapshots(items: ChallanItemInput[]) {
  const products = await Promise.all(items.map((item) => productRepository.findById(item.productId)));

  return items.map((item, index) => {
    const product = products[index];
    if (!product) {
      throw AppError.badRequest('PRODUCT_NOT_FOUND', `Product ${item.productId} does not exist`);
    }
    const unitPrice = Number(product.unitPrice);
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      unitPriceSnapshot: unitPrice,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
    };
  });
}

export const challanService = {
  async list(params: ListParams) {
    const { items, total } = await challanRepository.findMany(params);
    return { items, pagination: buildPaginationMeta(params.page, params.pageSize, total) };
  },

  async getById(id: string) {
    const challan = await challanRepository.findById(id);
    if (!challan) throw AppError.notFound('Challan');
    return challan;
  },

  // Rule 1: creating a Draft never touches product stock. Only confirm() does.
  async create(input: { customerId: string; items: ChallanItemInput[] }, createdById: string) {
    const customer = await customerRepository.findById(input.customerId);
    if (!customer) {
      throw AppError.badRequest('CUSTOMER_NOT_FOUND', 'Selected customer does not exist');
    }

    const itemsWithSnapshots = await buildItemsWithSnapshots(input.items);
    const totalQuantity = itemsWithSnapshots.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = round2(itemsWithSnapshots.reduce((sum, item) => sum + item.lineTotal, 0));
    const challanNumber = await challanRepository.nextChallanNumber();

    return prisma.challan.create({
      data: {
        challanNumber,
        customer: { connect: { id: input.customerId } },
        status: ChallanStatus.DRAFT,
        totalQuantity,
        totalAmount,
        createdBy: { connect: { id: createdById } },
        items: { create: itemsWithSnapshots },
      },
      include: challanRepository.includeConfig,
    });
  },

  async update(id: string, input: { customerId?: string; items?: ChallanItemInput[] }) {
    const challan = await this.getById(id);
    if (challan.status !== ChallanStatus.DRAFT) {
      throw AppError.conflict('CHALLAN_NOT_DRAFT', 'Only draft challans can be edited');
    }

    const data: Prisma.ChallanUpdateInput = {};
    if (input.customerId) {
      data.customer = { connect: { id: input.customerId } };
    }

    if (input.items) {
      const itemsWithSnapshots = await buildItemsWithSnapshots(input.items);
      data.totalQuantity = itemsWithSnapshots.reduce((sum, item) => sum + item.quantity, 0);
      data.totalAmount = round2(itemsWithSnapshots.reduce((sum, item) => sum + item.lineTotal, 0));
      // A draft has no downstream effects yet, so the simplest correct edit
      // strategy is to replace all its items rather than diff them.
      await prisma.challanItem.deleteMany({ where: { challanId: id } });
      data.items = { create: itemsWithSnapshots };
    }

    return prisma.challan.update({ where: { id }, data, include: challanRepository.includeConfig });
  },

  // Rules 2-4 live here. See docs/architecture.md "Challan Confirmation
  // Transaction" for the full step-by-step explanation of why this is one
  // atomic transaction with row locks.
  async confirm(id: string, confirmedById: string) {
    return prisma.$transaction(async (tx) => {
      // Lock the challan row itself first. If two requests try to confirm
      // the same challan at the same instant, the second one blocks here
      // until the first commits, then sees status = CONFIRMED and is
      // rejected below — this is what makes double-confirm impossible.
      const lockedChallan = await tx.$queryRaw<{ id: string; status: string; challan_number: string }[]>`
        SELECT id, status, challan_number FROM challans WHERE id = ${id} FOR UPDATE
      `;

      if (lockedChallan.length === 0) {
        throw AppError.notFound('Challan');
      }
      if (lockedChallan[0].status !== ChallanStatus.DRAFT) {
        throw AppError.conflict(
          'CHALLAN_NOT_DRAFT',
          `Challan is already ${lockedChallan[0].status.toLowerCase()} and cannot be confirmed again`,
        );
      }

      const items = await tx.challanItem.findMany({ where: { challanId: id } });
      const productIds = [...new Set(items.map((item) => item.productId))].sort();

      // Lock every involved product row in a fixed (sorted) order. Locking
      // in a consistent order across ALL transactions in the app is what
      // prevents a classic deadlock: transaction A locking product 1 then
      // waiting on product 2, while transaction B holds product 2 and waits
      // on product 1.
      const products = await tx.$queryRaw<{ id: string; current_stock: number; sku: string }[]>`
        SELECT id, current_stock, sku FROM products WHERE id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE
      `;
      const stockById = new Map(products.map((p) => [p.id, p]));

      const shortages: { sku: string; available: number; requested: number }[] = [];
      for (const item of items) {
        const product = stockById.get(item.productId);
        if (!product || product.current_stock < item.quantity) {
          shortages.push({
            sku: item.skuSnapshot,
            available: product?.current_stock ?? 0,
            requested: item.quantity,
          });
        }
      }

      if (shortages.length > 0) {
        // Throwing inside prisma.$transaction rolls back everything above —
        // no product's stock is touched even if only one of several items
        // is short (Rule 3: no partial updates).
        const message = shortages
          .map((s) => `Insufficient stock for SKU ${s.sku}. Available: ${s.available}, Requested: ${s.requested}.`)
          .join(' ');
        throw AppError.conflict('INSUFFICIENT_STOCK', message, shortages);
      }

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            product: { connect: { id: item.productId } },
            quantityChanged: item.quantity,
            movementType: MovementType.OUT,
            reason: `Challan ${lockedChallan[0].challan_number} confirmed`,
            createdBy: { connect: { id: confirmedById } },
          },
        });
      }

      return tx.challan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: challanRepository.includeConfig,
      });
    });
  },

  async cancel(id: string) {
    const challan = await this.getById(id);
    // Kept deliberately simple: only DRAFT challans can be cancelled here.
    // A CONFIRMED challan has already reduced stock and created audit
    // records; reversing that needs its own "return/reversal" flow, which is
    // intentionally out of scope (see docs Known Limitations) rather than
    // half-implemented.
    if (challan.status !== ChallanStatus.DRAFT) {
      throw AppError.conflict('CHALLAN_NOT_CANCELLABLE', 'Only draft challans can be cancelled');
    }
    return prisma.challan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: challanRepository.includeConfig,
    });
  },

  async getStats() {
    const [draft, confirmed, recent] = await Promise.all([
      challanRepository.countByStatus(ChallanStatus.DRAFT),
      challanRepository.countByStatus(ChallanStatus.CONFIRMED),
      challanRepository.findRecent(5),
    ]);
    return { draft, confirmed, recent };
  },
};
