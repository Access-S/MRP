// src/pages/InventoryPage.tsx

// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Card,
  Spinner,
  CardBody,
  Input,
  Chip,
  ButtonGroup,
  Button,
} from "@material-tailwind/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import {
  mrpService,
  InventoryProjection,
  MrpSummary,
  MonthlyProjection,
} from "../../services/mrp.service";

// BLOCK 2: Sub-components and Helper Functions
const StatCard = ({ title, value, colorClass = "text-blue-600", theme }: { title: string; value: string | number; colorClass?: string; theme: any }) => (
  <Card className={`${theme.cards} shadow-sm p-4 text-center`}>
    <Typography variant="h3" className={`${colorClass} mb-1`}>{value}</Typography>
    <Typography variant="small" className={`${theme.text} opacity-70`}>{title}</Typography>
  </Card>
);

const MonthlyProjectionCell = ({ projection, theme }: { projection: MonthlyProjection | undefined; theme: any }) => {
  if (!projection) {
    return (
      <div className="flex flex-col items-center gap-1 p-1 opacity-50">
        <Typography variant="small" className="font-semibold">-</Typography>
        <Typography variant="small" className="text-xs">-</Typography>
        <Chip value="-" className="text-xs font-bold" />
      </div>
    );
  }

  const sohColor = projection.projectedSoh >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  const coverageColor = projection.coveragePercentage < 100 ? "text-red-500 font-semibold" : "text-green-500";
  
  const demandText = typeof projection.totalDemand === 'number' ? projection.totalDemand.toLocaleString() : '-';
  const coverageText = typeof projection.coveragePercentage === 'number' ? `${projection.coveragePercentage.toFixed(0)}%` : '-';
  const sohText = typeof projection.projectedSoh === 'number' ? projection.projectedSoh.toLocaleString() : '-';

  return (
    <div className="flex flex-col items-center gap-1 p-1">
      <Typography variant="small" className="font-semibold text-center">{demandText}</Typography>
      <Typography variant="small" className={`${coverageColor} text-xs`}>{coverageText}</Typography>
      <Chip value={sohText} className={`text-xs ${sohColor} font-bold`} />
    </div>
  );
};

const getHealthChipColor = (health: "Healthy" | "Risk" | "Shortage") => {
  switch (health) {
    case "Healthy": return "green";
    case "Risk": return "yellow";
    case "Shortage": return "red";
    default: return "blue-gray";
  }
};

// BLOCK 3: Main InventoryPage Component
export function InventoryPage() {
  // BLOCK 4: State Management
  const { theme } = useTheme();
  const [allProjections, setAllProjections] = useState<InventoryProjection[]>([]);
  const [summary, setSummary] = useState<MrpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"All" | "Healthy" | "Risk" | "Shortage">("All");

  // BLOCK 5: Data Fetching Effect
  useEffect(() => {
    const runAnalysis = async () => {
      setLoading(true);
      try {
        const calculatedProjections = await mrpService.runCompleteAnalysis();
        const calculatedSummary = mrpService.getMrpSummary(calculatedProjections);
        setAllProjections(calculatedProjections);
        setSummary(calculatedSummary);
      } catch (error) {
        console.error("Failed to run complete MRP analysis:", error);
      } finally {
        setLoading(false);
      }
    };
    runAnalysis();
  }, []);

  // BLOCK 6: Derived State for Filtering and Headers
  const filteredProjections = useMemo(() => {
    let projections = allProjections;
    if (healthFilter !== "All") {
      projections = projections.filter(p => p.overallHealth === healthFilter);
    }
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      projections = projections.filter(p =>
        p.component.partCode.toLowerCase().includes(lowerQuery) ||
        p.displayDescription.toLowerCase().includes(lowerQuery) ||
        p.skusUsedIn.some((sku) => sku.toLowerCase().includes(lowerQuery))
      );
    }
    return projections;
  }, [allProjections, searchQuery, healthFilter]);

  const monthHeaders = useMemo(() => {
    if (allProjections.length === 0) return [];
    
    const allMonths = new Set<string>();
    allProjections.forEach(p => {
      p.projections.forEach(proj => allMonths.add(proj.month));
    });

    return Array.from(allMonths)
      .sort()
      .slice(0, 6);
  }, [allProjections]);
  
  const TABLE_HEAD = ["Component", "Status", "On Hand", ...monthHeaders.map(monthStr => 
    new Date(monthStr + "-02").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  )];

  // BLOCK 7: Render Logic
