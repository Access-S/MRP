// BLOCK 1: Imports
import { PurchaseOrder } from '../types/mrp.types';

// BLOCK 2: Enhanced Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedApiResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  success: false;
  message: string;
  details?: string;
}

// BLOCK 3: Configuration - FIXED
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`  // Add /api suffix when using full URL
  : '/api';  // Default for local development
  console.log('🔗 API Base URL:', API_BASE_URL); // Debug log
// BLOCK 4: Enhanced HTTP Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

private async request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${this.baseURL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If error response isn't JSON, use status text
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// BLOCK 5: API Client Instance
const apiClient = new ApiClient(API_BASE_URL);

// BLOCK 6: Purchase Orders API
export const fetchPurchaseOrders = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortDirection?: 'asc' | 'desc';
}): Promise<PaginatedApiResponse<PurchaseOrder>> => {
  const { 
    page = 1, 
    limit = 25, 
    search = '', 
    status = '', 
    sortDirection = 'desc' 
  } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    status,
    sort_direction: sortDirection,
  });

  return apiClient.get<PaginatedApiResponse<PurchaseOrder>>(
    `/purchase-orders?${params.toString()}`
  );
};

export const fetchPoById = async (poId: string): Promise<ApiResponse<PurchaseOrder>> => {
  if (!poId) {
    throw new Error('Purchase Order ID is required');
  }
  
  return apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${poId}`);
};

export const createPo = async (poData: {
  poNumber: string;
  productCode: string;
  customerName: string;
  poCreatedDate: string;
  poReceivedDate: string;
  orderedQtyPieces: number;
  customerAmount: number;
}): Promise<ApiResponse<PurchaseOrder>> => {
  // Validate required fields
  const requiredFields = [
    'poNumber', 'productCode', 'customerName', 
    'poCreatedDate', 'poReceivedDate', 'orderedQtyPieces', 'customerAmount'
  ];
  
  for (const field of requiredFields) {
    if (!poData[field as keyof typeof poData]) {
      throw new Error(`${field} is required`);
    }
  }

  return apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', poData);
};

export const updatePo = async (
  poId: string, 
  poData: Partial<{
    poNumber: string;
    customerName: string;
    poCreatedDate: string;
    poReceivedDate: string;
    orderedQtyPieces: number;
    customerAmount: number;
  }>
): Promise<ApiResponse<PurchaseOrder>> => {
  if (!poId) {
    throw new Error('Purchase Order ID is required');
  }

  return apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${poId}`, poData);
};

export const updatePurchaseOrderStatus = async (
  poId: string, 
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
): Promise<ApiResponse<{ statuses: string[] }>> => {
  if (!poId) {
    throw new Error('Purchase Order ID is required');
  }
  
  if (!status) {
    throw new Error('Status is required');
  }

  return apiClient.patch<ApiResponse<{ statuses: string[] }>>(
    `/purchase-orders/${poId}/status`, 
    { status }
  );
};

export const deletePo = async (poId: string): Promise<ApiResponse<void>> => {
  if (!poId) {
    throw new Error('Purchase Order ID is required');
  }

  return apiClient.delete<ApiResponse<void>>(`/purchase-orders/${poId}`);
};

// BLOCK 7: Products API
export const fetchAllProducts = async (): Promise<ApiResponse<any[]>> => {
  return apiClient.get<ApiResponse<any[]>>('/products');
};

export const fetchBomForProduct = async (productId: string): Promise<ApiResponse<any[]>> => {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  return apiClient.get<ApiResponse<any[]>>(`/products/${productId}/bom`);
};

export const fetchEnrichedBomForProduct = async (productId: string): Promise<ApiResponse<any>> => {
  if (!productId) {
    throw new Error('Product ID is required');
  }
  // This is the new function that calls our enriched BOM endpoint.
  return apiClient.get<ApiResponse<any>>(`/products/${productId}/enriched-bom`);
};

// BLOCK 8: Utility Functions
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isApiResponse = <T>(response: any): response is ApiResponse<T> => {
  return response && typeof response === 'object' && 'success' in response;
};

export const isPaginatedResponse = <T>(response: any): response is PaginatedApiResponse<T> => {
  return isApiResponse(response) && 'pagination' in response;
};

// BLOCK 9: Export API Client for custom requests
export { apiClient };