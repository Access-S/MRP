// BLOCK 1: Imports
import { Router } from 'express';
import { getPurchaseOrders, updatePoStatus, createPurchaseOrder } from '../controllers/purchaseOrder.controller';

// BLOCK 2: Router Definition
const router = Router();

router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', createPurchaseOrder);
router.patch('/purchase-orders/:poId/status', updatePoStatus);

// BLOCK 3: Export
export default router;