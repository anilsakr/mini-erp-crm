import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { resetDatabase, createUser, TEST_PASSWORD } from './helpers';

describe('Authentication and authorization', () => {
  beforeAll(async () => {
    await resetDatabase();
    await createUser('SALES', 'sales.auth@example.com');
  });

  it('logs in with correct credentials and returns a role-bearing JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales.auth@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('SALES');
  });

  it('rejects an incorrect password without revealing whether the email exists', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales.auth@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects a login attempt for an email that does not exist, with the same message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects access to a protected route with no token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('rejects access to a protected route with a malformed token', async () => {
    const res = await request(app).get('/api/customers').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('enforces role authorization: a SALES user cannot create a product', async () => {
    const token = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales.auth@example.com', password: TEST_PASSWORD })
      .then((res) => res.body.data.token);

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should not be created' });

    expect(res.status).toBe(403);
  });
});
