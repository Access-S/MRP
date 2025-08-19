// BLOCK 1: Imports
import { Product, Forecast, Component } from "../types/mrp.types";
import { productService } from "./product.service";
import { forecastService } from "./forecast.service";
import { inventoryService } from "./inventory.service";
import { handleApiError } from "./api.service";

// BLOCK 2: Interface for the Engine's Output
export interface MonthlyProjection {
  month: string;
  totalDemand: number;
  coveragePercentage: number;
  projectedSoh: number;
  shortfall: number;
  daysOfCoverage: number;
}

export interface InventoryProjection {
  component: Component;
  skusUsedIn: string[];
  displayPartType: string;
  displayDescription: string;
  netFourMonthDemand: number;
  projections: MonthlyProjection[];
  overallHealth: "Healthy" | "Risk" | "Shortage";
  recommendedAction: string;
  priority: "High" | "Medium" | "Low";
  totalAnnualDemand: number;
  averageMonthlyDemand: number;
}

export interface MrpSummary {
  totalComponents: number;
  healthyCount: number;
  riskCount: number;
  shortageCount: number;
  totalDemandValue: number;
  criticalComponents: InventoryProjection[];
}

// BLOCK 3: MRP Service Class
class MrpService {

  /**
   * BLOCK 3.1: The main MRP calculation engine.
   * This is the core logic that processes demand against supply.
   */
// BLOCK 3.1: The main MRP calculation engine.
calculateInventoryProjections(
  components: Component[],
  products: Product[],
  forecasts: Forecast[]
): InventoryProjection[] {
  console.log('🔄 Starting MRP calculations...');

  console.log(`📊 Input validation:`, {
    components: components.length,
    products: products.length,
    forecasts: forecasts.length
  });
  
  console.log(`📊 Sample product structure:`, products[0]);
  console.log(`📊 Sample forecast structure:`, forecasts[0]);
  console.log(`📊 Sample SOH component structure:`, components[0]);
  
  const productsWithComponents = products.filter(p => p.components && p.components.length > 0);
  console.log(`📊 Products with components: ${productsWithComponents.length}/${products.length}`);
  
  const matchedProducts = products.filter(product => 
    forecasts.some(forecast => forecast.productCode === product.product_code)
  );
  console.log(`📊 Products with matching forecasts: ${matchedProducts.length}/${products.length}`);

  // DEBUG SOH MAPPING WITH DETAILED STOCK INFO
  const sohMap = new Map<string, Component>();
  components.forEach((component, index) => {
    if (index < 3) {
      console.log(`🔍 SOH component ${index} DETAILED:`, {
        fullObject: component,
        possibleStockFields: {
          stock: component.stock,
          quantity: component.quantity,
          on_hand: component.on_hand,
          current_stock: component.current_stock,
          available_stock: component.available_stock
        }
      });
    }
    
    const partCode = component.partCode || component.part_code || component.product_id || component.id;
    if (partCode) {
      sohMap.set(partCode, component);
    } else {
      console.warn(`⚠️ SOH component missing part code:`, component);
    }
  });
  
  console.log(`📊 SOH Map created with ${sohMap.size} entries`);
  console.log(`📊 Sample SOH map keys:`, Array.from(sohMap.keys()).slice(0, 10));

  const componentMasterMap = new Map<string, {
    demand: { [month: string]: number };
    skus: Set<string>;
    partTypes: Set<string>;
    descriptions: Set<string>;
  }>();

  let processedProductCount = 0;
  let skippedProductCount = 0;

  products.forEach((product, productIndex) => {
    const forecast = forecasts.find((f) => f.productCode === product.product_code);
    
    if (!forecast) {
      skippedProductCount++;
      return;
    }
    
    if (!product.components || product.components.length === 0) {
      skippedProductCount++;
      return;
    }

    processedProductCount++;

    product.components.forEach((bomItem, bomIndex) => {
      const partCode = bomItem.part_code;
      const perShipper = bomItem.per_shipper || 1;
      const partType = bomItem.part_type || 'Unknown';
      const partDescription = bomItem.part_description || 'No description';
      
      if (!partCode) {
        console.warn(`⚠️ BOM item missing part_code:`, bomItem);
        return;
      }
      
      if (!componentMasterMap.has(partCode)) {
        componentMasterMap.set(partCode, {
          demand: {}, skus: new Set(), partTypes: new Set(), descriptions: new Set(),
        });
      }
      
      const componentData = componentMasterMap.get(partCode)!;
      componentData.skus.add(product.product_code);
      componentData.partTypes.add(partType);
      componentData.descriptions.add(partDescription);

      for (const month in forecast.monthlyForecast) {
        const forecastQty = forecast.monthlyForecast[month];
        const requiredComponents = forecastQty * perShipper;
        componentData.demand[month] = (componentData.demand[month] || 0) + requiredComponents;
      }
    });
  });

  console.log(`📊 FINAL SUMMARY:`);
  console.log(`📊 Processed products: ${processedProductCount}`);
  console.log(`📊 Skipped products: ${skippedProductCount}`);
  console.log(`📊 Component map keys (first 10):`, Array.from(componentMasterMap.keys()).slice(0, 10));
  console.log(`DIAGNOSTIC: Final componentMasterMap size is ${componentMasterMap.size}.`);

  const inventoryProjections: InventoryProjection[] = [];
  let sohMatchCount = 0;
  let sohMissCount = 0;

  componentMasterMap.forEach((componentData, partCode) => {
    const sohComponent = sohMap.get(partCode);
    
    if (sohComponent) {
      sohMatchCount++;
      if (sohMatchCount <= 5) {
        console.log(`✅ SOH match found for ${partCode}:`, {
          fullSOHObject: sohComponent,
          stockValue: sohComponent.stock,
          quantityValue: sohComponent.quantity,
          onHandValue: sohComponent.on_hand,
          currentStockValue: sohComponent.current_stock,
          availableStockValue: sohComponent.available_stock
        });
      }
    } else {
      sohMissCount++;
      if (sohMissCount <= 3) {
        console.log(`❌ No SOH found for ${partCode}`);
      }
    }
    
    // TRY DIFFERENT POSSIBLE STOCK FIELD NAMES
    let stockValue = 0;
    if (sohComponent) {
      stockValue = sohComponent.stock || 
                   sohComponent.quantity || 
                   sohComponent.on_hand || 
                   sohComponent.current_stock || 
                   sohComponent.available_stock || 
                   0;
      
      if (sohMatchCount <= 5) {
        console.log(`🔍 Final stock value for ${partCode}: ${stockValue}`);
      }
    }
    
    const componentForProjection: Component = sohComponent || {
      id: partCode,
      partCode: partCode,
      description: Array.from(componentData.descriptions)[0] || "N/A",
      stock: 0,
      safetyStock: 0,
      partType: Array.from(componentData.partTypes)[0] || "N/A",
    };

    // USE THE EXTRACTED STOCK VALUE
    let currentSoh = stockValue;
    const sortedMonths = Object.keys(componentData.demand).sort();

    const planningHorizonMonths = sortedMonths.slice(0, 4);
    const fourMonthDemand = planningHorizonMonths.reduce((sum, month) => sum + (componentData.demand[month] || 0), 0);
    
    const totalAnnualDemand = Object.values(componentData.demand).reduce((sum, demand) => sum + demand, 0);
    const averageMonthlyDemand = planningHorizonMonths.length > 0 ? fourMonthDemand / planningHorizonMonths.length : 0;
    
    const netFourMonthDemand = Math.max(0, fourMonthDemand - currentSoh);

    let overallHealth: "Healthy" | "Risk" | "Shortage";
    if (currentSoh >= fourMonthDemand) {
      overallHealth = "Healthy";
    } else if (currentSoh >= (fourMonthDemand * 0.5)) {
      overallHealth = "Risk";
    } else {
      overallHealth = "Shortage";
    }

    const projections: MonthlyProjection[] = planningHorizonMonths.map((month) => {
      const demand = componentData.demand[month];
      const coveragePercentage = demand > 0 ? Math.min(1, currentSoh / demand) * 100 : 100;
      const projectedSoh = Math.max(0, currentSoh - demand);
      const shortfall = Math.max(0, demand - currentSoh);
      const dailyDemand = demand / 30;
      const daysOfCoverage = dailyDemand > 0 ? Math.floor(currentSoh / dailyDemand) : 30;
      currentSoh = projectedSoh;
      
      return { month, totalDemand: demand, coveragePercentage, projectedSoh, shortfall, daysOfCoverage };
    });

    // MAKE SURE WE'RE USING THE CORRECT STOCK VALUE IN THE COMPONENT
    componentForProjection.stock = stockValue;

    inventoryProjections.push({
      component: componentForProjection,
      skusUsedIn: Array.from(componentData.skus),
      displayPartType: Array.from(componentData.partTypes)[0] || "N/A",
      displayDescription: Array.from(componentData.descriptions)[0] || "N/A",
      netFourMonthDemand,
      projections,
      overallHealth,
      priority: overallHealth === "Shortage" ? "High" : overallHealth === "Risk" ? "Medium" : "Low",
      recommendedAction: overallHealth === "Healthy" ? "Monitor stock" : `Order ${Math.ceil(netFourMonthDemand)} units`,
      totalAnnualDemand,
      averageMonthlyDemand,
    });
  });

  console.log(`📊 SOH Matching Results: ${sohMatchCount} matches, ${sohMissCount} misses out of ${componentMasterMap.size} components`);
  console.log(`✅ MRP calculations completed for ${inventoryProjections.length} components`);
  console.log(`📊 Health distribution: Healthy=${inventoryProjections.filter(p => p.overallHealth === 'Healthy').length}, Risk=${inventoryProjections.filter(p => p.overallHealth === 'Risk').length}, Shortage=${inventoryProjections.filter(p => p.overallHealth === 'Shortage').length}`);
  
  return inventoryProjections;
}
// BLOCK 3.2: Orchestration method to run a complete analysis.
async runCompleteAnalysis(): Promise<InventoryProjection[]> {
  try {
    console.log('🔄 Starting complete MRP analysis...');

    const [
      sohComponents, 
      products, 
      forecasts, 
      allBomComponents
    ] = await Promise.all([
      inventoryService.getAllSoh(),
      productService.getAllProducts(),
      forecastService.getRawForecasts(),
      productService.getAllBomComponents()
    ]);

    let totalBomsAttached = 0;
    const productsWithBoms: Product[] = products.map(product => {
      const bomForThisProduct = allBomComponents.filter(
        bom => bom.product_id === product.id
      );
      if (bomForThisProduct.length > 0) {
        totalBomsAttached += bomForThisProduct.length;
      }
      return {
        ...product,
        components: bomForThisProduct
      };
    });
    
    // This is the new diagnostic log.
    console.log(`DIAGNOSTIC: Attached a total of ${totalBomsAttached} BOM components across ${products.length} products.`);

    console.log(`📊 MRP Engine Inputs: SOH Components=${sohComponents.length}, Products with BOMs=${productsWithBoms.length}, Forecasts=${forecasts.length}`);

    const projections = this.calculateInventoryProjections(sohComponents, productsWithBoms, forecasts);

    console.log('✅ Complete MRP analysis finished');
    return projections;
  } catch (error) {
    console.error('❌ Error in complete MRP analysis:', error);
    throw new Error(handleApiError(error));
  }
}

