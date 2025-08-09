// src/services/purchaseOrder.service.ts
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

interface FindPurchaseOrdersInput {
  page: number;
  pageSize: number;
  searchTerm?: string;
}

export const findPurchaseOrders = async ({ page, pageSize, searchTerm }: FindPurchaseOrdersInput) => {
  const skip = (page - 1) * pageSize;
  
  // This is the Prisma query structure. We build it dynamically.
  let where: Prisma.PurchaseOrderWhereInput = {};

  if (searchTerm && searchTerm.trim() !== '') {
    // This is our powerful "any substring" search!
    // It will search across the PO number and the related product's description.
    where = {
      OR: [
        { poNumber: { contains: searchTerm, mode: 'insensitive' } },
        { product: { description: { contains: searchTerm, mode: 'insensitive' } } },
        { product: { productCode: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    };
  }

  // We run two queries in parallel: one to get the data for the current page,
  // and one to get the total count for pagination.
  const [purchaseOrders, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        sequence: 'desc', // Or any other field you want to sort by
      },
      // This is the SERVER-SIDE JOIN!
      // We are including the related product data in the same query.
      include: {
        product: {
          select: {
            productCode: true,
            description: true,
            minsPerShipper: true,
          },
        },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { purchaseOrders, total, page, pageSize };
};