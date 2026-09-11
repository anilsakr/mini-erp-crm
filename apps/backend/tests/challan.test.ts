import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import {
  resetDatabase,
  createUser,
  loginAs,
  createCategory,
  createWarehouse,
  createProduct,
  createCustomer,
} from './helpers';

describe('Sales challan module — the core business logic', () => {
  let salesToken: string;
  let salesUserId: string;
  let categoryId: string;
  let warehouseId: string;
  let customerId: string;

  beforeAll(async () => {
    await resetDatabase();
    const salesUser = await createUser('SALES', 'sales.challan@example.com');
    salesUserId = salesUser.id;
    salesToken = await loginAs('sales.challan@example.com');
    categoryId = (await createCategory('Challan Category')).id;
    warehouseId = (await createWarehouse('Challan Warehouse')).id;
    customerId = (await createCustomer(salesUserId, '9111111111')).id;
  });

  it('creating a DRAFT challan does NOT reduce stock (Rule 1)', async () => {
    const product = await createProduct({ sku: 'CH-DRAFT-1', categoryId, warehouseId, currentStock: 20 });

    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 5 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.challanNumber).toMatch(/^CH-\d{4}-\d{6}$/);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchanged.currentStock).toBe(20);
  });

  it('stores a product snapshot that does not change if the product is edited afterwards (Rule 4)', async () => {
    const product = await createProduct({
      sku: 'CH-SNAP-1',
      categoryId,
      warehouseId,
      currentStock: 20,
      unitPrice: 100,
      name: 'Original Name',
    });

    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 2 }] });

    // Rename and reprice the product AFTER the challan was created.
    await prisma.product.update({
      where: { id: product.id },
      data: { name: 'Renamed Product', unitPrice: 999 },
    });

    const challan = await request(app)
      .get(`/api/challans/${created.body.data.id}`)
      .set('Authorization', `Bearer ${salesToken}`);

    const item = challan.body.data.items[0];
    expect(item.productNameSnapshot).toBe('Original Name');
    expect(Number(item.unitPriceSnapshot)).toBe(100);
  });

  it('confirming a challan reduces stock atomically and records an OUT movement (Rule 2)', async () => {
    const product = await createProduct({ sku: 'CH-CONFIRM-1', categoryId, warehouseId, currentStock: 20 });

    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 8 }] });
    const challanId = created.body.data.id;

    const confirmed = await request(app)
      .post(`/api/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('CONFIRMED');

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.currentStock).toBe(12);

    const movements = await prisma.stockMovement.findMany({ where: { productId: product.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].movementType).toBe('OUT');
    expect(movements[0].quantityChanged).toBe(8);
  });

  it('rejects confirmation when stock is insufficient and leaves ALL stock untouched (Rule 3, no partial update)', async () => {
    const sufficientProduct = await createProduct({ sku: 'CH-PARTIAL-OK', categoryId, warehouseId, currentStock: 50 });
    const shortProduct = await createProduct({ sku: 'CH-PARTIAL-SHORT', categoryId, warehouseId, currentStock: 2 });

    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        items: [
          { productId: sufficientProduct.id, quantity: 5 },
          { productId: shortProduct.id, quantity: 10 },
        ],
      });

    const res = await request(app)
      .post(`/api/challans/${created.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.message).toContain('CH-PARTIAL-SHORT');
    expect(res.body.message).toContain('Available: 2, Requested: 10');

    // The item that DID have enough stock must be untouched too — an
    // all-or-nothing transaction, not a partial fulfillment.
    const untouchedSufficient = await prisma.product.findUniqueOrThrow({ where: { id: sufficientProduct.id } });
    expect(untouchedSufficient.currentStock).toBe(50);
    const untouchedShort = await prisma.product.findUniqueOrThrow({ where: { id: shortProduct.id } });
    expect(untouchedShort.currentStock).toBe(2);

    const stillDraft = await prisma.challan.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stillDraft.status).toBe('DRAFT');
  });

  it('never allows stock to go negative', async () => {
    const product = await createProduct({ sku: 'CH-NEGATIVE-1', categoryId, warehouseId, currentStock: 3 });
    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 4 }] });

    await request(app).post(`/api/challans/${created.body.data.id}/confirm`).set('Authorization', `Bearer ${salesToken}`);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchanged.currentStock).toBeGreaterThanOrEqual(0);
    expect(unchanged.currentStock).toBe(3);
  });

  it('cannot confirm the same challan twice', async () => {
    const product = await createProduct({ sku: 'CH-DOUBLE-1', categoryId, warehouseId, currentStock: 20 });
    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 2 }] });
    const challanId = created.body.data.id;

    const first = await request(app).post(`/api/challans/${challanId}/confirm`).set('Authorization', `Bearer ${salesToken}`);
    expect(first.status).toBe(200);

    const second = await request(app).post(`/api/challans/${challanId}/confirm`).set('Authorization', `Bearer ${salesToken}`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CHALLAN_NOT_DRAFT');

    // Confirming twice must not double-deduct stock.
    const productAfter = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(productAfter.currentStock).toBe(18);
  });

  it('only a draft challan can be cancelled', async () => {
    const product = await createProduct({ sku: 'CH-CANCEL-1', categoryId, warehouseId, currentStock: 10 });
    const created = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: product.id, quantity: 1 }] });

    await request(app).post(`/api/challans/${created.body.data.id}/confirm`).set('Authorization', `Bearer ${salesToken}`);

    const cancelAfterConfirm = await request(app)
      .post(`/api/challans/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(cancelAfterConfirm.status).toBe(409);

    const draftProduct = await createProduct({ sku: 'CH-CANCEL-2', categoryId, warehouseId, currentStock: 10 });
    const draftChallan = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId: draftProduct.id, quantity: 1 }] });

    const cancelDraft = await request(app)
      .post(`/api/challans/${draftChallan.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(cancelDraft.status).toBe(200);
    expect(cancelDraft.body.data.status).toBe('CANCELLED');
  });
});
