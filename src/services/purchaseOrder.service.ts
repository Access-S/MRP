// BLOCK 1: Imports
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  doc,
  updateDoc,
  deleteField,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { PurchaseOrder, Product, PoStatus } from "../types/mrp.types";

// BLOCK 2: Constants
const PO_COLLECTION_NAME = "purchaseOrders";

// BLOCK 3: checkPoNumberExists Function
export const checkPoNumberExists = async (
  poNumber: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, PO_COLLECTION_NAME),
      where("poNumber", "==", poNumber)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking PO number:", error);
    return true;
  }
};

// BLOCK 4: createNewPurchaseOrder Function (FINAL CORRECTED VERSION)
export const createNewPurchaseOrder = async (
  poData: Omit<
    PurchaseOrder,
    | "id"
    | "sequence"
    | "poCreatedDate"
    | "poReceivedDate"
    | "requestedDeliveryDate"
    | "deliveryDate"
    | "deliveryDocketNumber"
    | "components"
  > & { poCreatedDate: string; poReceivedDate: string }
): Promise<string> => {
  const counterRef = doc(db, "metadata", "poCounters");
  const poCollectionRef = collection(db, PO_COLLECTION_NAME);

  try {
    const newPoId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      const currentSequence = counterDoc.exists()
        ? counterDoc.data()[poData.customerName] || 0
        : 0;
      const nextSequence = currentSequence + 1;

      const newPoDocRef = doc(poCollectionRef);

      const dataToSave = {
        poNumber: poData.poNumber,
        productCode: poData.productCode,
        description: poData.description,
        minsPerShipper: poData.minsPerShipper,
        hourlyRunRate: poData.hourlyRunRate,
        customerName: poData.customerName,
        orderedQtyPieces: poData.orderedQtyPieces,
        customerAmount: poData.customerAmount,
        orderedQtyShippers: poData.orderedQtyShippers,
        systemAmount: poData.systemAmount,
        status: poData.status,
        sequence: nextSequence,
        createdAt: serverTimestamp(),
        poCreatedDate: Timestamp.fromDate(new Date(poData.poCreatedDate)),
        poReceivedDate: Timestamp.fromDate(new Date(poData.poReceivedDate)),
      };

      transaction.set(newPoDocRef, dataToSave);

      transaction.set(
        counterRef,
        { [poData.customerName]: nextSequence },
        { merge: true }
      );

      return newPoDocRef.id;
    });

    console.log(`PO created with ID: ${newPoId}`);
    return newPoId;
  } catch (error) {
    console.error("PO Creation Transaction failed: ", error);
    throw new Error("Could not create Purchase Order.");
  }
};

// BLOCK 5: getAllPurchaseOrders Function (Final Version)
export const getAllPurchaseOrders = async (
  allProducts: Product[],
  sortDirection: "asc" | "desc" = "desc"
): Promise<PurchaseOrder[]> => {
  try {
    const poQuery = query(
      collection(db, PO_COLLECTION_NAME),
      orderBy("sequence", sortDirection)
    );

    const querySnapshot = await getDocs(poQuery);

    const purchaseOrders: PurchaseOrder[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      const productDetails = allProducts.find(
        (p) => p.productCode === data.productCode
      );
      return {
        id: doc.id,
        poNumber: data.poNumber,
        productCode: data.productCode,

        description: data.description || "N/A",
        minsPerShipper: data.minsPerShipper || 0,
        hourlyRunRate: data.hourlyRunRate || 0,

        components: productDetails?.components || [],
        customerName: data.customerName || "N/A",
        status: data.status || ["PO Check"],

        poCreatedDate: (data.poCreatedDate as Timestamp).toDate(),
        poReceivedDate: (data.poReceivedDate as Timestamp).toDate(),
        requestedDeliveryDate: data.requestedDeliveryDate
          ? (data.requestedDeliveryDate as Timestamp).toDate()
          : new Date(),
        orderedQtyShippers: data.orderedQtyShippers,
        systemAmount: data.systemAmount,
        orderedQtyPieces: data.orderedQtyPieces || 0,
        customerAmount: data.customerAmount || 0,
        deliveryDate: data.deliveryDate
          ? (data.deliveryDate as Timestamp).toDate()
          : undefined,
        deliveryDocketNumber: data.deliveryDocketNumber || undefined,
        sequence: data.sequence,
      };
    });

    return purchaseOrders;
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return [];
  }
};

