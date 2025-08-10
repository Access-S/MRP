import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase';
import './config/firebase';
import { migratePurchaseOrders } from './migrations/migrate-purchase-orders';

// --- ADD THIS IMPORT ---
import { migrateProducts } from './migrations/migrate-products';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/migrate-purchase-orders', migratePurchaseOrders);

// --- ROUTES ---

// Root health check
app.get('/', (req: Request, res: Response) => {
  res.send('MRP Backend is running!');
});

// Database connection test route
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({ message: 'Successfully connected to Supabase.', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to connect to Supabase.', error: error.message });
  }
});

// --- ADD THIS NEW MIGRATION ROUTE ---
app.get('/api/migrate-products', migrateProducts);


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on the port forwarded by your environment (e.g., http://localhost:${PORT})`);
});