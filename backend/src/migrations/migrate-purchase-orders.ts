import { firestoreDb } from '../config/firebase';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';
import { Timestamp } from 'firebase-admin/firestore';

// A type for the data we expect from Firestore
interface FirestorePO {
  poNumber: string;
  sequence: number;
  productCode: string;
  customerName: string;
  poCreatedDate: Timestamp;
  poReceivedDate: Timestamp;
  requestedDeliveryDate?: Timestamp;
  orderedQtyPieces: number;
  orderedQtyShippers: number;
  customerAmount: number;
  systemAmount: number;
  status: string[];
  deliveryDate?: Timestamp;
  deliveryDocketNumber?: string;
  description?: string; // <-- ADDED THIS
  hourlyRunRate?: number; // <-- ADDED THIS
  minsPerShipper?: number; // <-- ADDED THIS
}

export const migratePurchaseOrders = async (req: Request, res: Response) => {
  try {
    console.log('Starting Purchase Order migration...');
    const startTime = Date.now();

    // Step 1: Fetch all products from Supabase into a Map for easy lookup.
    const { data: products, error: productError } = await supabase.from('products').select('id, product_code');
    if (productError) throw productError;
    const productMap = new Map(products.map(p => [p.product_code, p.id]));
    console.log(`Step 1: Fetched ${productMap.size} products from Supabase for lookup.`);

    // Step 2: Fetch all purchase orders from Firestore.
    const poSnapshot = await firestoreDb.collection('purchaseOrders').get();
    if (poSnapshot.empty) {
      return res.status(404).send('No purchase orders found in Firestore.');
    }
    const firestorePOs = poSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as FirestorePO }));
    console.log(`Step 2: Fetched ${firestorePOs.length} POs from Firestore.`);

    // Step 3: Transform Firestore POs for insertion into Supabase 'purchase_orders' table.
    const posToInsert = firestorePOs.map(po => {
      const currentStatus = (po.status && po.status.length > 0) ? po.status[po.status.length - 1] : 'Open';

      return {
        po_number: po.poNumber,
        sequence: po.sequence,
        customer_name: po.customerName,
        ordered_qty_pieces: po.orderedQtyPieces,
        ordered_qty_shippers: po.orderedQtyShippers,
        customer_amount: po.customerAmount,
        system_amount: po.systemAmount,
        current_status: currentStatus,
        delivery_docket_number: po.deliveryDocketNumber,
        description: po.description, // <-- ADDED THIS
        hourly_run_rate: po.hourlyRunRate, // <-- ADDED THIS
        mins_per_shipper: po.minsPerShipper, // <-- ADDED THIS
        product_id: productMap.get(po.productCode) || null,
        po_created_date: po.poCreatedDate?.toDate().toISOString(),
        po_received_date: po.poReceivedDate?.toDate().toISOString(),
        requested_delivery_date: po.requestedDeliveryDate?.toDate().toISOString(),
        delivery_date: po.deliveryDate?.toDate().toISOString(),
      };
    }).filter(po => po.product_id !== null);

    console.log(`Step 3: Transformed ${posToInsert.length} POs for Supabase.`);
    if (posToInsert.length < firestorePOs.length) {
        console.warn(`Warning: ${firestorePOs.length - posToInsert.length} POs were skipped due to missing product codes.`);
    }
    
    // Step 4: Insert the transformed POs and get their new IDs back.
    const { data: insertedPOs, error: poInsertError } = await supabase
        .from('purchase_orders')
        .insert(posToInsert)
        .select('id, po_number');

    if (poInsertError) throw poInsertError;
    console.log(`Step 4: Successfully inserted ${insertedPOs.length} POs into the purchase_orders table.`);

    // Step 5: Create the status history records.
    const poIdMap = new Map(insertedPOs.map(p => [p.po_number, p.id]));
    let statusHistoryToInsert = [];

    for (const firestorePo of firestorePOs) {
        const newPoId = poIdMap.get(firestorePo.poNumber);
        if (newPoId && firestorePo.status) {
            for (const status of firestorePo.status) {
                statusHistoryToInsert.push({
                    po_id: newPoId,
                    status: status
                });
            }
        }
    }
    
    const { error: statusInsertError } = await supabase.from('po_status_history').insert(statusHistoryToInsert);
    if (statusInsertError) throw statusInsertError;
    console.log(`Step 5: Successfully inserted ${statusHistoryToInsert.length} records into po_status_history.`);

    const duration = (Date.now() - startTime) / 1000;
    res.status(200).json({
        message: `PO migration successful! Migrated ${insertedPOs.length} POs and ${statusHistoryToInsert.length} status events in ${duration.toFixed(2)} seconds.`,
    });

  } catch (error: any) {
    console.error('PO migration failed:', error);
    res.status(500).json({ message: 'PO migration failed.', error: error.message });
  }
};