// src/controllers/purchaseOrder.controller.ts
import { Request, Response } from 'express';
import { findPurchaseOrders } from '../services/purchaseOrder.service';

export const getPurchaseOrdersHandler = async (req: Request, res: Response) => {
  try {
    // We will get these from the request query string, e.g., /api/pos?page=1&pageSize=25
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const searchTerm = req.query.searchTerm as string | undefined;

    const result = await findPurchaseOrders({ page, pageSize, searchTerm });
    
    // We'll return the data in a structured way that's easy for the frontend
    return res.status(200).json({
      data: result.purchaseOrders,
      pagination: {
        currentPage: result.page,
        pageSize: result.pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });

  } catch (error) {
    console.error("Error in getPurchaseOrdersHandler:", error);
    return res.status(500).json({ message: "Failed to fetch purchase orders." });
  }
};