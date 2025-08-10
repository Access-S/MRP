// BLOCK 1: Imports
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// BLOCK 2: getPurchaseOrders Function
export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const searchQuery = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const sortDirection = (req.query.sort_direction as string) || 'desc';
    const offset = (page - 1) * limit;

    const query = supabase
      .rpc('search_purchase_orders', {
          search_term: searchQuery,
          status_filter: statusFilter
        }, { count: 'exact' }
      )
      .select(`*, product:products(product_code, description), statuses:po_status_history(status)`)
      .order('sequence', { ascending: sortDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.status(200).json({
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch purchase orders.', error: error.message });
  }
};

// BLOCK 3: updatePoStatus Function
export const updatePoStatus = async (req: Request, res: Response) => {
  try {
    const { poId } = req.params;
    const { status } = req.body;
    if (!status) { return res.status(400).json({ message: 'Status is required.' }); }

    const { data, error } = await supabase.rpc('toggle_po_status', {
      target_po_id: poId,
      status_to_toggle: status
    });

    if (error) throw error;
    const updatedStatuses = data.length > 0 && data[0].statuses ? data[0].statuses : ['Open'];
    res.status(200).json({ statuses: updatedStatuses });

  } catch (error: any) {
    console.error('Error updating PO status:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update PO status.', error: error.message });
  }
};

// BLOCK 4: createPurchaseOrder Function
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const {
      poNumber, productCode, customerName, poCreatedDate,
      poReceivedDate, orderedQtyPieces, customerAmount
    } = req.body;

    if (!poNumber || !productCode || !customerName || !poCreatedDate || !poReceivedDate || !orderedQtyPieces || !customerAmount) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_new_po', {
        p_po_number: poNumber,
        p_product_code: productCode,
        p_customer_name: customerName,
        p_po_created_date: poCreatedDate,
        p_po_received_date: poReceivedDate,
        p_ordered_qty_pieces: orderedQtyPieces,
        p_customer_amount: customerAmount
    });
    
    if (rpcError) {
        return res.status(400).json({ message: rpcError.message });
    }

    const newPoId = rpcData[0].created_po_id;

    const { data: newPo, error: fetchError } = await supabase
        .from('purchase_orders')
        .select(`*, product:products(product_code, description), statuses:po_status_history(status)`)
        .eq('id', newPoId)
        .single();
    
    if (fetchError) throw fetchError;

    res.status(201).json(newPo);

  } catch (error: any) {
    console.error('Error creating PO:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create purchase order.', error: error.message });
  }
};