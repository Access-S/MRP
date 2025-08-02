// BLOCK 1: Imports
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { db } from "../firebase.config";
import { PurchaseOrder, Component, Product } from "../types/mrp.types";

// BLOCK 2: Interface for Dashboard Data
export interface DashboardStats {
  openPoCount: number;
  totalOpenValue: number;
  componentsAtRiskCount: number;
  attentionPoCount: number;
  totalOpenWorkHours: number; // 👈 NEW METRIC
  averageTurnaroundDays: number; // 👈 NEW METRIC
}

// BLOCK 3: The Main Stats Fetching Function
/**
 * Fetches and calculates all the key statistics for the main dashboard.
 * @returns A promise that resolves to a DashboardStats object.
 */
export const getDashboardStats = async (
  allProducts: Product[]
): Promise<DashboardStats> => {
  // Now accepts products
  try {
    // 1. Fetch all Purchase Orders
    const poQuery = query(collection(db, "purchaseOrders"));
    const poSnapshot = await getDocs(poQuery);
    // Convert Timestamps to Dates immediately
    const allPOs = poSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        poCreatedDate: (data.poCreatedDate as Timestamp).toDate(),
        poReceivedDate: (data.poReceivedDate as Timestamp).toDate(),
        deliveryDate: data.deliveryDate
          ? (data.deliveryDate as Timestamp).toDate()
          : undefined,
      } as PurchaseOrder;
    });

    // 2. Fetch all Components
    const compQuery = query(collection(db, "SOH"));
    const compSnapshot = await getDocs(compQuery);
    const allComponents = compSnapshot.docs.map(
      (doc) => doc.data() as Component
    );

    // 3. Calculate Stats
    let openPoCount = 0;
    let totalOpenValue = 0;
    let attentionPoCount = 0;
    let totalOpenWorkHours = 0;
    let totalTurnaroundDays = 0;
    let completedPoCount = 0;

    allPOs.forEach((po) => {
      const productDetails = allProducts.find(
        (p) => p.productCode === po.productCode
      );
      const prodTimeHours =
        (po.orderedQtyShippers * (productDetails?.minsPerShipper || 0)) / 60;

      if (!po.status.includes("Despatched/ Completed")) {
        openPoCount++;
        totalOpenValue += po.systemAmount || 0;
        totalOpenWorkHours += prodTimeHours; // Add to total open hours
      } else {
        // Calculate Turnaround Days for completed POs
        if (po.deliveryDate) {
          const receivedDate = po.poReceivedDate;
          const deliveryDate = po.deliveryDate;
          // Calculate difference in time, then convert to days
          const diffTime = Math.abs(
            deliveryDate.getTime() - receivedDate.getTime()
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalTurnaroundDays += diffDays;
          completedPoCount++;
        }
      }

      if (po.status.includes("PO Check")) {
        attentionPoCount++;
      }
    });

    const componentsAtRiskCount = allComponents.filter(
      (c) => c.stock < c.safetyStock
    ).length;
    const averageTurnaroundDays =
      completedPoCount > 0 ? totalTurnaroundDays / completedPoCount : 0;

    return {
      openPoCount,
      totalOpenValue,
      componentsAtRiskCount,
      attentionPoCount,
      totalOpenWorkHours,
      averageTurnaroundDays,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Return zeroed-out data on error
    return {
      openPoCount: 0,
      totalOpenValue: 0,
      componentsAtRiskCount: 0,
      attentionPoCount: 0,
      totalOpenWorkHours: 0,
      averageTurnaroundDays: 0,
    };
  }
};