// BLOCK 6: updatePoStatus Function
export const updatePoStatus = async (
  poId: string,
  newStatus: PoStatus,
  currentStatuses: PoStatus[]
): Promise<PoStatus[]> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  let updatedStatusArray: PoStatus[];

  if (currentStatuses.includes(newStatus)) {
    updatedStatusArray = currentStatuses.filter((s) => s !== newStatus);
  } else {
    updatedStatusArray = [...currentStatuses, newStatus];
  }

  if (updatedStatusArray.length === 0) {
    updatedStatusArray = ["Open"];
  }

  await updateDoc(poDocRef, { status: updatedStatusArray });
  return updatedStatusArray;
};

// BLOCK 7: resolvePoCheck Function
export const resolvePoCheck = async (
  po: PurchaseOrder,
  product: Product
): Promise<void> => {
  const unitsPerShipper = product.unitsPerShipper || 0;
  if (unitsPerShipper === 0)
    throw new Error("Product is missing 'unitsPerShipper' data in BOM.");

  const pricePerShipper = product.pricePerShipper || 0;
  const shippers = po.orderedQtyPieces / unitsPerShipper;
  const systemAmount = shippers * pricePerShipper;
  const amountDifference = Math.abs(po.customerAmount - systemAmount);

  if (amountDifference > 5) {
    throw new Error(
      `Amount mismatch still exists. Difference is $${amountDifference.toFixed(
        2
      )}. Please correct the PO details first.`
    );
  }

  const poDocRef = doc(db, PO_COLLECTION_NAME, po.id);
  await updateDoc(poDocRef, { status: ["Open"] });
};

// BLOCK 8: despatchPo Function
export const despatchPo = async (
  poId: string,
  deliveryDate: string,
  docketNumber: string
): Promise<void> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  await updateDoc(poDocRef, {
    status: ["Despatched/ Completed"],
    deliveryDate: Timestamp.fromDate(new Date(deliveryDate)),
    deliveryDocketNumber: docketNumber,
  });
};

// BLOCK 9: updatePurchaseOrder Function
export const updatePurchaseOrder = async (
  poId: string,
  newData: { orderedQtyPieces: number; customerAmount: number },
  product: Product
): Promise<void> => {
  const unitsPerShipper = product.unitsPerShipper || 0;
  if (unitsPerShipper === 0)
    throw new Error("Product is missing 'unitsPerShipper' data in BOM.");

  const pricePerShipper = product.pricePerShipper || 0;
  const newShippers = newData.orderedQtyPieces / unitsPerShipper;
  const newSystemAmount = newShippers * pricePerShipper;
  const amountDifference = Math.abs(newData.customerAmount - newSystemAmount);
  const newStatus: PoStatus[] = amountDifference > 5 ? ["PO Check"] : ["Open"];

  const dataToUpdate = {
    ...newData,
    orderedQtyShippers: newShippers,
    systemAmount: newSystemAmount,
    status: newStatus,
  };

  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  await updateDoc(poDocRef, dataToUpdate);
};

// BLOCK 10: reopenDespatchedPo Function
export const reopenDespatchedPo = async (poId: string): Promise<void> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  try {
    await updateDoc(poDocRef, {
      status: ["Open"],
      deliveryDate: deleteField(),
      deliveryDocketNumber: deleteField(),
    });
  } catch (error) {
    console.error("Error re-opening PO: ", error);
    throw new Error("Could not re-open Purchase Order.");
  }
};

