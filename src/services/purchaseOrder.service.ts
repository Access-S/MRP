// BLOCK 1: Imports
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  doc,
  updateDoc,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { PurchaseOrder, Product, PoStatus } from "../types/mrp.types";

// BLOCK 2: Constants
const PO_COLLECTION_NAME = "purchaseOrders";

// BLOCK 3: checkPoNumberExists Function (Unchanged)
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

// BLOCK 4: createNewPurchaseOrder Function (Unchanged)
export const createNewPurchaseOrder = async (
  poData: Omit<
    PurchaseOrder,
    | "id"
    | "poCreatedDate"
    | "poReceivedDate"
    | "requestedDeliveryDate"
    | "deliveryDate"
    | "deliveryDocketNumber"
    | "description"
    | "minsPerShipper"
    | "components"
  > & { poCreatedDate: string; poReceivedDate: string }
): Promise<string> => {
  try {
    const dataToSave = {
      ...poData,
      poCreatedDate: Timestamp.fromDate(new Date(poData.poCreatedDate)),
      poReceivedDate: Timestamp.fromDate(new Date(poData.poReceivedDate)),
    };
    const docRef = await addDoc(collection(db, PO_COLLECTION_NAME), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Could not create Purchase Order.");
  }
};

// BLOCK 5: getAllPurchaseOrders Function (Unchanged)
export const getAllPurchaseOrders = async (
  allProducts: Product[]
): Promise<PurchaseOrder[]> => {
  try {
    const poQuery = query(
      collection(db, PO_COLLECTION_NAME),
      orderBy("poReceivedDate", "desc")
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
        description: productDetails?.description || "N/A",
        minsPerShipper: productDetails?.minsPerShipper || 0,
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
      };
    });

    return purchaseOrders;
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return [];
  }
};

// BLOCK 6: updatePoStatus Function (Simplified)
// This function's only job is to toggle normal statuses.
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
  return updatedStatusArray; // Return the new array for optimistic updates
};

// BLOCK 7: resolvePoCheck Function (Unchanged)
export const resolvePoCheck = async (
  po: PurchaseOrder,
  product: Product
): Promise<void> => {
  if (!product.components || !po)
    throw new Error("Missing product or PO data for validation.");
  const perShipper =
    product.components.find((c) => c.partType === "Bulk - Supplied")
      ?.perShipper || 0;
  if (perShipper === 0)
    throw new Error("Product is missing 'Bulk - Supplied' component details.");

  const pricePerShipper = product.pricePerShipper || 0;
  const shippers = po.orderedQtyPieces / perShipper;
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

// BLOCK 8: despatchPo Function (Unchanged)
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

// BLOCK 9: updatePurchaseOrder Function (Unchanged)
export const updatePurchaseOrder = async (
  poId: string,
  newData: { orderedQtyPieces: number; customerAmount: number },
  product: Product
): Promise<void> => {
  const perShipper =
    product.components.find((c) => c.partType === "Bulk - Supplied")
      ?.perShipper || 0;
  if (perShipper === 0)
    throw new Error("Product is missing 'Bulk - Supplied' component details.");

  const pricePerShipper = product.pricePerShipper || 0;
  const newShippers = newData.orderedQtyPieces / perShipper;
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

// BLOCK 10: NEW reopenDespatchedPo Function
/**
 * Reverts a "Despatched/ Completed" PO back to "Open" status and removes delivery details.
 * @param poId The ID of the Purchase Order to re-open.
 */
export const reopenDespatchedPo = async (poId: string): Promise<void> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  try {
    await updateDoc(poDocRef, {
      status: ["Open"],
      deliveryDate: deleteField(), // Removes the field from the document
      deliveryDocketNumber: deleteField(), // Removes the field from the document
    });
    console.log(`Successfully re-opened PO ${poId}`);
  } catch (error) {
    console.error("Error re-opening PO: ", error);
    throw new Error("Could not re-open Purchase Order.");
  }
};

// BLOCK 11: NEW deletePurchaseOrder Function
/**
 * Deletes a Purchase Order document from Firestore.
 * @param poId The ID of the Purchase Order to delete.
 */
export const deletePurchaseOrder = async (poId: string): Promise<void> => {
  const poDocRef = doc(db, PO_COLLECTION_NAME, poId);
  try {
    await deleteDoc(poDocRef);
    console.log(`Successfully deleted PO ${poId}`);
  } catch (error) {
    console.error("Error deleting PO: ", error);
    throw new Error("Could not delete Purchase Order.");
  }
};
