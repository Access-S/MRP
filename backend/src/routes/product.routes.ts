// BLOCK 1: Imports
import { Router } from 'express';
import { getAllProducts } from '../controllers/product.controller';

// BLOCK 2: Router Definition
const router = Router();
router.get('/products', getAllProducts);

// BLOCK 3: Export
export default router;