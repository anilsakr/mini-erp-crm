import { PrismaClient } from '@prisma/client';

// A single shared PrismaClient instance per process. Prisma manages its own
// connection pool internally, so creating more than one client per process
// would just create redundant pools.
export const prisma = new PrismaClient();