  /**
   * BLOCK 3.3: Utility and Reporting methods.
   * These methods operate on the results of the MRP calculation.
   */
  getMrpSummary(projections: InventoryProjection[]): MrpSummary {
    const healthyCount = projections.filter(p => p.overallHealth === 'Healthy').length;
    const riskCount = projections.filter(p => p.overallHealth === 'Risk').length;
    const shortageCount = projections.filter(p => p.overallHealth === 'Shortage').length;
    
    const totalDemandValue = projections.reduce((sum, p) => sum + p.totalAnnualDemand, 0);
    
    const criticalComponents = projections
      .filter(p => p.priority === 'High')
      .sort((a, b) => b.netFourMonthDemand - a.netFourMonthDemand)
      .slice(0, 10);

    return {
      totalComponents: projections.length,
      healthyCount,
      riskCount,
      shortageCount,
      totalDemandValue: Math.round(totalDemandValue * 100) / 100,
      criticalComponents
    };
  }

  filterByHealth(
    projections: InventoryProjection[], 
    health: "Healthy" | "Risk" | "Shortage"
  ): InventoryProjection[] {
    return projections.filter(p => p.overallHealth === health);
  }

  filterByPriority(
    projections: InventoryProjection[], 
    priority: "High" | "Medium" | "Low"
  ): InventoryProjection[] {
    return projections.filter(p => p.priority === priority);
  }