return (
  <div className="space-y-6">
    <Card className={`w-full ${theme.cards} shadow-sm`}>
      <div className={`p-4`}>
        <Typography variant="h5" className={theme.text}>Inventory Planning Dashboard</Typography>
        <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
          Analyze component demand, stock levels, and potential shortages.
        </Typography>
      </div>
    </Card>

    {loading ? (
      <div className="flex justify-center items-center h-24"><Spinner /></div>
    ) : summary && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Components" value={summary.totalComponents} theme={theme} />
        <StatCard title="Healthy" value={summary.healthyCount} colorClass="text-green-500" theme={theme} />
        <StatCard title="At Risk" value={summary.riskCount} colorClass="text-yellow-600" theme={theme} />
        <StatCard title="Shortage" value={summary.shortageCount} colorClass="text-red-500" theme={theme} />
      </div>
    )}

    <Card className={`w-full ${theme.cards} shadow-sm`}>
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 border-b ${theme.borderColor}`}>
        <div className="w-full sm:w-72">
          <Input
            label="Search by Part Code, Description, or SKU"
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color={theme.isDark ? "white" : "black"}
          />
        </div>
        <ButtonGroup variant="outlined">
          {(["All", "Shortage", "Risk", "Healthy"] as const).map(filter => (
            <Button
              key={filter}
              onClick={() => setHealthFilter(filter)}
              className={healthFilter === filter ? "bg-gray-200 dark:bg-gray-700" : ""}
            >
              {filter}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <CardBody className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center items-center h-96"><Spinner /></div>
        ) : (
          <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
            <table className="min-w-max w-full table-auto text-left">
              <thead className={`border-b-2 ${theme.borderColor}`}>
                <tr>
                  {TABLE_HEAD.map(head => (
                    <th key={head} className={`p-2 text-center border-r ${theme.borderColor} ${theme.tableHeaderBg}`}>
                      <Typography variant="small" className={`font-semibold ${theme.text}`}>{head}</Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjections.map((p, index) => (
                  <tr key={`${p.component.partCode}-${index}`} className={theme.hoverBg}>
                    <td className={`p-2 border-b border-r ${theme.borderColor} align-top`}>
                      <Typography variant="small" className={`font-bold ${theme.text}`}>{p.component.partCode}</Typography>
                      <Typography variant="small" className={`${theme.text} opacity-80`}>{p.displayDescription}</Typography>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.skusUsedIn.map((sku, skuIndex) => <Chip key={`${sku}-${skuIndex}`} value={sku} className="text-xs" />)}
                      </div>
                    </td>
                    <td className={`p-2 border-b border-r ${theme.borderColor} text-center align-middle`}>
                      <Chip value={p.overallHealth} color={getHealthChipColor(p.overallHealth)} />
                    </td>
                    <td className={`p-2 border-b border-r ${theme.borderColor} text-center align-middle`}>
                      <Typography variant="small" className={`font-semibold ${theme.text}`}>
                        {typeof p.component.stock === 'number' ? p.component.stock.toLocaleString() : '-'}
                      </Typography>
                    </td>
                    {monthHeaders.map((dateKey, monthIndex) => {
                      const projectionForMonth = p.projections.find(proj => proj.month === dateKey);
                      return (
                        <td key={`${p.component.partCode}-${dateKey}-${monthIndex}`} className={`p-0 border-b border-r ${theme.borderColor} align-top`}>
                          <MonthlyProjectionCell projection={projectionForMonth} theme={theme} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredProjections.length === 0 && !loading && (
          <div className="text-center p-8">
            <Typography color="gray" className={theme.text}>No projections match the current filters.</Typography>
          </div>
        )}
      </CardBody>
    </Card>
  </div>
);
}