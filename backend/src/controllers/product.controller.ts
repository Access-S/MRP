// BLOCK 1: Imports
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// BLOCK 2: getAllProducts Function
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_code', { ascending: true });

    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch products", error: error.message });
  }
};

// BLOCK 3: getBomForProduct Function (NEW)
export const getBomForProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const { data, error } = await supabase
      .from('bom_components')
      .select('*')
      .eq('product_id', productId);

    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch BOM components", error: error.message });
  }
};