// BLOCK 1: Imports
import { Router } from 'express';
import { getAllProducts, getBomForProduct } from '../controllers/product.controller';

// BLOCK 2: Router Definition (NO '/api' prefix)
const router = Router();
router.get('/products', getAllProducts);
router.get('/products/:productId/bom', getBomForProduct);

// BLOCK 3: Export
export default router;