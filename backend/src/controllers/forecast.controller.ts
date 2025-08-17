// src/controllers/forecast.controller.ts

// BLOCK 1: Imports and Dependencies
import { Request, Response } from 'express';
import xlsx from 'xlsx';
import { supabase } from '../config/supabase';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import { createError } from '../middleware/errorHandler';

// BLOCK 2: `uploadForecasts` Controller (IMPROVED HEADER DETECTION)
export const uploadForecasts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw createError('No file uploaded.', 400);
  }

  logger.info('Starting forecast file processing...');
  
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

  // More robust header finding logic
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) { // Scan first 10 rows
      const row = data[i];
      if (row && Array.isArray(row)) {
          // Check for the presence of our "anchor" columns
          const hasProduct = row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('product'));
          const hasDescription = row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('description'));
          const hasDate = row.some(cell => typeof cell === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(cell));

          // If we find at least two of these, we're confident it's the header row.
          if ((hasProduct && hasDescription) || (hasProduct && hasDate)) {
              headerRowIndex = i;
              break; // Stop searching once found
          }
      }
  }

  if (headerRowIndex === -1) {
    throw createError('Could not find a valid header row. Ensure the file contains columns for "Product" and "Description" or month columns (e.g., Aug-25).', 400);
  }

  const headers = data[headerRowIndex].map(h => h ? String(h).trim() : null);
  const dataRows = data.slice(headerRowIndex + 1);
  
  logger.info({ message: `Found headers at row ${headerRowIndex + 1}`, headers: headers });

  const { error: deleteError } = await supabase.from('forecasts').delete().neq('product_code', '---');
  if (deleteError) {
    logger.error('Supabase error deleting old forecasts', { error: deleteError });
    throw createError('Failed to clear old forecast data.', 500);
  }
  
  const forecastsToInsert: { 
    product_code: string; description: string; forecast_date: string; quantity: number 
  }[] = [];
  
  // Find column indexes using a case-insensitive search
  const productCodeIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('product'));
  const descriptionIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('description'));

  if (productCodeIndex === -1) {
    throw createError("The identified header row is missing a 'Product' column.", 400);
  }

  dataRows.forEach((row) => {
    const productCode = row[productCodeIndex] ? String(row[productCodeIndex]).trim() : null;
    const description = descriptionIndex !== -1 && row[descriptionIndex] ? String(row[descriptionIndex]).trim() : '';
    
    if (productCode) {
      headers.forEach((header, colIndex) => {
        if (typeof header === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(header)) {
          const quantityValue = row[colIndex];
          const quantity = (quantityValue !== null && !isNaN(Number(quantityValue))) ? Number(quantityValue) : 0;
          
          try {
            const [monthStr, yearStr] = header.split('-');
            const month = new Date(Date.parse(monthStr + " 1, 2012")).getMonth();
            const year = 2000 + parseInt(yearStr, 10);
            const forecastDate = new Date(Date.UTC(year, month, 1)).toISOString();
            
            forecastsToInsert.push({
              product_code: productCode,
              description: description,
              forecast_date: forecastDate,
              quantity: quantity
            });
          } catch (dateError) {
            logger.warn(`Could not parse date from header: "${header}". Skipping column.`);
          }
        }
      });
    }
  });
  
  logger.info(`Found ${forecastsToInsert.length} valid forecast entries to insert.`);

  if (forecastsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('forecasts').insert(forecastsToInsert);
    if (insertError) {
      logger.error('Supabase error inserting new forecasts.', { error: insertError });
      throw createError('Failed to insert new forecast data.', 500);
    }
  }

  res.status(201).json({ 
    success: true,
    message: `Forecast data imported successfully. ${forecastsToInsert.length} forecast entries created.` 
  });
});
// BLOCK 3: `getForecasts` Controller
export const getForecasts = asyncHandler(async (req: Request, res: Response) => {
  const { months, search } = req.query;
  logger.info(`Fetching forecasts with filters: months=${months}, search=${search}`);

  let query = supabase
    .from('forecasts')
    .select('product_code, description, quantity, forecast_date')
    .order('forecast_date', { ascending: true });

  if (months && months !== 'all') {
    const numMonths = parseInt(months as string, 10);
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + numMonths, 0).toISOString().split('T')[0];
    query = query.gte('forecast_date', startDate).lte('forecast_date', endDate);
  }

  // UPDATED: Search logic now checks both product_code and description.
  if (search) {
    const searchTerm = `%${search}%`;
    query = query.or(`product_code.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  const { data, error } = await query;
  if (error) {
    logger.error('Supabase error fetching forecasts', { error });
    throw createError('Failed to fetch forecast records from database', 500);
  }

  const productData: { [key: string]: any } = {};
  data.forEach(item => {
    const { product_code, description, quantity, forecast_date } = item;
    const dateKey = forecast_date.substring(0, 7);
    if (!productData[product_code]) {
      productData[product_code] = { product_code, description };
    }
    productData[product_code][dateKey] = quantity;
  });
  const rows = Object.values(productData);
  
  const dateHeaders = [...new Set(data.map(item => item.forecast_date.substring(0, 7)))].sort();
  const staticHeaders = [{ key: 'product_code', label: 'Product Code' }, { key: 'description', label: 'Description' }];
  const dynamicHeaders = dateHeaders.map(dateKey => {
    const [year, month] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const label = date.toLocaleString('default', { month: 'short' }) + '-' + year.substring(2);
    return { key: dateKey, label: label };
  });
  const headers = [...staticHeaders, ...dynamicHeaders];

  logger.info(`Successfully fetched and processed ${rows.length} forecast products.`);
  
  res.status(200).json({
    success: true,
    tableData: { headers, rows }
  });
});
// BLOCK 4: `getRawForecasts` Controller (NEW)
// This endpoint is specifically for the MRP engine. It returns data
// grouped by product, which is ideal for calculations.
export const getRawForecasts = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching raw, grouped forecasts for MRP engine...');

  const { data, error } = await supabase
    .from('forecasts')
    .select('product_code, description, quantity, forecast_date')
    .order('forecast_date', { ascending: true });

  if (error) {
    logger.error('Supabase error fetching raw forecasts', { error });
    throw createError('Failed to fetch forecast records for MRP', 500);
  }

  // Group the flat data into the structure the MRP service expects
  const productForecasts: { [key: string]: { 
    productCode: string; 
    description: string; 
    monthlyForecast: { [month: string]: number } 
  }} = {};

  data.forEach(item => {
    const { product_code, description, quantity, forecast_date } = item;
    const monthKey = forecast_date.substring(0, 7); // Format: "YYYY-MM"

    if (!productForecasts[product_code]) {
      productForecasts[product_code] = {
        productCode: product_code,
        description: description,
        monthlyForecast: {}
      };
    }
    productForecasts[product_code].monthlyForecast[monthKey] = quantity;
  });

  const forecastsArray = Object.values(productForecasts);

  logger.info(`Successfully processed raw forecasts for ${forecastsArray.length} products.`);
  
  res.status(200).json({
    success: true,
    data: forecastsArray
  });
});
// BLOCK 5: `deleteAllForecasts` Controller (NEW)
export const deleteAllForecasts = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Attempting to delete all forecast records...');

  const { error } = await supabase
    .from('forecasts')
    .delete()
    .neq('product_code', '---'); // A safe delete condition to affect all rows

  if (error) {
    logger.error('Supabase error deleting all forecasts', { error });
    throw createError('Failed to delete all forecast data. Check table permissions and RLS.', 500);
  }

  logger.info('Successfully deleted all forecast records.');

  res.status(200).json({
    success: true,
    message: 'All forecast data has been successfully deleted.'
  });
});