// BLOCK 11: deletePurchaseOrder Function
export const deletePurchaseOrder = async (poId: string): Promise<void> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  try {
    await deleteDoc(poDocRef);
  } catch (error) {
    console.error("Error deleting PO: ", error);
    throw new Error("Could not delete Purchase Order.");
  }
};
// BLOCK 12: getTotalPurchaseOrdersCount Function (NEW)
import { getCountFromServer } from "firebase/firestore"; // Add this to your firestore imports at the top

export const getTotalPurchaseOrdersCount = async (): Promise<number> => {
  try {
    const poCollection = collection(db, PO_COLLECTION_NAME);
    const snapshot = await getCountFromServer(poCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting total PO count:", error);
    return 0;
  }
};
// BLOCK 13: getPurchaseOrdersPaginated Function (NEW)
import {
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDocs,
  limitToLast,
  QueryDocumentSnapshot,
} from "firebase/firestore"; // Add/update these imports

// Define the return type for our new function
export interface PaginatedPoResponse {
  purchaseOrders: PurchaseOrder[];
  firstVisibleDoc: QueryDocumentSnapshot | null;
  lastVisibleDoc: QueryDocumentSnapshot | null;
}

export const getPurchaseOrdersPaginated = async (
  allProducts: Product[],
  options: {
    sortDirection?: "asc" | "desc";
    itemsPerPage?: number;
    direction?: "next" | "prev";
    cursor?: QueryDocumentSnapshot;
  }
): Promise<PaginatedPoResponse> => {
  const {
    sortDirection = "desc",
    itemsPerPage = 25,
    direction,
    cursor,
  } = options;

  const poCollection = collection(db, PO_COLLECTION_NAME);
  let poQuery;

  if (direction === "next" && cursor) {
    // Get the next page
    poQuery = query(
      poCollection,
      orderBy("sequence", sortDirection),
      startAfter(cursor),
      limit(itemsPerPage)
    );
  } else if (direction === "prev" && cursor) {
    // Get the previous page
    poQuery = query(
      poCollection,
      orderBy("sequence", sortDirection),
      endBefore(cursor),
      limitToLast(itemsPerPage)
    );
  } else {
    // Get the first page
    poQuery = query(
      poCollection,
      orderBy("sequence", sortDirection),
      limit(itemsPerPage)
    );
  }

  const documentSnapshots = await getDocs(poQuery);

  const purchaseOrders: PurchaseOrder[] = documentSnapshots.docs.map((doc) => {
    const data = doc.data();
    const productDetails = allProducts.find(
      (p) => p.productCode === data.productCode
    );
    return {
      id: doc.id,
      // ... (all the other fields like description, hourlyRunRate, etc.)
      poNumber: data.poNumber,
      productCode: data.productCode,
      description: data.description || "N/A",
      minsPerShipper: data.minsPerShipper || 0,
      hourlyRunRate: data.hourlyRunRate || 0,
      components: productDetails?.components || [],
      customerName: data.customerName || "N/A",
      status: data.status || ["PO Check"],
      poCreatedDate: (data.poCreatedDate as Timestamp).toDate(),
      poReceivedDate: (data.poReceivedDate as Timestamp).toDate(),
      requestedDeliveryDate: data.requestedDeliveryDate
        ? (data.requestedDeliveryDate as Timestamp).toDate()
        : new Date(),
      orderedQtyShippers: data.orderedQtyShippers,
      systemAmount: data.systemAmount,
      orderedQtyPieces: data.orderedQtyPieces || 0,
      customerAmount: data.customerAmount || 0,
      deliveryDate: data.deliveryDate
        ? (data.deliveryDate as Timestamp).toDate()
        : undefined,
      deliveryDocketNumber: data.deliveryDocketNumber || undefined,
      sequence: data.sequence,
    };
  });

  const firstVisibleDoc = documentSnapshots.docs[0] || null;
  const lastVisibleDoc =
    documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;

  return { purchaseOrders, firstVisibleDoc, lastVisibleDoc };
};
