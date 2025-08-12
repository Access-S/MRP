// BLOCK 1: Imports
import { PurchaseOrder } from '../types/mrp.types';

// BLOCK 2: Interfaces
export interface PaginatedApiResponse {
  data: any[];
  pagination: { total: number; page: number; limit: number; totalPages: number; };
}

// BLOCK 3: Constants
const API_BASE_URL = '/api';

// BLOCK 4: fetchPurchaseOrders Function
export const fetchPurchaseOrders = async (options: { page?: number; limit?: number; search?: string; status?: string; sortDirection?: 'asc' | 'desc'; }): Promise<PaginatedApiResponse> => {
  const { page = 1, limit = 25, search = '', status = '', sortDirection = 'desc' } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, status, sort_direction: sortDirection, });
  const response = await fetch(`${API_BASE_URL}/purchase-orders?${params.toString()}`);
  if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to fetch purchase orders.'); }
  return response.json();
};

// BLOCK 5: updatePurchaseOrderStatus Function
export const updatePurchaseOrderStatus = async (poId: string, status: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }), });
  if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to update status.'); }
  const result = await response.json();
  return result.statuses;
};

// BLOCK 6: createPo Function
export const createPo = async (poData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/purchase-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(poData) });
  if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to create purchase order.'); }
  return response.json();
};

// BLOCK 7: fetchAllProducts Function
export const fetchAllProducts = async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to fetch products.'); }
    return response.json();
};

// BLOCK 8: fetchPoById Function
export const fetchPoById = async (poId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`);
    if (!response.ok) { throw new Error('Failed to fetch purchase order details.'); }
    return response.json();
};

// BLOCK 9: updatePo Function
export const updatePo = async (poId: string, poData: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(poData) });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to update purchase order.'); }
    return response.json();
};

// BLOCK 10: deletePo Function
export const deletePo = async (poId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, { method: 'DELETE', });
    if (!response.ok) { const errorData = await response.json(); throw new Error('Failed to delete purchase order.'); }
};

// BLOCK 11: fetchBomForProduct Function
export const fetchBomForProduct = async (productId: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/bom`);
    if (!response.ok) { throw new Error('Failed to fetch BOM components.'); }
    return response.json();
};