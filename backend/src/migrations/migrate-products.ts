import { firestoreDb } from '../config/firebase';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

// Define a type for the data we expect from Firestore to ensure type safety
interface FirestoreProduct {
  productCode: string;
  description: string;
  unitsPerShipper?: number;
  dailyRunRate?: number;
  hourlyRunRate?: number;
  minsPerShipper?: number;
  pricePerShipper?: number;
  // Add any other fields that exist on your Firestore product documents
}

export const migrateProducts = async (req: Request, res: Response) => {
  try {
    console.log('Starting product migration...');
    const startTime = Date.now();

    // 1. Fetch all products from the Firestore 'BOM' collection
    const productsSnapshot = await firestoreDb.collection('BOM').get();
    if (productsSnapshot.empty) {
      return res.status(404).send('No products found in Firestore collection "BOM".');
    }
    const firestoreProducts = productsSnapshot.docs.map(doc => doc.data() as FirestoreProduct);
    console.log(`Step 1: Fetched ${firestoreProducts.length} products from Firestore.`);

    // 2. Transform the data to match the new Supabase 'products' table schema
    // Note: We use snake_case for Supabase column names
    const productsToInsert = firestoreProducts.map(p => ({
      product_code: p.productCode,
      description: p.description,
      units_per_shipper: p.unitsPerShipper,
      daily_run_rate: p.dailyRunRate,
      hourly_run_rate: p.hourlyRunRate,
      mins_per_shipper: p.minsPerShipper,
      price_per_shipper: p.pricePerShipper,
    }));
    console.log('Step 2: Transformed data for Supabase schema.');

    // 3. Insert the transformed data into the Supabase 'products' table
    // We use .upsert() which is great for re-running migrations.
    // It will update existing products (based on the product_code) or insert new ones.
    const { error } = await supabase
      .from('products')
      .upsert(productsToInsert, {
        onConflict: 'product_code', // If a product with the same code exists, update it
        ignoreDuplicates: false
      });
    
    if (error) {
      // If Supabase returns an error, throw it to be caught by our catch block
      throw error;
    }
    console.log('Step 3: Successfully inserted/updated products in Supabase.');

    const duration = (Date.now() - startTime) / 1000; // Duration in seconds
    res.status(200).json({
      message: `Product migration successful! Migrated ${productsToInsert.length} products in ${duration.toFixed(2)} seconds.`,
    });

  } catch (error: any) {
    console.error('Product migration failed:', error);
    res.status(500).json({
      message: 'Product migration failed.',
      error: error.message,
    });
  }
};