  searchProjections(projections: InventoryProjection[], searchTerm: string): InventoryProjection[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return projections;
    }

    const term = searchTerm.toLowerCase();
    return projections.filter(p => 
      p.component.partCode.toLowerCase().includes(term) ||
      p.displayDescription.toLowerCase().includes(term) ||
      p.skusUsedIn.some(sku => sku.toLowerCase().includes(term))
    );
  }

  generatePurchaseRecommendations(projections: InventoryProjection[]): {
    partCode: string;
    description: string;
    currentStock: number;
    recommendedQuantity: number;
    priority: "High" | "Medium" | "Low";
    reason: string;
    estimatedCost?: number;
  }[] {
    return projections
      .filter(p => p.netFourMonthDemand > 0)
      .map(p => ({
        partCode: p.component.partCode,
        description: p.displayDescription,
        currentStock: p.component.stock,
        recommendedQuantity: Math.ceil(p.netFourMonthDemand),
        priority: p.priority,
        reason: p.recommendedAction,
      }))
      .sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  exportMrpData(projections: InventoryProjection[]): any[] {
    return projections.map(p => ({
      'Part Code': p.component.partCode,
      'Description': p.displayDescription,
      'Part Type': p.displayPartType,
      'Current Stock': p.component.stock,
      'Safety Stock': p.component.safetyStock || 0,
      'SKUs Used In': p.skusUsedIn.join(', '),
      'Health Status': p.overallHealth,
      'Priority': p.priority,
      'Net 4-Month Demand': p.netFourMonthDemand,
      'Total Annual Demand': p.totalAnnualDemand,
      'Average Monthly Demand': p.averageMonthlyDemand,
      'Recommended Action': p.recommendedAction,
      ...p.projections.reduce((acc, proj, index) => {
        acc[`Month ${index + 1} Demand`] = proj.totalDemand;
        acc[`Month ${index + 1} Coverage %`] = proj.coveragePercentage;
        acc[`Month ${index + 1} Projected SOH`] = proj.projectedSoh;
        return acc;
      }, {} as any)
    }));
  }
}
// BLOCK 4: Export singleton instance
export const mrpService = new MrpService();

