import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Card,
  Spinner,
  CardBody,
  Input,
  Chip,
} from "@material-tailwind/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { getAllSoh } from "../../services/inventory.service";
import { fetchAllProducts } from "../../services/api.service";
import { getAllForecasts } from "../../services/forecast.service";
import {
  calculateInventoryProjections,
  InventoryProjection,
} from "../../services/mrp.service";

const timeHorizon = 6;
const getHealthColor = (soh: number) =>
  soh >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

// BLOCK 3: Main InventoryPage Component
export function InventoryPage() {
  const { theme } = useTheme();
  const [projections, setProjections] = useState<InventoryProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDataAndCalculate = async () => {
      setLoading(true);
      try {
        const [components, products, forecasts] = await Promise.all([
          getAllSoh(),
          fetchAllProducts(),
          getAllForecasts(),
        ]);
        const calculatedProjections = calculateInventoryProjections(
          components,
          products,
          forecasts
        );
        setProjections(calculatedProjections);
      } catch (error) {
        console.error("Failed to fetch or calculate inventory data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndCalculate();
  }, []);

  const filteredProjections = useMemo(() => {
    if (!searchQuery) return projections;
    const lowerQuery = searchQuery.toLowerCase();
    return projections.filter(
      (p) =>
        p.component.partCode.toLowerCase().includes(lowerQuery) ||
        p.displayDescription.toLowerCase().includes(lowerQuery) ||
        p.skusUsedIn.some((sku) => sku.toLowerCase().includes(lowerQuery))
    );
  }, [projections, searchQuery]);

  const monthHeaders =
    projections[0]?.projections
      .slice(0, timeHorizon)
      .map((p) =>
        new Date(p.month + "-02").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        })
      ) || [];

  const TABLE_HEAD = [
    "SKUs",
    "Part Code",
    "Description",
    "On Hand",
    "Net Demand (4m)",
    ...monthHeaders,
  ];

  return (
    <Card className={`w-full ${theme.cards} shadow-sm`}>
      <div className={`p-4 border-b ${theme.borderColor}`}>
        <Typography variant="h5" className={theme.text}>
          Inventory Planning Dashboard
        </Typography>
      </div>
      <div className={`p-4 border-b ${theme.borderColor}`}>
        <Input
          label="Search by Part Code, Description, or SKU"
          icon={<MagnifyingGlassIcon className="h-5 w-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          color={theme.isDark ? "white" : "black"}
        />
      </div>

      <CardBody className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Spinner className="h-12 w-12" />
          </div>
        ) : (
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD.map((head) => (
                  <th
                    key={head}
                    className={`p-2 border-b-2 ${theme.borderColor} ${theme.tableHeaderBg}`}
                  >
                    <Typography
                      variant="small"
                      className={`font-semibold ${theme.text}`}
                    >
                      {head}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            {/* The tbody no longer has a divide class */}
            <tbody>
              {filteredProjections.map(
                ({
                  component,
                  skusUsedIn,
                  displayDescription,
                  netFourMonthDemand,
                  projections,
                }) => (
                  <React.Fragment key={component.id}>
                    {/* Row 1: Forecast Demand (standard border) */}
                    <tr className={`border-b ${theme.borderColor}`}>
                      <td className="p-2 align-top">
                        <div className="flex flex-col">
                          {skusUsedIn.map((sku) => (
                            <Typography
                              key={sku}
                              variant="small"
                              className={`${theme.text} opacity-80`}
                            >
                              {sku}
                            </Typography>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <Typography
                          variant="small"
                          className={`font-bold ${theme.text}`}
                        >
                          {component.partCode}
                        </Typography>
                      </td>
                      <td className="p-2 align-top">
                        <Typography variant="small" className={theme.text}>
                          {displayDescription}
                        </Typography>
                      </td>
                      <td className="p-2 align-top">
                        <Typography
                          variant="small"
                          className={`font-semibold ${theme.text}`}
                        >
                          {component.stock.toLocaleString()}
                        </Typography>
                      </td>
                      <td className="p-2 align-top">
                        <Chip
                          value={netFourMonthDemand.toLocaleString()}
                          color={netFourMonthDemand > 0 ? "red" : "green"}
                          variant="ghost"
                        />
                      </td>
                      {projections.slice(0, timeHorizon).map((p) => (
                        <td
                          key={`${p.month}-demand`}
                          className="p-2 text-center align-top"
                        >
                          <Typography variant="small" className="font-semibold">
                            {p.totalDemand.toLocaleString()}
                          </Typography>
                        </td>
                      ))}
                    </tr>
                    {/* Row 2: Coverage Percentage (standard border) */}
                    <tr className={`border-b ${theme.borderColor}`}>
                      <td
                        className="p-2 font-semibold text-xs text-gray-500"
                        colSpan={5}
                      >
                        Coverage %
                      </td>
                      {projections.slice(0, timeHorizon).map((p) => (
                        <td
                          key={`${p.month}-coverage`}
                          className="p-2 text-center"
                        >
                          <Typography
                            variant="small"
                            className={
                              p.coveragePercentage < 100
                                ? "text-red-500 font-semibold"
                                : "text-green-500"
                            }
                          >
                            {p.coveragePercentage.toFixed(0)}%
                          </Typography>
                        </td>
                      ))}
                    </tr>
                    {/* Row 3: Projected SOH (THICK bottom border) */}
                    <tr className={`border-b-4 ${theme.borderColor}`}>
                      <td
                        className="p-2 font-semibold text-xs text-gray-500"
                        colSpan={5}
                      >
                        Projected SOH
                      </td>
                      {projections.slice(0, timeHorizon).map((p) => (
                        <td
                          key={`${p.month}-soh`}
                          className={`p-2 text-center font-semibold rounded ${getHealthColor(
                            p.projectedSoh
                          )}`}
                        >
                          {p.projectedSoh.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                )
              )}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
