// BLOCK 1: Imports
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import productRoutes from './routes/product.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
import sohRoutes from './routes/soh.routes';
import forecastRoutes from './routes/forecast.routes';
// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import Supabase to initialize connection
import './config/supabase';

dotenv.config();

// BLOCK 2: App Configuration
const app = express();
const PORT = process.env.PORT || 3001;

// Bulletproof CORS configuration for Codespaces
app.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Allow any GitHub Codespaces origin or localhost
  if (origin && (
    origin.includes('.app.github.dev') || 
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to wildcard for development
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Add request logging to debug CORS issues
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

app.use(express.json());

// Trust proxy for Railway
app.set('trust proxy', 1);
// BLOCK 3: Health Check Routes
app.get('/', (req, res) => {
  res.json({
    message: 'MRP System API - Powered by Supabase',
    version: '1.0.0',
    status: 'running',
    database: 'Supabase',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'Supabase'
  });
});

// BLOCK 4: API Routes
app.use('/api/products', productRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/soh', sohRoutes);
app.use('/api/forecasts', forecastRoutes);

// BLOCK 5: Error Handling and Server Start
// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🗄️  Database: Supabase`);
});

export default app;