// BLOCK 5: Export individual functions for backward compatibility
export const calculateInventoryProjections = (
  components: Component[],
  products: Product[],
  forecasts: Forecast[]
) => mrpService.calculateInventoryProjections(components, products, forecasts);

export const runCompleteAnalysis = () => mrpService.runCompleteAnalysis();
export const getMrpSummary = (projections: InventoryProjection[]) => mrpService.getMrpSummary(projections);
export const filterByHealth = (projections: InventoryProjection[], health: "Healthy" | "Risk" | "Shortage") => 
  mrpService.filterByHealth(projections, health);
export const filterByPriority = (projections: InventoryProjection[], priority: "High" | "Medium" | "Low") => 
  mrpService.filterByPriority(projections, priority);
export const searchProjections = (projections: InventoryProjection[], searchTerm: string) => 
  mrpService.searchProjections(projections, searchTerm);
export const generatePurchaseRecommendations = (projections: InventoryProjection[]) => 
  mrpService.generatePurchaseRecommendations(projections);
export const exportMrpData = (projections: InventoryProjection[]) => 
  mrpService.exportMrpData(projections);

// BLOCK 6: Utility functions for MRP calculations
export const calculateDaysOfCoverage = (currentStock: number, monthlyDemand: number): number => {
  if (monthlyDemand <= 0) return 999; // Infinite coverage
  const dailyDemand = monthlyDemand / 30;
  return Math.floor(currentStock / dailyDemand);
};

export const calculateReorderPoint = (
  averageDemand: number, 
  leadTimeDays: number = 30, 
  safetyStock: number = 0
): number => {
  const dailyDemand = averageDemand / 30;
  return Math.ceil((dailyDemand * leadTimeDays) + safetyStock);
};

export const calculateEconomicOrderQuantity = (
  annualDemand: number,
  orderingCost: number = 50,
  holdingCostPerUnit: number = 1
): number => {
  if (holdingCostPerUnit <= 0 || annualDemand <= 0) return 0;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit));
};

export const getHealthColor = (health: "Healthy" | "Risk" | "Shortage"): string => {
  switch (health) {
    case 'Healthy': return 'green';
    case 'Risk': return 'yellow';
    case 'Shortage': return 'red';
    default: return 'gray';
  }
};

