// BLOCK 1: Imports
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
import productRoutes from './routes/product.routes';
import './config/firebase';
import { migrateProducts } from './migrations/migrate-products';
import { migratePurchaseOrders } from './migrations/migrate-purchase-orders';

// BLOCK 2: Setup
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// BLOCK 3: Middleware
app.use(cors()); // A simple cors() is all that's needed now.
app.use(express.json());

// BLOCK 4: API Routes (NO '/api' prefix)
app.use(purchaseOrderRoutes);
app.use(productRoutes);

// BLOCK 5: Migration & Test Routes
app.get('/api/migrate-products', migrateProducts);
app.get('/api/migrate-purchase-orders', migratePurchaseOrders);

// BLOCK 6: Root Health Check and Server Start
app.get('/', (req, res) => res.send('MRP Backend is running!'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});