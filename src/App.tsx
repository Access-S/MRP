// BLOCK 1: Imports
import { useState } from "react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./components/pages/DashboardPage";
import { ProductsPage } from "./components/pages/ProductsPage";
import { PurchaseOrdersPage } from "./components/pages/PurchaseOrdersPage";
import { ForecastsPage } from "./components/pages/ForecastsPage";
import { SohPage } from "./components/pages/SohPage";
import { InventoryPage } from "./components/pages/InventoryPage";
import { Toaster } from "react-hot-toast";

// BLOCK 2: Type Definitions
export type Page =
  | "dashboard"
  | "products"
  | "purchase-orders"
  | "inventory"
  | "forecasts"
  | "soh"
  | "analytics"
  | "reporting";

// BLOCK 3: AppLayout Component (Full-Width)
function AppLayout() {
  const { theme } = useTheme();
  const [activePage, setActivePage] = useState<Page>("dashboard");

  const pageTitles: Record<Page, string> = {
    dashboard: "Dashboard",
    products: "Products (BOM)",
    "purchase-orders": "Purchase Orders",
    inventory: "Inventory Planning Dashboard", // A more descriptive title
    forecasts: "Sales Forecasts",
    soh: "Stock On Hand",
  };

  return (
    <div
      className={`min-h-screen ${theme.background} transition-all duration-500`}
    >
      <div
        className={`${theme.navbar} shadow-sm border-b p-4 transition-all duration-500 flex items-center gap-4 sticky top-0 z-10`}
      >
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <h1 className={`text-2xl font-bold ${theme.text}`}>
          {pageTitles[activePage]}
        </h1>
      </div>

      {/* --- THIS IS THE FIX --- */}
      {/* The padding is now on the main, and the max-width container is gone. */}
      <main className="p-4 md:p-8">
        {activePage === "dashboard" && <DashboardPage />}
        {activePage === "products" && <ProductsPage />}
        {activePage === "purchase-orders" && <PurchaseOrdersPage />}
        {activePage === "forecasts" && <ForecastsPage />}
        {activePage === "soh" && <SohPage />}
        {activePage === "inventory" && <InventoryPage />}
      </main>
      {/* --- END OF FIX --- */}
    </div>
  );
}

// BLOCK 4: App Component
function App() {
  return (
    <ThemeProvider>
      <AppLayout />
      <Toaster
        position="top-right"
        toastOptions={{
          success: { style: { background: "#28a745", color: "white" } },
          error: { style: { background: "#dc3545", color: "white" } },
        }}
      />
    </ThemeProvider>
  );
}

// BLOCK 5: Default Export
export default App;