export const getPriorityColor = (priority: "High" | "Medium" | "Low"): string => {
  switch (priority) {
    case 'High': return 'red';
    case 'Medium': return 'orange';
    case 'Low': return 'green';
    default: return 'gray';
  }
};

export const formatCoverage = (percentage: number): string => {
  if (percentage >= 100) return '100%';
  if (percentage <= 0) return '0%';
  return `${Math.round(percentage)}%`;
};

export const formatDemand = (demand: number): string => {
  if (demand >= 1000000) {
    return `${(demand / 1000000).toFixed(1)}M`;
  }
  if (demand >= 1000) {
    return `${(demand / 1000).toFixed(1)}K`;
  }
  return Math.round(demand).toString();
};

export const validateMrpInputs = (
  components: Component[],
  products: Product[],
  forecasts: Forecast[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate components
  if (!components || components.length === 0) {
    errors.push('No components (SOH data) provided');
  } else {
    const invalidComponents = components.filter(c => 
      !c.partCode || typeof c.stock !== 'number' || c.stock < 0
    );
    if (invalidComponents.length > 0) {
      errors.push(`${invalidComponents.length} components have invalid data`);
    }
  }

  // Validate products
  if (!products || products.length === 0) {
    errors.push('No products provided');
  } else {
    const invalidProducts = products.filter(p => 
      !p.productCode || !p.unitsPerShipper || p.unitsPerShipper <= 0
    );
    if (invalidProducts.length > 0) {
      warnings.push(`${invalidProducts.length} products missing unitsPerShipper data`);
    }

    const productsWithoutBom = products.filter(p => 
      !p.components || p.components.length === 0
    );
    if (productsWithoutBom.length > 0) {
      warnings.push(`${productsWithoutBom.length} products have no BOM components`);
    }
  }

  // Validate forecasts
  if (!forecasts || forecasts.length === 0) {
    errors.push('No forecasts provided');
  } else {
    const invalidForecasts = forecasts.filter(f => 
      !f.productCode || !f.monthlyForecast || Object.keys(f.monthlyForecast).length === 0
    );
    if (invalidForecasts.length > 0) {
      warnings.push(`${invalidForecasts.length} forecasts have no monthly data`);
    }
  }

  // Cross-validation
  if (products.length > 0 && forecasts.length > 0) {
    const productsWithoutForecast = products.filter(p => 
      !forecasts.some(f => f.productCode === p.productCode)
    );
    if (productsWithoutForecast.length > 0) {
      warnings.push(`${productsWithoutForecast.length} products have no forecast data`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const generateMrpReport = (projections: InventoryProjection[]): {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  criticalActions: string[];
} => {
  const summary = mrpService.getMrpSummary(projections);
  
  const executiveSummary = `
    MRP Analysis completed for ${summary.totalComponents} components. 
    ${summary.shortageCount} components are in shortage, ${summary.riskCount} are at risk, 
    and ${summary.healthyCount} are healthy. Total annual demand value: $${summary.totalDemandValue.toLocaleString()}.
  `.trim();

  const keyFindings = [
    `${Math.round((summary.shortageCount / summary.totalComponents) * 100)}% of components are in shortage`,
    `${Math.round((summary.riskCount / summary.totalComponents) * 100)}% of components are at risk`,
    `${summary.criticalComponents.length} components require immediate attention`,
    `Average demand coverage varies significantly across component types`
  ];

  const recommendations = [
    'Implement automated reorder points for critical components',
    'Review safety stock levels for high-demand components',
    'Establish supplier agreements for faster lead times',
    'Consider alternative suppliers for shortage-prone components'
  ];

  const criticalActions = summary.criticalComponents
    .slice(0, 5)
    .map(c => `Order ${Math.ceil(c.netFourMonthDemand)} units of ${c.component.partCode} immediately`);

  return {
    executiveSummary,
    keyFindings,
    recommendations,
    criticalActions
  };
};

// BLOCK 7: Export the service class
export { MrpService };
export default mrpService;

// BLOCK 8: Type exports for convenience
export type {
  MonthlyProjection,
  InventoryProjection,
  MrpSummary,
  Product,
  Forecast,
  Component
} from '../types/mrp.types';