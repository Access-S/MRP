// src/services/product.service.ts

// BLOCK 1: Imports
import { Product } from "../types/mrp.types";
import { handleApiError } from "./api.service";

// BLOCK 2: Product Service Class
class ProductService {

  /**
   * Fetches all products from the backend API.
   * This function is designed to be "safe" - it always returns an array.
   * @returns A promise that resolves to an array of Product objects.
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      console.log('📊 Fetching all products...');
      const response = await fetch('/api/products');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch products.');
      }
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return []; 
    }
  }

  /**
   * Fetches the Bill of Materials for a single product.
   * This is used by the modals. It remains unchanged.
   * @param productId The ID of the product.
   * @returns A promise that resolves to an array of BomComponent objects.
   */
  async getBomForProduct(productId: string): Promise<BomComponent[]> {
    try {
      if (!productId) return [];
      const response = await fetch(`/api/products/${productId}/bom`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch BOM.');
      }
      return result.data || [];
    } catch (error) {
      console.error(`❌ Error fetching BOM for product ${productId}:`, error);
      return [];
    }
  }

  /**
   * Fetches ALL Bill of Materials components for the MRP engine. (NEW)
   * @returns A promise that resolves to an array of all BomComponent objects.
   */
  async getAllBomComponents(): Promise<BomComponent[]> {
    try {
      const response = await fetch(`/api/products/boms/all`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch all BOMs.');
      }
      return result.data || [];
    } catch (error) {
      console.error(`❌ Error fetching all BOM components:`, error);
      return [];
    }
  }
}

// BLOCK 3: Export Singleton Instance
export const productService = new ProductService();