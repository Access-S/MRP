// BLOCK 1: Imports
import { Router } from 'express';
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, updatePoStatus, deletePurchaseOrder } from '../controllers/purchaseOrder.controller';

// BLOCK 2: Router Definition (NO '/api' prefix)
const router = Router();
router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', createPurchaseOrder);
router.get('/purchase-orders/:poId', getPurchaseOrderById);
router.patch('/purchase-orders/:poId', updatePurchaseOrder);
router.patch('/purchase-orders/:poId/status', updatePoStatus);
router.delete('/purchase-orders/:poId', deletePurchaseOrder);

// BLOCK 3: Export
export default router;