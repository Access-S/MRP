// BLOCK 1: Imports
import { supabase } from "../supabase.config";
import { apiClient, handleApiError, ApiResponse } from "./api.service";
import { Product, BomComponent } from "../types/mrp.types";

// BLOCK 2: Product Service Class
class ProductService {
  
  /**
   * Fetches all products from the backend API (which uses Supabase)
   * @returns A promise that resolves to an array of Product objects
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      const response: ApiResponse<Product[]> = await apiClient.get('/products');
      
      if (response.success && response.data) {
        console.log(`✅ Fetched ${response.data.length} products from API`);
        return response.data;
      }
      
      throw new Error('Failed to fetch products');
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches a single product by ID directly from Supabase
   * @param productId - The UUID of the product
   * @returns A promise that resolves to a Product object or null
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`⚠️ Product not found: ${productId}`);
          return null;
        }
        throw error;
      }

      console.log(`✅ Fetched product: ${data.product_code}`);
      return this.mapSupabaseToProduct(data);
    } catch (error) {
      console.error('❌ Error fetching product by ID:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches products by product code
   * @param productCode - The product code to search for
   * @returns A promise that resolves to an array of matching products
   */
  async getProductsByCode(productCode: string): Promise<Product[]> {
    try {
      if (!productCode) {
        throw new Error('Product code is required');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('product_code', `%${productCode}%`)
        .order('product_code', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} products matching code: ${productCode}`);
      return data?.map(item => this.mapSupabaseToProduct(item)) || [];
    } catch (error) {
      console.error('❌ Error searching products by code:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches BOM components for a specific product
   * @param productId - The UUID of the product
   * @returns A promise that resolves to an array of BOM components
   */
  async getBomForProduct(productId: string): Promise<BomComponent[]> {
    try {
      const response: ApiResponse<BomComponent[]> = await apiClient.get(`/products/${productId}/bom`);
      
      if (response.success && response.data) {
        console.log(`✅ Fetched ${response.data.length} BOM components for product ${productId}`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching BOM components:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Searches products with advanced filtering
   * @param searchTerm - Term to search in product code and description
   * @param limit - Maximum number of results (default: 50)
   * @returns A promise that resolves to an array of matching products
   */
  async searchProducts(searchTerm: string, limit: number = 50): Promise<Product[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('product_code', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log(`✅ Search for "${searchTerm}" returned ${data?.length || 0} products`);
      return data?.map(item => this.mapSupabaseToProduct(item)) || [];
    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets products with low inventory (if you have inventory tracking)
   * @param threshold - Minimum inventory level (default: 10)
   * @returns A promise that resolves to an array of low-stock products
   */
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      // This assumes you have an inventory or stock field
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .lt('current_stock', threshold)
        .order('current_stock', { ascending: true });

      if (error) {
        // If current_stock column doesn't exist, return empty array
        if (error.code === '42703') {
          console.warn('⚠️ Current stock column not found, skipping low stock check');
          return [];
        }
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} products with low stock (< ${threshold})`);
      return data?.map(item => this.mapSupabaseToProduct(item)) || [];
    } catch (error) {
      console.error('❌ Error fetching low stock products:', error);
      return []; // Return empty array instead of throwing for this optional feature
    }
  }

  /**
   * Maps Supabase data to Product interface
   * @param data - Raw data from Supabase
   * @returns Mapped Product object
   */
  private mapSupabaseToProduct(data: any): Product {
    return {
      id: data.id,
      productCode: data.product_code,
      description: data.description,
      unitsPerShipper: data.units_per_shipper || 0,
      dailyRunRate: data.daily_run_rate || 0,
      hourlyRunRate: data.hourly_run_rate || 0,
      minsPerShipper: data.mins_per_shipper || 0,
      pricePerShipper: data.price_per_shipper || 0,
      currentStock: data.current_stock || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // BOM components will be loaded separately when needed
      components: []
    };
  }
}

// BLOCK 3: Export singleton instance
export const productService = new ProductService();

// BLOCK 4: Export individual functions for backward compatibility
export const getAllProducts = () => productService.getAllProducts();
export const getProductById = (productId: string) => productService.getProductById(productId);
export const getProductsByCode = (productCode: string) => productService.getProductsByCode(productCode);
export const getBomForProduct = (productId: string) => productService.getBomForProduct(productId);
export const searchProducts = (searchTerm: string, limit?: number) => productService.searchProducts(searchTerm, limit);
export const getLowStockProducts = (threshold?: number) => productService.getLowStockProducts(threshold);

// BLOCK 5: Export the service class
export default productService;