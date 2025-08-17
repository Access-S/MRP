// src/services/forecast.service.ts

// BLOCK 1: Imports and Type Dependencies
import { handleApiError } from "./api.service";
import { ForecastTableData, Forecast } from "../types/mrp.types";

// BLOCK 2: Forecast Service Class Definition
class ForecastService {

  /**
   * BLOCK 2.1: Upload Forecast Data Method
   * Uploads the forecast Excel file to the backend API for all processing.
   */
  async importForecastData(file: File): Promise<{ message: string }> {
    try {
      console.log('📤 Uploading forecast file to the backend...');
      const formData = new FormData();
      formData.append('forecastFile', file);
      const response = await fetch('/api/forecasts/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server failed to import forecast data.');
      }
      console.log('✅ Backend successfully processed the forecast file.');
      return { message: result.message };
    } catch (error) {
      console.error('❌ Forecast upload failed:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * BLOCK 2.2: Fetch Forecast Table Data Method
   * Fetches the processed and pivoted forecast data from the backend API,
   * ready for direct display in a UI table.
   */
  async getForecastTableData(
    months: string = '6', 
    search: string = ''
  ): Promise<ForecastTableData> {
    try {
      console.log(`📊 Fetching processed forecast data from backend (months: ${months})...`);
      const params = new URLSearchParams({ months, search });
      const response = await fetch(`/api/forecasts?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server failed to fetch forecast data.');
      }
      console.log(`✅ Successfully fetched ${result.tableData.rows.length} processed forecast products.`);
      return result.tableData;
    } catch (error) {
      console.error('❌ Error fetching forecast table data:', error);
      return { headers: [], rows: [] };
    }
  }

  /**
   * BLOCK 2.3: Fetch Raw Forecast Data for Calculations (NEW)
   * Fetches forecast data grouped by product, suitable for the MRP engine.
   * This requires a new backend endpoint: /api/forecasts/raw
   * @returns A promise resolving to an array of Forecast objects.
   */
  async getRawForecasts(): Promise<Forecast[]> {
    try {
      console.log('📊 Fetching raw forecast data for MRP engine...');
      
      const response = await fetch('/api/forecasts/raw'); 
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server failed to fetch raw forecast data.');
      }

      console.log(`✅ Successfully fetched raw data for ${result.data.length} forecast products.`);
      return result.data;

    } catch (error) {
      console.error('❌ Error fetching raw forecast data:', error);
      return []; // Return an empty array on error to prevent MRP engine failure.
    }
  }
  /**
   * BLOCK 2.4: Delete All Forecasts Method (NEW)
   * Sends a request to the backend to delete all forecast records.
   * @returns A success message from the API.
   */
  async deleteAllForecasts(): Promise<{ message: string }> {
    try {
      console.log('🗑️ Sending request to delete all forecasts...');
      
      const response = await fetch('/api/forecasts/delete-all', {
        method: 'DELETE',
      });
      
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Server failed to delete forecast data.');
      }

      console.log('✅ Backend successfully deleted all forecasts.');
      return result;

    } catch (error) {
      console.error('❌ Failed to delete all forecasts:', error);
      throw error;
    }
  }
}

// BLOCK 3: Singleton Instance Export
// Export a single, shared instance of the service to be used throughout the app.
export const forecastService = new ForecastService();