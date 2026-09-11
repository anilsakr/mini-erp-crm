import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { resetDatabase, createUser, loginAs, createCategory, createWarehouse } from './helpers';

describe('Product and inventory module', () => {
  let warehouseToken: string;
  let salesToken: string;
  let categoryId: string;
  let warehouseId: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('WAREHOUSE', 'warehouse.product@example.com');
    await createUser('SALES', 'sales.product@example.com');
    warehouseToken = await loginAs('warehouse.product@example.com');
    salesToken = await loginAs('sales.product@example.com');
    categoryId = (await createCategory('Test Category')).id;
    warehouseId = (await createWarehouse('Test Warehouse')).id;
  });

  it('creates a product as WAREHOUSE', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: 'Test Product',
        sku: 'TEST-SKU-1',
        categoryId,
        warehouseId,
        unitPrice: 50,
        currentStock: 20,
        minStockAlert: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('TEST-SKU-1');
  });

  it('rejects a duplicate SKU', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: 'Duplicate SKU Product',
        sku: 'TEST-SKU-1',
        categoryId,
        warehouseId,
        unitPrice: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('rejects a SALES user creating a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ name: 'x', sku: 'TEST-SKU-2', categoryId, warehouseId, unitPrice: 1 });

    expect(res.status).toBe(403);
  });

  it('rejects a negative unit price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: 'Bad Price', sku: 'TEST-SKU-3', categoryId, warehouseId, unitPrice: -5 });

    expect(res.status).toBe(400);
  });
});
