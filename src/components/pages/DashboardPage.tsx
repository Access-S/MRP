// BLOCK 1: Imports
import React, { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Typography, Card, Spinner } from "@material-tailwind/react";
import {
  getDashboardStats,
  DashboardStats,
} from "../../services/dashboard.service";
import { getAllProducts } from "../../services/product.service";

// BLOCK 2: StatCard Helper Component (with Color Logic)
const StatCard = ({
  title,
  value,
  theme,
  alertColor,
}: {
  title: string;
  value: string | number;
  theme: any;
  alertColor?: "red" | "yellow";
}) => {
  const valueColorClass =
    alertColor === "red"
      ? "text-red-500"
      : alertColor === "yellow"
      ? "text-yellow-600"
      : theme.text;

  return (
    <Card className={`${theme.cards} shadow-sm p-4 text-center`}>
      <Typography variant="h3" className={`${valueColorClass} mb-1`}>
        {value}
      </Typography>
      <Typography variant="small" className={`${theme.text} opacity-70`}>
        {title}
      </Typography>
    </Card>
  );
};

// BLOCK 3: Main DashboardPage Component
export function DashboardPage() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const allProducts = await getAllProducts();
      const fetchedStats = await getDashboardStats(allProducts);
      setStats(fetchedStats);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <>
      {/* Welcome Card */}
      <Card className={`${theme.cards} rounded-lg shadow-sm p-6 mb-6`}>
        <Typography variant="h5" className={`${theme.text} mb-1`}>
          Welcome to your MRP Dashboard
        </Typography>
        <Typography className={`${theme.text} opacity-80`}>
          This is the central hub for monitoring your manufacturing resource
          planning.
        </Typography>
      </Card>

      {/* --- THIS IS THE RESTORED CONTENT --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className={`${theme.cards} p-6`}>
          <Typography variant="h6" className={theme.text}>
            Analytics
          </Typography>
          <Typography className={`${theme.text} opacity-70 text-sm mt-1`}>
            View detailed reports and performance metrics.
          </Typography>
        </Card>
        <Card className={`${theme.cards} p-6`}>
          <Typography variant="h6" className={theme.text}>
            Planning
          </Typography>
          <Typography className={`${theme.text} opacity-70 text-sm mt-1`}>
            Access the main inventory planning dashboard.
          </Typography>
        </Card>
        <Card className={`${theme.cards} p-6`}>
          <Typography variant="h6" className={theme.text}>
            Data Management
          </Typography>
          <Typography className={`${theme.text} opacity-70 text-sm mt-1`}>
            Import and manage system data like forecasts and SOH.
          </Typography>
        </Card>
      </div>
      {/* --- END OF RESTORED CONTENT --- */}

      {/* Stats Grid (Updated) */}
      {loading || !stats ? (
        <div className="flex justify-center items-center h-24">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Open Purchase Orders"
            value={stats.openPoCount}
            theme={theme}
          />
          <StatCard
            title="Total Open Value"
            value={formatCurrency(stats.totalOpenValue)}
            theme={theme}
          />
          <StatCard
            title="Total Open Work (Hours)"
            value={stats.totalOpenWorkHours.toFixed(1)}
            theme={theme}
          />
          <StatCard
            title="Components at Risk"
            value={stats.componentsAtRiskCount}
            theme={theme}
            alertColor={stats.componentsAtRiskCount > 0 ? "yellow" : undefined}
          />
          <StatCard
            title="POs Requiring Attention"
            value={stats.attentionPoCount}
            theme={theme}
            alertColor={stats.attentionPoCount > 0 ? "red" : undefined}
          />
          <StatCard
            title="Avg. Turnaround (Days)"
            value={stats.averageTurnaroundDays.toFixed(1)}
            theme={theme}
          />
        </div>
      )}
    </>
  );
}
