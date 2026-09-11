import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { resetDatabase, createUser, loginAs } from './helpers';

describe('Customer CRM module', () => {
  let salesToken: string;
  let accountsToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('SALES', 'sales.customer@example.com');
    await createUser('ACCOUNTS', 'accounts.customer@example.com');
    salesToken = await loginAs('sales.customer@example.com');
    accountsToken = await loginAs('accounts.customer@example.com');
  });

  it('creates a customer with valid data', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Test Customer',
        mobile: '9876543210',
        businessName: 'Test Biz',
        customerType: 'RETAIL',
        address: '123 Test Street',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('LEAD');
  });

  it('rejects a customer with no name (validation)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ mobile: '9876543210', businessName: 'Test Biz', customerType: 'RETAIL', address: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an ACCOUNTS user creating a customer (read-only role)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${accountsToken}`)
      .send({ name: 'x', mobile: '9876543210', businessName: 'x', customerType: 'RETAIL', address: 'x' });

    expect(res.status).toBe(403);
  });

  it('adds follow-ups as an append-only history instead of overwriting notes', async () => {
    const created = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Follow Up Customer',
        mobile: '9000000001',
        businessName: 'Biz',
        customerType: 'WHOLESALE',
        address: 'Addr',
      });
    const customerId = created.body.data.id;

    await request(app)
      .post(`/api/customers/${customerId}/follow-ups`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ note: 'First call' });
    await request(app)
      .post(`/api/customers/${customerId}/follow-ups`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ note: 'Second call' });

    const detail = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(detail.body.data.followUps).toHaveLength(2);
    expect(detail.body.data.followUps.map((f: { note: string }) => f.note)).toEqual(
      expect.arrayContaining(['First call', 'Second call']),
    );
  });
});
