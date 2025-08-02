// BLOCK 1: Imports
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { Component } from "../types/mrp.types"; // Note: We still use the 'Component' type
import * as XLSX from "xlsx";

// BLOCK 2: Constants
const SOH_COLLECTION_NAME = "SOH";

// BLOCK 3: Fetch All SOH Records
export const getAllSoh = async (): Promise<Component[]> => {
  const q = query(collection(db, SOH_COLLECTION_NAME), orderBy("partCode"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Component)
  );
};

// BLOCK 4: SOH Import Function
export const importSohData = async (
  file: File
): Promise<{ successCount: number; errorCount: number }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  });

  if (!rows || rows.length < 2) {
    throw new Error("No data found in the Excel file.");
  }

  const headerRow = rows[0].map((h) => String(h || "").trim());
  const dataRows = rows.slice(1);

  const normalize = (str: string) => str.replace(/\s+/g, "").toLowerCase();
  const partCodeIndex = headerRow.findIndex(
    (h) => normalize(h) === "productid"
  );
  const sohIndex = headerRow.findIndex((h) => normalize(h) === "stockonhand");
  const descriptionIndex = headerRow.findIndex(
    (h) => normalize(h) === "description"
  );

  if (partCodeIndex === -1)
    throw new Error("Could not find 'Product ID' column.");
  if (sohIndex === -1)
    throw new Error("Could not find 'Stock on Hand' column.");

  const batch = writeBatch(db);
  let successCount = 0;
  let errorCount = 0;

  dataRows.forEach((row) => {
    const partCode = row[partCodeIndex];
    const stock = row[sohIndex];

    if (
      partCode &&
      String(partCode).trim() !== "" &&
      stock !== null &&
      !isNaN(Number(stock))
    ) {
      const docRef = doc(db, SOH_COLLECTION_NAME, String(partCode));
      const dataToSet = {
        partCode: String(partCode),
        description:
          descriptionIndex !== -1 && row[descriptionIndex]
            ? String(row[descriptionIndex])
            : "N/A",
        stock: Number(stock),
        // We no longer need these, as they're not in the SOH file
        // safetyStock: 0,
        // supplierId: 'unknown'
      };

      batch.set(docRef, dataToSet, { merge: true });
      successCount++;
    } else {
      errorCount++;
    }
  });

  try {
    await batch.commit();
    return { successCount, errorCount };
  } catch (error) {
    console.error("SOH import failed: ", error);
    throw new Error("Failed to import SOH data.");
  }
};
