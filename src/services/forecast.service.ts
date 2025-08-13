// BLOCK 1: Imports
import { supabase } from "../supabase.config";
import { handleApiError } from "./api.service";
import * as XLSX from "xlsx";
import { Forecast } from "../types/mrp.types";

// BLOCK 2: Forecast Service Class
class ForecastService {

  /**
   * Parses a month header (e.g., "Jul-25") into a "YYYY-MM" format
   * @param header - The string header to parse
   * @returns A formatted string like "2025-07" or null if invalid
   */
  private parseMonthHeader(header: string): string | null {
    if (typeof header !== "string") return null;
    const parts = header.trim().split("-");
    if (parts.length !== 2) return null;

    const monthMap: { [key: string]: string } = {
      jan: "01", feb: "02", mar: "03", apr: "04",
      may: "05", jun: "06", jul: "07", aug: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };

    const month = monthMap[parts[0].toLowerCase()];
    // Handle both '25' and '2025' year formats
    const yearPart = parts[1];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

    if (!month || isNaN(parseInt(year))) return null;

    return `${year}-${month}`;
  }

  /**
   * Imports forecast data from Excel file to Supabase
   * @param file - Excel file to import
   * @returns Promise<{successCount: number, errorCount: number, errors: string[]}>
   */
  async importForecastData(file: File): Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    try {
      console.log('📊 Starting forecast import...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Get the full range of the sheet
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

      // Modify the range to start from the second row (index 1)
      range.s.r = 1; // s = start, r = row. Row 1 is the second row.

      // Convert the sheet to JSON using our new, specific range
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: "mmm-yy",
        range: range,
      });

      console.log("Parsed JSON data:", jsonData);

      if (!jsonData || jsonData.length === 0) {
        throw new Error("No data found in the Excel file after the header row.");
      }

      const headers = Object.keys(jsonData[0]);
      const productCodeHeader = headers.find(
        (h) => h.toLowerCase().trim() === "product"
      );
      const descriptionHeader = headers.find(
        (h) => h.toLowerCase().trim() === "description"
      );

