// BLOCK 1: Imports
import { supabase } from "../supabase.config";
import { apiClient, handleApiError, ApiResponse } from "./api.service";
import { Component } from "../types/mrp.types";
import * as XLSX from "xlsx";

// BLOCK 2: Inventory Service Class
class InventoryService {

  /**
   * Fetches all SOH records from the backend API, with optional search.
   * @param search - Optional search term to filter by product_id.
   * @returns Promise<Component[]> - Array of inventory components
   */
  async getAllSoh(search: string = ''): Promise<Component[]> {
    try {
      // Build the endpoint URL with the search parameter if it exists.
      const params = new URLSearchParams({ search });
      const endpoint = `/soh?${params.toString()}`;
      
      const response: ApiResponse<Component[]> = await apiClient.get(endpoint);
      
      if (response.success && response.data) {
        console.log(`✅ Fetched ${response.data.length} SOH records from API for search: "${search}"`);
        return response.data;
      }
      
      throw new Error('Failed to fetch SOH records');
    } catch (error) {
      console.error('❌ Error fetching SOH records:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets SOH summary statistics
   * @returns Promise<{totalRecords: number, latestImport: any}>
   */
  async getSohSummary(): Promise<{
    totalRecords: number;
    latestImport: any;
  }> {
    try {
      const response: ApiResponse<any> = await apiClient.get('/soh/summary');
      
      if (response.success && response.data) {
        console.log(`✅ Fetched SOH summary`);
        return response.data;
      }
      
      throw new Error('Failed to fetch SOH summary');
    } catch (error) {
      console.error('❌ Error fetching SOH summary:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Analyzes Excel file headers for column selection
   * @param file - Excel file to analyze
   * @returns Promise<{headers: string[], sampleData: any[], totalRows: number, filename: string}>
   */
  async analyzeExcelHeaders(file: File): Promise<{
    headers: string[];
    sampleData: any[];
    totalRows: number;
    filename: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/soh/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze Excel file');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`✅ Analyzed Excel file: ${result.data.headers.length} headers found`);
        return result.data;
      }
      
      throw new Error('Failed to analyze Excel file');
    } catch (error) {
      console.error('❌ Error analyzing Excel file:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Imports SOH data from Excel file with selected columns
   * @param file - Excel file to import
   * @param selectedColumns - Array of column names to import
   * @param replaceExisting - Whether to replace existing data
   * @returns Promise<{successCount: number, errorCount: number, totalRows: number, batchId: string, errors: string[]}>
   */
  async importSohData(
    file: File, 
    selectedColumns: string[], 
    replaceExisting: boolean = false
  ): Promise<{
    successCount: number;
    errorCount: number;
    totalRows: number;
    batchId: string;
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Send each column as a separate form field
      selectedColumns.forEach((column, index) => {
        formData.append(`selectedColumns[${index}]`, column);
      });
      
      formData.append('replaceExisting', String(replaceExisting));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/soh/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import SOH data');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`✅ SOH import completed: ${result.data.successCount} records imported`);
        return result.data;
      }
      
      throw new Error('Failed to import SOH data');
    } catch (error) {
      console.error('❌ Error importing SOH data:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets components from BOM data as a substitute for inventory
   * This gives you a list of all components used across products
   */
  async getAllComponentsFromBom(): Promise<Component[]> {
    try {
      console.log('📦 Fetching components from BOM data...');

      const { data, error } = await supabase
        .from('bom_components')
        .select('*')
        .order('part_code', { ascending: true });

      if (error) {
        throw error;
      }

      // Group by part_code and aggregate data
      const componentMap = new Map<string, Component>();

      (data || []).forEach(bomItem => {
        const partCode = bomItem.part_code;
        
        if (!componentMap.has(partCode)) {
          componentMap.set(partCode, {
            id: bomItem.id,
            partCode: bomItem.part_code,
            description: bomItem.part_description || 'N/A',
            stock: 0, // No stock data available from BOM
            safetyStock: 0,
            supplierId: 'unknown',
            partType: bomItem.part_type,
            perShipper: bomItem.per_shipper,
            createdAt: bomItem.created_at,
            updatedAt: bomItem.updated_at
          });
        }
      });

      const components = Array.from(componentMap.values());
      console.log(`✅ Found ${components.length} unique components from BOM data`);
      
      return components;
    } catch (error) {
      console.error('❌ Error fetching components from BOM:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Searches SOH records by product ID or description
   * @param searchTerm - Term to search for
   * @param limit - Maximum number of results
   * @returns Promise<Component[]>
   */
  async searchSoh(searchTerm: string, limit: number = 50): Promise<Component[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const response: ApiResponse<Component[]> = await apiClient.get(
        `/soh?search=${encodeURIComponent(searchTerm)}&limit=${limit}`
      );
      
      if (response.success && response.data) {
        console.log(`✅ Search for "${searchTerm}" returned ${response.data.length} SOH records`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error searching SOH records:', error);
      return [];
    }
  }

  /**
   * Gets SOH record by product ID
   * @param productId - Product ID to search for
   * @returns Promise<Component | null>
   */
  async getSohByPartCode(productId: string): Promise<Component | null> {
    try {
      if (!productId) {
        return null;
      }

      const response: ApiResponse<Component[]> = await apiClient.get(
        `/soh?product_id=${encodeURIComponent(productId)}&limit=1`
      );
      
      if (response.success && response.data && response.data.length > 0) {
        console.log(`✅ Found SOH record for product ID: ${productId}`);
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching SOH by product ID:', error);
      return null;
    }
  }

  /**
   * Placeholder methods for future implementation
   */
  async getLowStockItems(threshold: number = 10): Promise<Component[]> {
    console.warn('⚠️ Low stock filtering not implemented yet');
    return [];
  }

  async updateStock(partCode: string, newStock: number): Promise<Component> {
    throw new Error('Stock updates not available yet. Feature coming soon.');
  }

  async getInventorySummary(): Promise<{
    totalItems: number;
    totalStock: number;
    lowStockCount: number;
    averageStock: number;
  }> {
    try {
      const summary = await this.getSohSummary();
      
      return {
        totalItems: summary.totalRecords,
        totalStock: 0, // Would need to calculate from actual stock values
        lowStockCount: 0, // Would need to implement low stock logic
        averageStock: 0 // Would need to calculate from actual stock values
      };
    } catch (error) {
      console.error('❌ Error getting inventory summary:', error);
      return {
        totalItems: 0,
        totalStock: 0,
        lowStockCount: 0,
        averageStock: 0
      };
    }
  }
}

// BLOCK 3: Export Singleton Instance
export const inventoryService = new InventoryService();

// BLOCK 4: Export Individual Functions for Backward Compatibility
export const getAllSoh = (search: string = '') => inventoryService.getAllSoh(search);
export const getSohSummary = () => inventoryService.getSohSummary();
export const analyzeExcelHeaders = (file: File) => inventoryService.analyzeExcelHeaders(file);
export const importSohData = (file: File, selectedColumns: string[], replaceExisting?: boolean) => 
  inventoryService.importSohData(file, selectedColumns, replaceExisting);
export const getAllComponentsFromBom = () => inventoryService.getAllComponentsFromBom();
export const getSohByPartCode = (productId: string) => inventoryService.getSohByPartCode(productId);
export const searchSoh = (searchTerm: string, limit?: number) => inventoryService.searchSoh(searchTerm, limit);
export const getLowStockItems = (threshold?: number) => inventoryService.getLowStockItems(threshold);
export const updateStock = (partCode: string, newStock: number) => inventoryService.updateStock(partCode, newStock);
export const getInventorySummary = () => inventoryService.getInventorySummary();

// BLOCK 5: Export Service Class
export { InventoryService };
export default inventoryService;