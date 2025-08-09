// src/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

// This prevents Prisma Client from being initialized too many times in development
// due to hot-reloading.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Optional: logs all queries to the console
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;