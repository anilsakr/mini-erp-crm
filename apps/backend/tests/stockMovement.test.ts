import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import {
  resetDatabase,
  createUser,
  loginAs,
  createCategory,
  createWarehouse,
  createProduct,
} from './helpers';

describe('Stock movement module', () => {
  let warehouseToken: string;
  let categoryId: string;
  let warehouseId: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('WAREHOUSE', 'warehouse.stock@example.com');
    warehouseToken = await loginAs('warehouse.stock@example.com');
    categoryId = (await createCategory('Stock Category')).id;
    warehouseId = (await createWarehouse('Stock Warehouse')).id;
  });

  it('an IN movement increases stock and is recorded in the audit log', async () => {
    const product = await createProduct({ sku: 'STOCK-IN-1', categoryId, warehouseId, currentStock: 10 });

    const res = await request(app)
      .post('/api/stock-movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ productId: product.id, quantityChanged: 5, movementType: 'IN', reason: 'Restock' });

    expect(res.status).toBe(201);

    const updated = await request(app)
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(updated.body.data.currentStock).toBe(15);

    const history = await request(app)
      .get(`/api/products/${product.id}/stock-movements`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].movementType).toBe('IN');
  });

  it('an OUT movement larger than available stock is rejected and stock is unchanged', async () => {
    const product = await createProduct({ sku: 'STOCK-OUT-1', categoryId, warehouseId, currentStock: 3 });

    const res = await request(app)
      .post('/api/stock-movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ productId: product.id, quantityChanged: 10, movementType: 'OUT', reason: 'Manual correction' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    const updated = await request(app)
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(updated.body.data.currentStock).toBe(3);
  });
});
