// backend/src/controllers/product.controller.ts

// BLOCK 1: Imports and Dependencies
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { createError } from '../middleware/errorHandler';

// BLOCK 2: Get All Products Controller
export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching all products');

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('product_code', { ascending: true });

  if (error) {
    logger.error('Supabase error fetching products', { error });
    throw createError('Failed to fetch product records from database', 500);
  }

  logger.info(`Successfully fetched ${data?.length || 0} products`);

  res.status(200).json({
    success: true,
    data: data || [],
  });
});

// BLOCK 3: Get Enriched BOM Controller
export const getEnrichedBom = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  if (!productId) throw createError('Product ID is required', 400);

  logger.info(`Fetching enriched BOM for product ID: ${productId}`);

  // 1. Fetch the basic product details (including the real daily_run_rate)
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, product_code, description, units_per_shipper, mins_per_shipper, hourly_run_rate, daily_run_rate, price_per_shipper')
    .eq('id', productId)
    .single();

  if (productError || !product) throw createError('Product not found', 404);

  // 2. Fetch the BOM components for the product
  const { data: bom, error: bomError } = await supabase
    .from('bom_components')
    .select('*')
    .eq('product_id', productId);

  if (bomError) throw createError('Failed to fetch BOM components', 500);

  // 3. Fetch PO statistics for this product's SKU
  const { count: openPoCount, error: openPoError } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('product_code', product.product_code)
    .neq('status', 'Completed');

  const { count: dispatchedPoCount, error: dispatchedPoError } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('product_code', product.product_code)
    .eq('status', 'Dispatched');

  if (openPoError || dispatchedPoError) {
    logger.warn('Could not fetch PO stats for product', { product_code: product.product_code });
  }
  
  // 4. Combine all data into a single response object (NO CALCULATION)
  const responseData = {
    productDetails: product, // Pass the product details through directly
    bomComponents: bom || [],
    poStats: {
      openPoCount: openPoCount || 0,
      dispatchedPoCount: dispatchedPoCount || 0,
    }
  };

  res.status(200).json({
    success: true,
    data: responseData,
  });
});

// BLOCK 4: Get Simple BOM for Product Controller
export const getBomForProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  
  logger.info(`Received request for simple BOM with productId: ${productId}`);

  if (!productId) throw createError('Product ID is required', 400);

  logger.info(`Fetching simple BOM components for product ID: ${productId}`);

  const { data: bom, error: bomError } = await supabase
    .from('bom_components')
    .select('*')
    .eq('product_id', productId);

  if (bomError) {
    logger.error('Supabase error fetching BOM components', { bomError });
    throw createError('Failed to fetch BOM components', 500);
  }

  logger.info(`Query returned ${bom?.length || 0} BOM components for productId: ${productId}`);

  res.status(200).json({
    success: true,
    data: bom || [],
  });
});
// BLOCK 5: Get All BOM Components Controller
export const getAllBomComponents = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching all BOM components for MRP engine');

  const { data, error } = await supabase
    .from('bom_components')
    .select('*');

  if (error) {
    logger.error('Supabase error fetching all BOM components', { error });
    throw createError('Failed to fetch BOM components', 500);
  }

  res.status(200).json({
    success: true,
    data: data || [],
  });
});