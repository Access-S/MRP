// BLOCK 1: Imports
import { supabase } from "../supabase.config";
import { 
  apiClient, 
  handleApiError, 
  ApiResponse, 
  PaginatedApiResponse,
  fetchPurchaseOrders as apiFetchPurchaseOrders,
  createPo as apiCreatePo,
  updatePo as apiUpdatePo,
  updatePurchaseOrderStatus as apiUpdateStatus,
  deletePo as apiDeletePo,
  fetchPoById as apiFetchPoById
} from "./api.service";
import { PurchaseOrder, Product, PoStatus } from "../types/mrp.types";

// BLOCK 2: Purchase Order Service Class
class PurchaseOrderService {

  /**
   * Checks if a PO number already exists
   * @param poNumber - The PO number to check
   * @returns Promise<boolean> - true if exists, false otherwise
   */
  async checkPoNumberExists(poNumber: string): Promise<boolean> {
    try {
      if (!poNumber) {
        throw new Error('PO number is required');
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('po_number', poNumber)
        .limit(1);

      if (error) {
        console.error('Error checking PO number:', error);
        return true; // Return true to be safe
      }

      const exists = data && data.length > 0;
      console.log(`PO number ${poNumber} ${exists ? 'exists' : 'is available'}`);
      return exists;
    } catch (error) {
      console.error('Error checking PO number:', error);
      return true; // Return true to be safe
    }
  }

  /**
   * Creates a new purchase order using the backend API
   * @param poData - Purchase order data
   * @returns Promise<string> - The ID of the created PO
   */
  async createNewPurchaseOrder(poData: {
    poNumber: string;
    productCode: string;
    customerName: string;
    poCreatedDate: string;
    poReceivedDate: string;
    orderedQtyPieces: number;
    customerAmount: number;
  }): Promise<string> {
    try {
      // Check if PO number already exists
      const exists = await this.checkPoNumberExists(poData.poNumber);
      if (exists) {
        throw new Error(`PO number ${poData.poNumber} already exists`);
      }

      const response: ApiResponse<PurchaseOrder> = await apiCreatePo(poData);
      
      if (response.success && response.data) {
        console.log(`✅ PO created with ID: ${response.data.id}`);
        return response.data.id;
      }
      
      throw new Error('Failed to create purchase order');
    } catch (error) {
      console.error('❌ Error creating PO:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches all purchase orders with pagination and filtering
   * @param options - Query options
   * @returns Promise<PaginatedApiResponse<PurchaseOrder>>
   */
  async getAllPurchaseOrders(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortDirection?: 'asc' | 'desc';
  } = {}): Promise<PaginatedApiResponse<PurchaseOrder>> {
    try {
      const response = await apiFetchPurchaseOrders(options);
      
      if (response.success) {
        console.log(`✅ Fetched ${response.data.length} purchase orders`);
        return response;
      }
      
      throw new Error('Failed to fetch purchase orders');
    } catch (error) {
      console.error('❌ Error fetching purchase orders:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Fetches a single purchase order by ID
   * @param poId - The purchase order ID
   * @returns Promise<PurchaseOrder | null>
   */
  async getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
    try {
      const response: ApiResponse<PurchaseOrder> = await apiFetchPoById(poId);
      
      if (response.success && response.data) {
        console.log(`✅ Fetched PO: ${response.data.po_number}`);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching PO by ID:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Updates purchase order status using the backend API
   * @param poId - Purchase order ID
   * @param newStatus - New status to toggle
   * @returns Promise<string[]> - Updated status array
   */
  async updatePoStatus(poId: string, newStatus: PoStatus): Promise<string[]> {
    try {
      const response: ApiResponse<{ statuses: string[] }> = await apiUpdateStatus(poId, newStatus);
      
      if (response.success && response.data) {
        console.log(`✅ Updated PO status: ${response.data.statuses.join(', ')}`);
        return response.data.statuses;
      }
      
      throw new Error('Failed to update PO status');
    } catch (error) {
      console.error('❌ Error updating PO status:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Resolves PO Check status by validating amounts and updating status
   * @param po - Purchase order object
   * @param product - Product object for calculations
   * @returns Promise<void>
   */
  async resolvePoCheck(po: PurchaseOrder, product: Product): Promise<void> {
    try {
      const unitsPerShipper = product.unitsPerShipper || 0;
      if (unitsPerShipper === 0) {
        throw new Error("Product is missing 'unitsPerShipper' data.");
      }

      const pricePerShipper = product.pricePerShipper || 0;
      const shippers = po.orderedQtyPieces / unitsPerShipper;
      const systemAmount = shippers * pricePerShipper;
      const amountDifference = Math.abs(po.customerAmount - systemAmount);

      if (amountDifference > 5) {
        throw new Error(
          `Amount mismatch still exists. Difference is $${amountDifference.toFixed(2)}. Please correct the PO details first.`
        );
      }

      // Update status to Open using the backend API
      await this.updatePoStatus(po.id, 'Open');
      console.log(`✅ PO Check resolved for PO: ${po.poNumber}`);
    } catch (error) {
      console.error('❌ Error resolving PO check:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Dispatches a purchase order
   * @param poId - Purchase order ID
   * @param deliveryDate - Delivery date
   * @param docketNumber - Delivery docket number
   * @returns Promise<void>
   */
  async despatchPo(poId: string, deliveryDate: string, docketNumber: string): Promise<void> {
    try {
      // Update the PO with delivery details using direct Supabase call
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          delivery_date: deliveryDate,
          delivery_docket_number: docketNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) {
        throw error;
      }

      // Update status to Completed
      await this.updatePoStatus(poId, 'Completed');
      console.log(`✅ PO dispatched: ${poId}`);
    } catch (error) {
      console.error('❌ Error dispatching PO:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Updates purchase order details
   * @param poId - Purchase order ID
   * @param newData - Updated data
   * @param product - Product for calculations
   * @returns Promise<PurchaseOrder>
   */
  async updatePurchaseOrder(
    poId: string, 
    newData: { 
      orderedQtyPieces?: number; 
      customerAmount?: number;
      poNumber?: string;
      customerName?: string;
      poCreatedDate?: string;
      poReceivedDate?: string;
    },
    product?: Product
  ): Promise<PurchaseOrder> {
    try {
      // If we have product data and quantity/amount changes, validate amounts
      if (product && (newData.orderedQtyPieces || newData.customerAmount)) {
        const unitsPerShipper = product.unitsPerShipper || 0;
        if (unitsPerShipper === 0) {
          throw new Error("Product is missing 'unitsPerShipper' data.");
        }

        const pieces = newData.orderedQtyPieces || 0;
        const amount = newData.customerAmount || 0;
        const pricePerShipper = product.pricePerShipper || 0;
        const shippers = pieces / unitsPerShipper;
        const systemAmount = shippers * pricePerShipper;
        const amountDifference = Math.abs(amount - systemAmount);

        // If there's a significant difference, the status should be "PO Check"
        if (amountDifference > 5) {
          console.warn(`Amount mismatch detected: $${amountDifference.toFixed(2)}`);
        }
      }

      const response: ApiResponse<PurchaseOrder> = await apiUpdatePo(poId, newData);
      
      if (response.success && response.data) {
        console.log(`✅ PO updated: ${response.data.po_number}`);
        return response.data;
      }
      
      throw new Error('Failed to update purchase order');
    } catch (error) {
      console.error('❌ Error updating PO:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Reopens a dispatched purchase order
   * @param poId - Purchase order ID
   * @returns Promise<void>
   */
  async reopenDespatchedPo(poId: string): Promise<void> {
    try {
      // Clear delivery details using direct Supabase call
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          delivery_date: null,
          delivery_docket_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) {
        throw error;
      }

      // Update status to Open
      await this.updatePoStatus(poId, 'Open');
      console.log(`✅ PO reopened: ${poId}`);
    } catch (error) {
      console.error('❌ Error reopening PO:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Deletes a purchase order
   * @param poId - Purchase order ID
   * @returns Promise<void>
   */
  async deletePurchaseOrder(poId: string): Promise<void> {
    try {
      const response: ApiResponse<void> = await apiDeletePo(poId);
      
      if (response.success) {
        console.log(`✅ PO deleted: ${poId}`);
        return;
      }
      
      throw new Error('Failed to delete purchase order');
    } catch (error) {
      console.error('❌ Error deleting PO:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Gets total count of purchase orders
   * @param statusFilter - Optional status filter
   * @returns Promise<number>
   */
  async getTotalPurchaseOrdersCount(statusFilter?: string): Promise<number> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true });

      if (statusFilter) {
        // This would need to be adjusted based on your status storage format
        query = query.contains('statuses', [statusFilter]);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ Total PO count: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error('❌ Error getting PO count:', error);
      return 0;
    }
  }

  /**
   * Gets purchase orders with advanced filtering
   * @param filters - Filter options
   * @returns Promise<PurchaseOrder[]>
   */
  async getFilteredPurchaseOrders(filters: {
    customerName?: string;
    productCode?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
  }): Promise<PurchaseOrder[]> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          product:products(*),
          statuses:po_status_history(status)
        `)
        .order('sequence', { ascending: false });

      // Apply filters
      if (filters.customerName) {
        query = query.ilike('customer_name', `%${filters.customerName}%`);
      }
      
      if (filters.productCode) {
        query = query.ilike('product_code', `%${filters.productCode}%`);
      }
      
      if (filters.dateFrom) {
        query = query.gte('po_created_date', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('po_created_date', filters.dateTo);
      }
      
      if (filters.amountMin) {
        query = query.gte('customer_amount', filters.amountMin);
      }
      
      if (filters.amountMax) {
        query = query.lte('customer_amount', filters.amountMax);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ Filtered POs: ${data?.length || 0} results`);
      return data || [];
    } catch (error) {
      console.error('❌ Error filtering POs:', error);
      throw new Error(handleApiError(error));
    }
  }
}

// BLOCK 3: Export singleton instance
export const purchaseOrderService = new PurchaseOrderService();

// BLOCK 4: Export individual functions for backward compatibility
export const checkPoNumberExists = (poNumber: string) => 
  purchaseOrderService.checkPoNumberExists(poNumber);

export const createNewPurchaseOrder = (poData: {
  poNumber: string;
  productCode: string;
  customerName: string;
  poCreatedDate: string;
  poReceivedDate: string;
  orderedQtyPieces: number;
  customerAmount: number;
}) => purchaseOrderService.createNewPurchaseOrder(poData);

export const getAllPurchaseOrders = (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortDirection?: 'asc' | 'desc';
} = {}) => purchaseOrderService.getAllPurchaseOrders(options);

export const getPurchaseOrderById = (poId: string) => 
  purchaseOrderService.getPurchaseOrderById(poId);

export const updatePoStatus = (poId: string, newStatus: PoStatus) => 
  purchaseOrderService.updatePoStatus(poId, newStatus);

export const resolvePoCheck = (po: PurchaseOrder, product: Product) => 
  purchaseOrderService.resolvePoCheck(po, product);

export const despatchPo = (poId: string, deliveryDate: string, docketNumber: string) => 
  purchaseOrderService.despatchPo(poId, deliveryDate, docketNumber);

export const updatePurchaseOrder = (
  poId: string, 
  newData: {
    orderedQtyPieces?: number;
    customerAmount?: number;
    poNumber?: string;
    customerName?: string;
    poCreatedDate?: string;
    poReceivedDate?: string;
  },
  product?: Product
) => purchaseOrderService.updatePurchaseOrder(poId, newData, product);

export const reopenDespatchedPo = (poId: string) => 
  purchaseOrderService.reopenDespatchedPo(poId);

export const deletePurchaseOrder = (poId: string) => 
  purchaseOrderService.deletePurchaseOrder(poId);

export const getTotalPurchaseOrdersCount = (statusFilter?: string) => 
  purchaseOrderService.getTotalPurchaseOrdersCount(statusFilter);

export const getFilteredPurchaseOrders = (filters: {
  customerName?: string;
  productCode?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}) => purchaseOrderService.getFilteredPurchaseOrders(filters);

// BLOCK 5: Pagination interface for backward compatibility
export interface PaginatedPoResponse {
  purchaseOrders: PurchaseOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// BLOCK 6: Paginated function for backward compatibility
export const getPurchaseOrdersPaginated = async (
  allProducts: Product[], // This parameter is now ignored since we get full data from API
  options: {
    sortDirection?: "asc" | "desc";
    itemsPerPage?: number;
    page?: number;
    search?: string;
    status?: string;
  } = {}
): Promise<PaginatedPoResponse> => {
  try {
    const {
      sortDirection = "desc",
      itemsPerPage = 25,
      page = 1,
      search = "",
      status = ""
    } = options;

    const response = await purchaseOrderService.getAllPurchaseOrders({
      page,
      limit: itemsPerPage,
      search,
      status,
      sortDirection
    });

    if (response.success) {
      return {
        purchaseOrders: response.data,
        pagination: response.pagination
      };
    }

    throw new Error('Failed to fetch paginated purchase orders');
  } catch (error) {
    console.error('❌ Error in getPurchaseOrdersPaginated:', error);
    return {
      purchaseOrders: [],
      pagination: {
        total: 0,
        page: 1,
        limit: itemsPerPage || 25,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
};

// BLOCK 7: Utility functions
export const calculatePoAmounts = (
  orderedQtyPieces: number,
  product: Product
): {
  orderedQtyShippers: number;
  systemAmount: number;
  amountDifference: (customerAmount: number) => number;
} => {
  const unitsPerShipper = product.unitsPerShipper || 0;
  const pricePerShipper = product.pricePerShipper || 0;
  
  if (unitsPerShipper === 0) {
    throw new Error("Product is missing 'unitsPerShipper' data");
  }

  const orderedQtyShippers = orderedQtyPieces / unitsPerShipper;
  const systemAmount = orderedQtyShippers * pricePerShipper;

  return {
    orderedQtyShippers,
    systemAmount,
    amountDifference: (customerAmount: number) => Math.abs(customerAmount - systemAmount)
  };
};

export const validatePoData = (poData: {
  poNumber: string;
  productCode: string;
  customerName: string;
  poCreatedDate: string;
  poReceivedDate: string;
  orderedQtyPieces: number;
  customerAmount: number;
}): string[] => {
  const errors: string[] = [];

  if (!poData.poNumber?.trim()) {
    errors.push('PO Number is required');
  }

  if (!poData.productCode?.trim()) {
    errors.push('Product Code is required');
  }

  if (!poData.customerName?.trim()) {
    errors.push('Customer Name is required');
  }

  if (!poData.poCreatedDate) {
    errors.push('PO Created Date is required');
  }

  if (!poData.poReceivedDate) {
    errors.push('PO Received Date is required');
  }

  if (!poData.orderedQtyPieces || poData.orderedQtyPieces <= 0) {
    errors.push('Ordered Quantity must be greater than 0');
  }

  if (!poData.customerAmount || poData.customerAmount <= 0) {
    errors.push('Customer Amount must be greater than 0');
  }

  // Validate dates
  try {
    const createdDate = new Date(poData.poCreatedDate);
    const receivedDate = new Date(poData.poReceivedDate);
    
    if (isNaN(createdDate.getTime())) {
      errors.push('Invalid PO Created Date format');
    }
    
    if (isNaN(receivedDate.getTime())) {
      errors.push('Invalid PO Received Date format');
    }
    
    if (createdDate > receivedDate) {
      errors.push('PO Created Date cannot be after PO Received Date');
    }
  } catch (error) {
    errors.push('Invalid date format');
  }

  return errors;
};

export const getPoStatusColor = (statuses: string[]): string => {
  if (statuses.includes('Completed') || statuses.includes('Despatched/ Completed')) {
    return 'green';
  }
  if (statuses.includes('PO Check')) {
    return 'red';
  }
  if (statuses.includes('In Progress')) {
    return 'yellow';
  }
  if (statuses.includes('Open')) {
    return 'blue';
  }
  return 'gray';
};

export const formatPoStatus = (statuses: string[]): string => {
  if (!statuses || statuses.length === 0) {
    return 'Open';
  }
  return statuses.join(', ');
};

// BLOCK 8: Export the service class and default export
export { PurchaseOrderService };
export default purchaseOrderService;

// BLOCK 9: Type exports for convenience
export type {
  PaginatedPoResponse,
  PurchaseOrder,
  Product,
  PoStatus
} from '../types/mrp.types';