      if (!productCodeHeader) {
        throw new Error(
          "Could not find a 'Product' column in the file. Please ensure the header row is correct."
        );
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const batchSize = 50; // Process in smaller batches for better performance

      // Process data in batches
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const batch = jsonData.slice(i, i + batchSize);
        const validRecords: any[] = [];

        batch.forEach((row, index) => {
          try {
            const productCode = row[productCodeHeader];
            if (!productCode || String(productCode).trim() === "") {
              errorCount++;
              errors.push(`Row ${i + index + 2}: Missing product code`);
              return;
            }

            const description = descriptionHeader ? row[descriptionHeader] : "N/A";
            const monthlyForecast: { [key: string]: number } = {};

            // Parse monthly forecast data
            for (const key in row) {
              const formattedMonth = this.parseMonthHeader(key);
              if (formattedMonth) {
                const value = Number(row[key]) || 0;
                monthlyForecast[formattedMonth] = value;
              }
            }

            validRecords.push({
              product_code: String(productCode).trim(),
              description: String(description),
              monthly_forecast: monthlyForecast,
              updated_at: new Date().toISOString()
            });

          } catch (error) {
            errorCount++;
            errors.push(`Row ${i + index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        // Insert/update valid records using upsert
        if (validRecords.length > 0) {
          const { error } = await supabase
            .from('forecasts')
            .upsert(validRecords, { 
              onConflict: 'product_code',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Batch insert error:', error);
            errorCount += validRecords.length;
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            successCount += validRecords.length;
          }
        }
      }

      console.log(`✅ Forecast import completed: ${successCount} success, ${errorCount} errors`);
      
      return { 
        successCount, 
        errorCount, 
        errors: errors.slice(0, 10) // Return first 10 errors to avoid overwhelming UI
      };

    } catch (error) {
      console.error('❌ Forecast import failed:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches all forecast documents from Supabase
   * @returns Promise<Forecast[]> - Array of forecast objects
   */
  async getAllForecasts(): Promise<Forecast[]> {
    try {
      console.log('📊 Fetching all forecasts...');

      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .order('product_code', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} forecasts`);
      
      return data?.map(item => this.mapSupabaseToForecast(item)) || [];
    } catch (error) {
      console.error('❌ Error fetching forecasts:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets forecast for a specific product
   * @param productCode - Product code to get forecast for
   * @returns Promise<Forecast | null>
   */
  async getForecastByProductCode(productCode: string): Promise<Forecast | null> {
    try {
      if (!productCode) {
        throw new Error('Product code is required');
      }

      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .eq('product_code', productCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`⚠️ Forecast not found for product: ${productCode}`);
          return null;
        }
        throw error;
      }

      console.log(`✅ Found forecast for product: ${productCode}`);
      return this.mapSupabaseToForecast(data);
    } catch (error) {
      console.error('❌ Error fetching forecast by product code:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets forecast data for a specific month across all products
   * @param month - Month in YYYY-MM format
   * @returns Promise<{productCode: string, forecast: number, description: string}[]>
   */
  async getForecastByMonth(month: string): Promise<{
    productCode: string;
    forecast: number;
    description: string;
  }[]> {
    try {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('Month must be in YYYY-MM format');
      }

      const { data, error } = await supabase
        .from('forecasts')
        .select('product_code, description, monthly_forecast')
        .not('monthly_forecast', 'is', null);

      if (error) {
        throw error;
      }

      const monthlyData = (data || [])
        .map(item => ({
          productCode: item.product_code,
          description: item.description || 'N/A',
          forecast: item.monthly_forecast?.[month] || 0
        }))
        .filter(item => item.forecast > 0)
        .sort((a, b) => b.forecast - a.forecast);

      console.log(`✅ Found ${monthlyData.length} products with forecast for ${month}`);
      return monthlyData;
    } catch (error) {
      console.error('❌ Error fetching forecast by month:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Updates forecast for a specific product and month
   * @param productCode - Product code
   * @param month - Month in YYYY-MM format
   * @param forecast - Forecast value
   * @returns Promise<Forecast>
   */
  async updateForecast(productCode: string, month: string, forecast: number): Promise<Forecast> {
    try {
      if (!productCode || !month || forecast < 0) {
        throw new Error('Invalid parameters for forecast update');
      }

      // First, get the existing forecast
      const { data: existing, error: fetchError } = await supabase
        .from('forecasts')
        .select('monthly_forecast')
        .eq('product_code', productCode)
        .single();

      let monthlyForecast = existing?.monthly_forecast || {};
      monthlyForecast[month] = forecast;

      const { data, error } = await supabase
        .from('forecasts')
        .upsert({
          product_code: productCode,
          monthly_forecast: monthlyForecast,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_code'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Updated forecast for ${productCode} - ${month}: ${forecast}`);
      return this.mapSupabaseToForecast(data);
    } catch (error) {
      console.error('❌ Error updating forecast:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets forecast summary statistics
   * @returns Promise<{totalProducts: number, totalMonths: number, avgForecast: number}>
   */
  async getForecastSummary(): Promise<{
    totalProducts: number;
    totalMonths: number;
    avgForecast: number;
    topProducts: { productCode: string; totalForecast: number }[];
  }> {
    try {
      const { data, error } = await supabase
        .from('forecasts')
        .select('product_code, monthly_forecast');

      if (error) {
        throw error;
      }

      let totalForecast = 0;
      let totalEntries = 0;
      const productTotals: { [key: string]: number } = {};
      const monthsSet = new Set<string>();

      (data || []).forEach(item => {
        const monthlyForecast = item.monthly_forecast || {};
        let productTotal = 0;

        Object.entries(monthlyForecast).forEach(([month, value]) => {
          const forecastValue = Number(value) || 0;
          totalForecast += forecastValue;
          productTotal += forecastValue;
          totalEntries++;
          monthsSet.add(month);
        });

        if (productTotal > 0) {
          productTotals[item.product_code] = productTotal;
        }
      });

      const topProducts = Object.entries(productTotals)
        .map(([productCode, totalForecast]) => ({ productCode, totalForecast }))
        .sort((a, b) => b.totalForecast - a.totalForecast)
        .slice(0, 10);

      const summary = {
        totalProducts: Object.keys(productTotals).length,
        totalMonths: monthsSet.size,
        avgForecast: totalEntries > 0 ? Math.round((totalForecast / totalEntries) * 100) / 100 : 0,
        topProducts
      };

      console.log('✅ Forecast summary calculated:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Error getting forecast summary:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Searches forecasts by product code or description
   * @param searchTerm - Term to search for
   * @param limit - Maximum number of results
   * @returns Promise<Forecast[]>
   */
  async searchForecasts(searchTerm: string, limit: number = 50): Promise<Forecast[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters');
      }

      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .or(`product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('product_code', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log(`✅ Search for "${searchTerm}" returned ${data?.length || 0} forecasts`);
      return data?.map(item => this.mapSupabaseToForecast(item)) || [];
    } catch (error) {
      console.error('❌ Error searching forecasts:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Maps Supabase data to Forecast interface
   * @param data - Raw data from Supabase
   * @returns Forecast object
   */
  private mapSupabaseToForecast(data: any): Forecast {
    return {
      id: data.id || data.product_code,
      productCode: data.product_code,
      description: data.description || 'N/A',
      monthlyForecast: data.monthly_forecast || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// BLOCK 3: Export singleton instance
export const forecastService = new ForecastService();

// BLOCK 4: Export individual functions for backward compatibility
export const importForecastData = (file: File) => forecastService.importForecastData(file);
export const getAllForecasts = () => forecastService.getAllForecasts();
export const getForecastByProductCode = (productCode: string) => forecastService.getForecastByProductCode(productCode);
export const getForecastByMonth = (month: string) => forecastService.getForecastByMonth(month);
export const updateForecast = (productCode: string, month: string, forecast: number) => forecastService.updateForecast(productCode, month, forecast);
export const getForecastSummary = () => forecastService.getForecastSummary();
export const searchForecasts = (searchTerm: string, limit?: number) => forecastService.searchForecasts(searchTerm, limit);

// BLOCK 5: Utility functions
export const parseMonthHeader = (header: string): string | null => {
  if (typeof header !== "string") return null;
  const parts = header.trim().split("-");
  if (parts.length !== 2) return null;

  const monthMap: { [key: string]: string } = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    may: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const month = monthMap[parts[0].toLowerCase()];
  const yearPart = parts[1];
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

  if (!month || isNaN(parseInt(year))) return null;
  return `${year}-${month}`;
};

export const validateForecastData = (data: {
  productCode: string;
  monthlyForecast: { [key: string]: number };
}): string[] => {
  const errors: string[] = [];

  if (!data.productCode?.trim()) {
    errors.push('Product code is required');
  }

  if (!data.monthlyForecast || Object.keys(data.monthlyForecast).length === 0) {
    errors.push('At least one monthly forecast is required');
  }

  // Validate month formats and values
  Object.entries(data.monthlyForecast).forEach(([month, value]) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      errors.push(`Invalid month format: ${month}. Use YYYY-MM format.`);
    }
    
    if (typeof value !== 'number' || value < 0) {
      errors.push(`Invalid forecast value for ${month}: ${value}. Must be a non-negative number.`);
    }
  });

  return errors;
};

export const formatForecastMonth = (month: string): string => {
  try {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const monthIndex = parseInt(monthNum) - 1;
    const shortYear = year.slice(-2);
    
    return `${monthNames[monthIndex]}-${shortYear}`;
  } catch {
    return month;
  }
};

export const calculateForecastTrends = (monthlyForecast: { [key: string]: number }): {
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  totalForecast: number;
  avgMonthlyForecast: number;
} => {
  const entries = Object.entries(monthlyForecast)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length < 2) {
    return {
      trend: 'stable',
      changePercent: 0,
      totalForecast: entries[0]?.[1] || 0,
      avgMonthlyForecast: entries[0]?.[1] || 0
    };
  }

  const firstValue = entries[0][1];
  const lastValue = entries[entries.length - 1][1];
  const totalForecast = entries.reduce((sum, [, value]) => sum + value, 0);
  const avgMonthlyForecast = totalForecast / entries.length;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let changePercent = 0;

  if (firstValue > 0) {
    changePercent = ((lastValue - firstValue) / firstValue) * 100;
    
    if (changePercent > 5) {
      trend = 'increasing';
    } else if (changePercent < -5) {
      trend = 'decreasing';
    }
  }

  return {
    trend,
    changePercent: Math.round(changePercent * 100) / 100,
    totalForecast: Math.round(totalForecast * 100) / 100,
    avgMonthlyForecast: Math.round(avgMonthlyForecast * 100) / 100
  };
};

export const getNextMonths = (count: number = 12): string[] => {
  const months: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  
  return months;
};

export const getForecastColor = (value: number, max: number): string => {
  if (max === 0) return 'gray';
  
  const percentage = (value / max) * 100;
  
  if (percentage >= 80) return 'red';
  if (percentage >= 60) return 'orange';
  if (percentage >= 40) return 'yellow';
  if (percentage >= 20) return 'blue';
  return 'green';
};

// BLOCK 6: Export the service class
export { ForecastService };
export default forecastService;

// BLOCK 7: Type exports for convenience
export type { Forecast } from '../types/mrp.types';