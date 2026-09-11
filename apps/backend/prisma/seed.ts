import { PrismaClient, CustomerStatus, CustomerType, MovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Demo-only passwords — documented in the README under "Demo Credentials".
// Never use fixed, published passwords like this in a real deployment.
const DEMO_PASSWORD = 'Password123!';

async function nextChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('challan_number_seq')`;
  return `CH-${year}-${result[0].nextval.toString().padStart(6, '0')}`;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin, sales, warehouseUser, accounts] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { email: 'admin@example.com', name: 'Ava Admin', role: 'ADMIN', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'sales@example.com' },
      update: {},
      create: { email: 'sales@example.com', name: 'Sam Sales', role: 'SALES', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@example.com' },
      update: {},
      create: { email: 'warehouse@example.com', name: 'Wendy Warehouse', role: 'WAREHOUSE', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'accounts@example.com' },
      update: {},
      create: { email: 'accounts@example.com', name: 'Alex Accounts', role: 'ACCOUNTS', passwordHash },
    }),
  ]);

  const categoryNames = ['Electronics', 'Stationery', 'Hardware', 'Packaging'];
  const categories = await Promise.all(
    categoryNames.map((name) => prisma.category.upsert({ where: { name }, update: {}, create: { name } })),
  );
  const [electronics, stationery, hardware, packaging] = categories;

  const warehouseSeed = [
    { name: 'Main Warehouse', location: 'Mumbai' },
    { name: 'Secondary Warehouse', location: 'Pune' },
  ];
  const warehouses = [];
  for (const w of warehouseSeed) {
    const existing = await prisma.warehouse.findFirst({ where: { name: w.name } });
    warehouses.push(existing ?? (await prisma.warehouse.create({ data: w })));
  }
  const [mainWarehouse, secondaryWarehouse] = warehouses;

  const productSeed = [
    { name: 'USB-C Cable 1m', sku: 'ELEC-001', categoryId: electronics.id, unitPrice: 149.0, currentStock: 200, minStockAlert: 50, warehouseId: mainWarehouse.id },
    { name: 'Wireless Mouse', sku: 'ELEC-002', categoryId: electronics.id, unitPrice: 599.0, currentStock: 8, minStockAlert: 10, warehouseId: mainWarehouse.id },
    { name: 'A4 Notebook (200pg)', sku: 'STAT-001', categoryId: stationery.id, unitPrice: 65.0, currentStock: 500, minStockAlert: 100, warehouseId: secondaryWarehouse.id },
    { name: 'Ballpoint Pen (Box of 10)', sku: 'STAT-002', categoryId: stationery.id, unitPrice: 45.0, currentStock: 300, minStockAlert: 60, warehouseId: secondaryWarehouse.id },
    { name: 'Hex Bolt M8 (Pack of 50)', sku: 'HARD-001', categoryId: hardware.id, unitPrice: 220.0, currentStock: 40, minStockAlert: 50, warehouseId: mainWarehouse.id },
    { name: 'Cardboard Box (Medium)', sku: 'PACK-001', categoryId: packaging.id, unitPrice: 18.5, currentStock: 25, minStockAlert: 30, warehouseId: mainWarehouse.id },
  ];

  const products = [];
  for (const p of productSeed) {
    products.push(await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p }));
  }
  const [usbCable, mouse, notebook, pens] = products;

  const customerSeed = [
    { name: 'Rohan Mehta', mobile: '9820011223', email: 'rohan@northstartraders.in', businessName: 'Northstar Traders', gstNumber: '27ABCDE1234F1Z5', customerType: CustomerType.WHOLESALE, address: 'Andheri East, Mumbai', status: CustomerStatus.ACTIVE, notes: 'Regular bulk buyer of electronics' },
    { name: 'Priya Shah', mobile: '9911223344', email: 'priya@shahstationers.in', businessName: 'Shah Stationers', gstNumber: null, customerType: CustomerType.RETAIL, address: 'FC Road, Pune', status: CustomerStatus.ACTIVE, notes: null },
    { name: 'Karan Distributors', mobile: '9000112233', email: 'karan@karandist.in', businessName: 'Karan Distribution Co.', gstNumber: '27KARAN1234F1Z9', customerType: CustomerType.DISTRIBUTOR, address: 'MIDC, Nashik', status: CustomerStatus.ACTIVE, notes: 'Distributor for western Maharashtra' },
    { name: 'Meera Gupta', mobile: '9823456789', email: null, businessName: 'Gupta Hardware', gstNumber: null, customerType: CustomerType.RETAIL, address: 'Camp, Pune', status: CustomerStatus.LEAD, followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), notes: 'Interested in hardware bulk pricing' },
    { name: 'Old Traders Co', mobile: '9812340000', email: null, businessName: 'Old Traders', gstNumber: null, customerType: CustomerType.WHOLESALE, address: 'Dadar, Mumbai', status: CustomerStatus.INACTIVE, notes: 'No orders in 6 months' },
  ];

  const customers = [];
  for (const c of customerSeed) {
    const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
    customers.push(
      existing ??
        (await prisma.customer.create({
          data: { ...c, createdBy: { connect: { id: sales.id } } },
        })),
    );
  }
  const [northstar, shahStationers, karanDist, meeraGupta] = customers;

  await prisma.customerFollowUp.createMany({
    data: [
      { customerId: northstar.id, note: 'Called to confirm quarterly order quantities.', createdById: sales.id },
      { customerId: meeraGupta.id, note: 'Sent hardware catalog and price list over email.', followUpDate: meeraGupta.followUpDate, createdById: sales.id },
    ],
    skipDuplicates: true,
  });

  // A DRAFT challan: created but never confirmed, so it must NOT have
  // affected stock. Useful for the recruiter demo (Rule 1 proof).
  const draftExists = await prisma.challan.findFirst({ where: { customerId: shahStationers.id, status: ChallanStatus.DRAFT } });
  if (!draftExists) {
    await prisma.challan.create({
      data: {
        challanNumber: await nextChallanNumber(),
        customerId: shahStationers.id,
        status: ChallanStatus.DRAFT,
        totalQuantity: 20,
        totalAmount: 20 * Number(notebook.unitPrice),
        createdById: sales.id,
        items: {
          create: [
            {
              productId: notebook.id,
              productNameSnapshot: notebook.name,
              skuSnapshot: notebook.sku,
              unitPriceSnapshot: notebook.unitPrice,
              quantity: 20,
              lineTotal: 20 * Number(notebook.unitPrice),
            },
          ],
        },
      },
    });
  }

  // A CONFIRMED challan: current_stock below already reflects this sale, and
  // a matching OUT stock movement exists — this is what "auditable stock"
  // looks like in the seed data (Rule 2 proof: stock + movement + status all
  // agree with each other).
  const confirmedExists = await prisma.challan.findFirst({ where: { customerId: northstar.id, status: ChallanStatus.CONFIRMED } });
  if (!confirmedExists) {
    const quantity = 15;
    await prisma.$transaction([
      prisma.challan.create({
        data: {
          challanNumber: await nextChallanNumber(),
          customerId: northstar.id,
          status: ChallanStatus.CONFIRMED,
          totalQuantity: quantity,
          totalAmount: quantity * Number(usbCable.unitPrice),
          createdById: sales.id,
          items: {
            create: [
              {
                productId: usbCable.id,
                productNameSnapshot: usbCable.name,
                skuSnapshot: usbCable.sku,
                unitPriceSnapshot: usbCable.unitPrice,
                quantity,
                lineTotal: quantity * Number(usbCable.unitPrice),
              },
            ],
          },
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: usbCable.id,
          quantityChanged: quantity,
          movementType: MovementType.OUT,
          reason: 'Seed data: confirmed challan',
          createdById: sales.id,
        },
      }),
    ]);
    // usbCable.currentStock (200) already accounts for this sale in the
    // productSeed values above, so no further stock update is needed here.
  }

  // A couple of IN movements for warehouse-side audit history.
  await prisma.stockMovement.createMany({
    data: [
      { productId: mouse.id, quantityChanged: 8, movementType: MovementType.IN, reason: 'Initial stock intake', createdById: warehouseUser.id },
      { productId: pens.id, quantityChanged: 300, movementType: MovementType.IN, reason: 'Initial stock intake', createdById: warehouseUser.id },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete. Demo users (password for all: %s):', DEMO_PASSWORD);
  console.log([admin, sales, warehouseUser, accounts].map((u) => `${u.role}: ${u.email}`).join('\n'));
  console.log('Low-stock demo products: ELEC-002 (Wireless Mouse), HARD-001, PACK-001 — try selling more than available on these.');
  void karanDist;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
