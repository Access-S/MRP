// src/routes/purchaseOrder.routes.ts
import { Router } from 'express';
import { getPurchaseOrdersHandler } from '../controllers/purchaseOrder.controller';

const router = Router();

// Define the route: GET requests to / will be handled by our controller
router.get('/', getPurchaseOrdersHandler);

export default router;