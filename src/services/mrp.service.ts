// BLOCK 1: Imports
import {
  Product,
  Forecast,
  Component,
} from "../types/mrp.types";

// BLOCK 2: Interface for the Engine's Output
export interface MonthlyProjection {
  month: string;
  totalDemand: number;
  coveragePercentage: number;
  projectedSoh: number;
}

export interface InventoryProjection {
  component: Component;
  skusUsedIn: string[];
  displayPartType: string;
  displayDescription: string;
  netFourMonthDemand: number;
  projections: MonthlyProjection[];
  overallHealth: "Healthy" | "Risk" | "Shortage";
}

// BLOCK 3: The FINAL, CORRECT MRP Calculation Engine
export const calculateInventoryProjections = (
  components: Component[],
  products: Product[],
  forecasts: Forecast[]
): InventoryProjection[] => {
  // This is the full, correct type definition for the Map
  const componentMasterMap = new Map<
    string,
    {
      demand: { [month: string]: number };
      skus: Set<string>;
      partTypes: Set<string>;
      descriptions: Set<string>;
    }
  >();

  // Step 1: Aggregate data from BOMs and Forecasts
  products.forEach((product) => {
    const forecast = forecasts.find(
      (f) => f.productCode === product.productCode
    );
    if (!forecast) return;

    product.components.forEach((bomItem) => {
      if (bomItem.partType === "Bulk - Supplied") return;
      if (!componentMasterMap.has(bomItem.partCode)) {
        componentMasterMap.set(bomItem.partCode, {
          demand: {},
          skus: new Set(),
          partTypes: new Set(),
          descriptions: new Set(),
        });
      }
      const componentData = componentMasterMap.get(bomItem.partCode)!;
      componentData.skus.add(product.productCode);
      componentData.partTypes.add(bomItem.partType);
      componentData.descriptions.add(bomItem.partDescription);

      for (const month in forecast.monthlyForecast) {
        const required = forecast.monthlyForecast[month] * bomItem.perShipper;
        componentData.demand[month] =
          (componentData.demand[month] || 0) + required;
      }
    });
  });

  // Step 2: Create the final projections for components that we have stock for
  const inventoryProjections: InventoryProjection[] = [];

  components.forEach((component) => {
    const componentData = componentMasterMap.get(component.partCode);
    if (!componentData) return;

    let currentSoh = component.stock;
    const sortedMonths = Object.keys(componentData.demand).sort();

    const fourMonthDemand = sortedMonths
      .slice(0, 4)
      .reduce((sum, month) => sum + (componentData.demand[month] || 0), 0);
    const netFourMonthDemand = Math.max(0, fourMonthDemand - currentSoh);

    let overallHealth: "Healthy" | "Risk" | "Shortage";
    if (currentSoh >= fourMonthDemand) {
      overallHealth = "Healthy";
    } else if (currentSoh > 0) {
      overallHealth = "Risk";
    } else {
      overallHealth = "Shortage";
    }

    const projections: MonthlyProjection[] = sortedMonths.map((month) => {
      const demand = componentData.demand[month];
      const coveragePercentage =
        demand > 0 ? Math.min(1, currentSoh / demand) * 100 : 100;
      const projectedSoh = currentSoh - demand;
      currentSoh = projectedSoh;
      return { month, totalDemand: demand, coveragePercentage, projectedSoh };
    });

    inventoryProjections.push({
      component,
      skusUsedIn: Array.from(componentData.skus),
      displayPartType: Array.from(componentData.partTypes)[0] || "N/A",
      displayDescription: Array.from(componentData.descriptions)[0] || "N/A",
      netFourMonthDemand,
      projections,
      overallHealth,
    });
  });

  return inventoryProjections;
};
