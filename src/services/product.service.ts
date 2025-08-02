// BLOCK 1: Imports
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase.config";
import { Product } from "../types/mrp.types";

// BLOCK 2: Constants
const PRODUCTS_COLLECTION_NAME = "BOM"; // Your collection name for products

// BLOCK 3: getAllProducts Function
/**
 * Fetches all products from the Firestore collection.
 * @returns A promise that resolves to an array of Product objects.
 */
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const productsQuery = query(collection(db, PRODUCTS_COLLECTION_NAME));
    const querySnapshot = await getDocs(productsQuery);

    const products: Product[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        productCode: data.productCode,
        description: data.description,
        components: data.components || [],
        unitsPerShipper: data.unitsPerShipper, // Ensure this matches the field name in Firestore
        dailyRunRate: data.dailyRunRate,
        hourlyRunRate: data.hourlyRunRate,
        minsPerShipper: data.minsPerShipper,
        pricePerShipper: data.pricePerShipper,
      };
    });

    console.log("Fetched Products:", products);
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};
