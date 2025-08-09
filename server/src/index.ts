// src/index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';

// Initialize dotenv to load .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ===================================
// Middleware
// ===================================
// Enable CORS for all routes, allowing your frontend to connect
app.use(cors({
  origin: '*' // For development, we can allow all origins.
             // For production, you'd want to restrict this to your frontend's URL.
}));

// Enable the express.json middleware to parse JSON request bodies
app.use(express.json());


// ===================================
// API Routes
// ===================================
// Health check route to verify the server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy and responding!'
  });
});

app.use('/api/purchase-orders', purchaseOrderRoutes);


// ===================================
// Start Server
// ===================================
const HOST = '0.0.0.0'; // Listen on all available network interfaces

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server is listening on http://${HOST}:${PORT}`);
  console.log(`🔒 Your IDE should forward this port. Look for a "Ports" tab or a popup.`);
});