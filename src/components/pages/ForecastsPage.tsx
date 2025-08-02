// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Typography,
  Card,
  CardBody,
  ButtonGroup,
  Spinner,
} from "@material-tailwind/react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { ExcelImportModal } from "../modals/ExcelImportModal";
import {
  importForecastData,
  getAllForecasts,
} from "../../services/forecast.service";
import { Forecast } from "../../types/mrp.types";
import toast from "react-hot-toast";

// BLOCK 2: Constants
type TimeHorizon = 4 | 6 | 9 | 12 | "All";
const TIME_HORIZONS: TimeHorizon[] = [4, 6, 9, 12, "All"];

// BLOCK 3: Main ForecastsPage Component
export function ForecastsPage() {
  // BLOCK 4: State Management
  const { theme } = useTheme();
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizon>(6);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  // BLOCK 5: Handlers and Effects
  const handleOpenImportModal = () => setIsImportModalOpen((cur) => !cur);

  const fetchData = async () => {
    setLoading(true);
    const data = await getAllForecasts();
    setForecasts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleForecastImport = async (file: File) => {
    const loadingToast = toast.loading(
      "Importing and processing forecast data..."
    );
    try {
      await importForecastData(file);
      toast.dismiss(loadingToast);
      toast.success("Forecast data imported successfully! Refreshing data...");
      fetchData(); // Re-fetch the data to show the new/updated forecasts
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Import failed: ${error.message}`);
    }
  };

  // --- DYNAMIC COLUMN AND DATA LOGIC ---
  const { tableHeaders, tableRows } = useMemo(() => {
    if (forecasts.length === 0) {
      return { tableHeaders: [], tableRows: [] };
    }

    // Get all unique month headers from the data and sort them
    const allMonths = new Set<string>();
    forecasts.forEach((f) => {
      Object.keys(f.monthlyForecast).forEach((month) => allMonths.add(month));
    });
    const sortedMonths = Array.from(allMonths).sort();

    // Determine which months to show based on the active horizon
    const monthsToShow =
      activeHorizon === "All"
        ? sortedMonths
        : sortedMonths.slice(0, activeHorizon);

    // Create the table headers
    const tableHeaders = [
      "Product Code",
      "Description",
      ...monthsToShow.map((m) =>
        new Date(m + "-02").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        })
      ),
    ];

    // Create the table rows
    const tableRows = forecasts.map((forecast) => ({
      productCode: forecast.productCode,
      description: forecast.description,
      monthlyData: monthsToShow.map(
        (month) => forecast.monthlyForecast[month] || 0
      ),
    }));

    return { tableHeaders, tableRows };
  }, [forecasts, activeHorizon]);

  // BLOCK 6: Render Logic
  return (
    <>
      <Card className={`w-full ${theme.cards} shadow-sm`}>
        {/* Page Header */}
        <div
          className={`flex flex-wrap items-center justify-between p-4 border-b ${theme.borderColor}`}
        >
          <div>
            <Typography variant="h5" className={theme.text}>
              Sales Forecasts
            </Typography>
            <Typography
              color="gray"
              className={`mt-1 font-normal ${theme.text} opacity-80`}
            >
              Manage and view forecasted sales data for all products.
            </Typography>
          </div>
          <div>
            <Button
              onClick={handleOpenImportModal}
              className="flex items-center gap-3"
              size="sm"
            >
              <ArrowUpTrayIcon strokeWidth={2} className="h-4 w-4" /> Import
              Forecast
            </Button>
          </div>
        </div>

        {/* Time Horizon Toggles */}
        <div
          className={`flex flex-wrap items-center justify-between p-4 border-b ${theme.borderColor}`}
        >
          <Typography variant="h6" className={theme.text}>
            View Horizon
          </Typography>
          <ButtonGroup variant="outlined">
            {TIME_HORIZONS.map((horizon) => (
              <Button
                key={horizon}
                onClick={() => setActiveHorizon(horizon)}
                className={
                  activeHorizon === horizon
                    ? "bg-gray-200 dark:bg-gray-700"
                    : ""
                }
              >
                {horizon === "All" ? "All" : `${horizon}m`}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        {/* Forecast Table */}
        <CardBody className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-12 w-12" />
            </div>
          ) : tableRows.length > 0 ? (
            <table className="w-full min-w-max table-auto text-left">
              <thead>
                <tr>
                  {tableHeaders.map((head) => (
                    <th
                      key={head}
                      className={`border-b-2 ${theme.borderColor} ${theme.tableHeaderBg} p-4`}
                    >
                      <Typography
                        variant="small"
                        className={`font-semibold leading-none ${theme.text}`}
                      >
                        {head}
                      </Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={index} className={theme.hoverBg}>
                    <td className={`p-4 border-b ${theme.borderColor}`}>
                      <Typography
                        variant="small"
                        className={`font-bold ${theme.text}`}
                      >
                        {row.productCode}
                      </Typography>
                    </td>
                    <td className={`p-4 border-b ${theme.borderColor}`}>
                      <Typography
                        variant="small"
                        className={`font-normal ${theme.text}`}
                      >
                        {row.description}
                      </Typography>
                    </td>
                    {row.monthlyData.map((data, dataIndex) => (
                      <td
                        key={dataIndex}
                        className={`p-4 border-b ${theme.borderColor} text-center`}
                      >
                        <Typography
                          variant="small"
                          className={`font-normal ${theme.text}`}
                        >
                          {data}
                        </Typography>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <Typography color="gray" className={theme.text}>
                No forecast data loaded. Click "Import Forecast" to upload an
                Excel file.
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>

      <ExcelImportModal
        open={isImportModalOpen}
        handleOpen={handleOpenImportModal}
        onImport={handleForecastImport}
        title="Import Sales Forecast"
      />
    </>
  );
}
