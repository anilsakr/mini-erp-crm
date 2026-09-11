import bcrypt from 'bcrypt';
import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

export const TEST_PASSWORD = 'Password123!';

export async function resetDatabase() {
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.customerFollowUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(role: Role, email: string) {
  // bcrypt cost factor 4 keeps the test suite fast; production uses the
  // library default (10) via bcrypt.hash(password, 10) in the seed script.
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return prisma.user.create({ data: { email, name: `Test ${role}`, role, passwordHash } });
}

export async function loginAs(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
  return res.body.data.token;
}

export async function createCategory(name: string) {
  return prisma.category.create({ data: { name } });
}

export async function createWarehouse(name: string) {
  return prisma.warehouse.create({ data: { name, location: 'Test Location' } });
}

export async function createProduct(overrides: {
  sku: string;
  categoryId: string;
  warehouseId: string;
  currentStock?: number;
  unitPrice?: number;
  minStockAlert?: number;
  name?: string;
}) {
  return prisma.product.create({
    data: {
      name: overrides.name ?? `Product ${overrides.sku}`,
      sku: overrides.sku,
      categoryId: overrides.categoryId,
      warehouseId: overrides.warehouseId,
      unitPrice: overrides.unitPrice ?? 100,
      currentStock: overrides.currentStock ?? 10,
      minStockAlert: overrides.minStockAlert ?? 0,
    },
  });
}

export async function createCustomer(createdById: string, mobile: string) {
  return prisma.customer.create({
    data: {
      name: `Customer ${mobile}`,
      mobile,
      businessName: 'Test Business',
      customerType: 'RETAIL',
      address: 'Test Address',
      createdById,
    },
  });
}
