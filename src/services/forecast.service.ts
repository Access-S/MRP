// BLOCK 1: Imports
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.config";
import * as XLSX from "xlsx";
import { Forecast } from "../types/mrp.types";

// BLOCK 2: Constants
const FORECAST_COLLECTION_NAME = "forecasts";

// BLOCK 3: Helper Functions
/**
 * Parses a month header (e.g., "Jul-25") into a "YYYY-MM" format.
 * @param header The string header to parse.
 * @returns A formatted string like "2025-07" or null if invalid.
 */
const parseMonthHeader = (header: string): string | null => {
  if (typeof header !== "string") return null;
  const parts = header.trim().split("-");
  if (parts.length !== 2) return null;

  const monthMap: { [key: string]: string } = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  const month = monthMap[parts[0].toLowerCase()];
  // Handle both '25' and '2025' year formats
  const yearPart = parts[1];
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

  if (!month || isNaN(parseInt(year))) return null;

  return `${year}-${month}`;
};

// BLOCK 4: The Main Import and Parsing Engine
export const importForecastData = async (file: File): Promise<void> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // --- THIS IS THE FIX ---
  // 1. Get the full range of the sheet
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  // 2. Modify the range to start from the second row (index 1)
  range.s.r = 1; // s = start, r = row. Row 1 is the second row.

  // 3. Convert the sheet to JSON using our new, specific range.
  // This forces sheetjs to use Row 2 as the header row.
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: "mmm-yy",
    range: range,
  });
  // --- END OF FIX ---

  console.log("Parsed JSON data:", jsonData);

  if (!jsonData || jsonData.length === 0) {
    throw new Error("No data found in the Excel file after the header row.");
  }

  const headers = Object.keys(jsonData[0]);
  const productCodeHeader = headers.find(
    (h) => h.toLowerCase().trim() === "product"
  );
  const descriptionHeader = headers.find(
    (h) => h.toLowerCase().trim() === "description"
  );

  if (!productCodeHeader) {
    throw new Error(
      "Could not find a 'Product' column in the file. Please ensure the header row is correct."
    );
  }

  // The rest of the function remains the same
  const promises = jsonData.map(async (row) => {
    const productCode = row[productCodeHeader];
    if (!productCode || String(productCode).trim() === "") return;

    const description = descriptionHeader ? row[descriptionHeader] : "N/A";
    const monthlyForecast: { [key: string]: number } = {};

    for (const key in row) {
      const formattedMonth = parseMonthHeader(key);
      if (formattedMonth) {
        monthlyForecast[formattedMonth] = Number(row[key]) || 0;
      }
    }

    const forecastDoc = {
      productCode: String(productCode),
      description: String(description),
      monthlyForecast,
    };

    const docRef = doc(db, FORECAST_COLLECTION_NAME, String(productCode));
    await setDoc(docRef, forecastDoc, { merge: true });
  });

  await Promise.all(promises);
  console.log("Forecast import processing finished successfully.");
};
// BLOCK 5: NEW getAllForecasts Function
/**
 * Fetches all forecast documents from the Firestore collection.
 * @returns A promise that resolves to an array of Forecast objects.
 */
export const getAllForecasts = async (): Promise<Forecast[]> => {
  const q = query(
    collection(db, FORECAST_COLLECTION_NAME),
    orderBy("productCode")
  );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Forecast)
    );
  } catch (error) {
    console.error("Error fetching forecasts:", error);
    return [];
  }
};
