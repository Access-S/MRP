// src/components/pages/ForecastsPage.tsx

// BLOCK 1: Imports and Dependencies
import React, { useState, useEffect } from 'react';
import {
  Button, Typography, Card, Spinner, CardBody, Input,
  IconButton, ButtonGroup
} from "@material-tailwind/react";
import {
  PlusIcon, TrashIcon, ArrowPathIcon, ArrowUpTrayIcon,
  MagnifyingGlassIcon // <-- ADD THIS IMPORT
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { forecastService } from '../../services/forecast.service';
import { ForecastHeader, ForecastRow } from '../../types/mrp.types';
import toast from "react-hot-toast";

// BLOCK 2: Interface Definitions
interface ImportResult {
  message: string;
  success: boolean;
}

interface ForecastSummary {
  totalProducts: number;
  totalMonths: number;
  totalQuantity: number;
  latestDate: string | null;
}

// BLOCK 3: Constants
type TimeHorizon = '4' | '6' | '9' | 'all';
const TIME_HORIZONS: TimeHorizon[] = ['4', '6', '9', 'all'];

// BLOCK 4: Main ForecastsPage Component
export function ForecastsPage() {
  const { theme } = useTheme();
  const [tableData, setTableData] = useState<{ headers: ForecastHeader[]; rows: ForecastRow[] }>({ headers: [], rows: [] });
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizon>('6');
  
  // State for the search input
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // BLOCK 5: Data Fetching and Effects
  const fetchData = async (horizon: TimeHorizon, search: string) => {
    try {
      setLoading(true);
      setError(null);
      // Pass the search query to the service
      const data = await forecastService.getForecastTableData(horizon, search);
      setTableData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch forecast data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debounce effect for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Main data fetching effect, now triggered by horizon or debounced search
  useEffect(() => {
    fetchData(activeHorizon, debouncedSearchQuery);
  }, [activeHorizon, debouncedSearchQuery]);

  // BLOCK 6: Effects and Handlers
useEffect(() => {
  fetchData(activeHorizon);
}, [activeHorizon]);


useEffect(() => {

  if (importResult) {

    const timer = setTimeout(() => {
      setImportResult(null);
    }, 5000);


    return () => clearTimeout(timer);
  }
}, [importResult]);

const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const toastId = toast.loading('Uploading and processing forecast...');
  try {
    setImporting(true);
    setError(null);
    setImportResult(null);

    const result = await forecastService.importForecastData(file);
    setImportResult({ message: result.message, success: true });
    
    await fetchData(activeHorizon);
    toast.success(result.message, { id: toastId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
    setError(errorMessage);
    setImportResult({ message: errorMessage, success: false });
    toast.error(errorMessage, { id: toastId });
  } finally {
    setImporting(false);
    event.target.value = ''; 
  }
};

const handleConfirmDelete = async () => {
  const toastId = toast.loading('Deleting all forecast data...');
  try {
    setLoading(true);
    setError(null);
    
    await forecastService.deleteAllForecasts();
    
    await fetchData(activeHorizon);
    setImportResult(null);
    toast.success('All forecast data deleted successfully!', { id: toastId });
  } catch (err)    {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
    setError(errorMessage);
    toast.error(errorMessage, { id: toastId });
  } finally {
    setLoading(false);
    setIsDeleteConfirmOpen(false);
  }
};
  // BLOCK 7: Render Functions
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className={`p-6 rounded-lg shadow ${theme.cards}`}>
        <h3 className={`text-lg font-semibold ${theme.text}`}>Forecasted Products</h3>
        <p className="text-3xl font-bold text-blue-600">{loading ? '-' : tableData.rows.length}</p>
      </div>
      <div className={`p-6 rounded-lg shadow ${theme.cards}`}>
        <h3 className={`text-lg font-semibold ${theme.text}`}>Forecast Horizon</h3>
        <p className="text-3xl font-bold text-blue-600">{loading ? '-' : tableData.headers.length > 2 ? tableData.headers.length - 2 : 0} Months</p>
      </div>
      <div className={`p-6 rounded-lg shadow ${theme.cards}`}>
        <h3 className={`text-lg font-semibold ${theme.text}`}>Status</h3>
        <p className="text-sm text-green-600">System Ready</p>
      </div>
    </div>
  );

  const renderFileUpload = () => (
    <Card className={`w-full ${theme.cards} shadow-sm mb-6`}>
      <div className={`flex items-center justify-between p-4 border-b ${theme.borderColor}`}>
        <div>
          <Typography variant="h6" className={theme.text}>Import Forecast Data</Typography>
          <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
            Upload an Excel file to import or replace sales forecast data.
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchData(activeHorizon)} disabled={loading || importing} className="flex items-center gap-2" size="sm" variant="text">
            <ArrowPathIcon strokeWidth={2} className="h-4 w-4" />
            Refresh
          </Button>
          {tableData.rows.length > 0 && (
            <Button onClick={() => setIsDeleteConfirmOpen(true)} disabled={loading || importing} className="flex items-center gap-2 bg-red-600 hover:bg-red-700" size="sm">
              <TrashIcon strokeWidth={2} className="h-4 w-4" />
              Delete All
            </Button>
          )}
        </div>
      </div>
      <CardBody>
        <div className="mb-4">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={loading || importing} id="forecast-file-upload" className="hidden"/>
          <Button onClick={() => document.getElementById('forecast-file-upload')?.click()} disabled={loading || importing} className="flex items-center gap-3" size="sm">
            <ArrowUpTrayIcon strokeWidth={2} className="h-4 w-4" />
            {importing ? 'Processing...' : 'Choose File to Import'}
          </Button>
        </div>
        <Typography color="gray" className={`text-sm ${theme.text} opacity-80`}>
          Importing a new file will replace all existing forecast data.
        </Typography>
      </CardBody>
    </Card>
  );

  const renderImportResult = () => {
    if (!importResult) return null;
    return (
      <div className={`p-4 rounded-md mb-6 ${!importResult.success ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <Typography variant="h6" className="text-gray-900 mb-2">{importResult.success ? 'Import Successful' : 'Import Failed'}</Typography>
        <Typography className="text-sm text-gray-700">{importResult.message}</Typography>
      </div>
    );
  };

// BLOCK 8: Main Render
return (
  <>
    {renderSummaryCards()}
    {renderFileUpload()}
    {renderImportResult()}

    <Card className={`w-full ${theme.cards} shadow-sm`}>
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 border-b ${theme.borderColor}`}>
        <div>
          <Typography variant="h5" className={theme.text}>Sales Forecast Data</Typography>
          <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
            Showing forecasted sales data grouped by product.
          </Typography>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-72">
            <Input
              label="Search Product or Description"
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              color={theme.isDark ? "white" : "black"}
            />
          </div>
          <ButtonGroup variant="outlined">
            {TIME_HORIZONS.map((horizon) => (
              <Button key={horizon} onClick={() => setActiveHorizon(horizon)} className={activeHorizon === horizon ? "bg-gray-200 dark:bg-gray-700" : ""}>
                {horizon === "all" ? "All" : `${horizon}m`}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </div>
      
      <CardBody className="overflow-x-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12" /></div>
        ) : tableData.rows.length > 0 ? (
          <div className={`inline-block min-w-full align-middle`}>
            <div className={`border-2 ${theme.borderColor} rounded-lg overflow-hidden`}>
              <table className="min-w-full table-auto text-left">
                <thead className={`border-b-2 ${theme.borderColor}`}>
                  <tr>
                    {tableData.headers.map((head) => {
                      const thClasses = `${theme.tableHeaderBg} p-4 border-r ${theme.borderColor} text-center`;
                      const style: React.CSSProperties = { 
                        minWidth: head.key === 'description' ? '400px' : (head.key === 'product_code' ? '150px' : '100px') 
                      };
                      return (
                        <th key={head.key} className={thClasses} style={style}>
                          <Typography variant="small" className={`font-bold text-base ${theme.text}`}>
                            {head.label}
                          </Typography>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rowIndex) => (
                    <tr key={row.product_code || rowIndex} className={theme.hoverBg}>
                      {tableData.headers.map((header, colIndex) => {
                        const isLastCell = colIndex === tableData.headers.length - 1;
                        const alignment = header.key === 'description' ? 'text-left' : 'text-center';
                        const cellClasses = `p-1 border-b ${theme.borderColor} ${alignment} ${isLastCell ? '' : `border-r ${theme.borderColor}`}`;
                        const value = row[header.key];
                        return (
                          <td key={header.key} className={cellClasses}>
                            <Typography variant="body" className={`font-normal ${theme.text} px-2`}>
                              {typeof value === 'number' ? value.toLocaleString() : (value || '-')}
                            </Typography>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Typography color="gray" className={theme.text}>
              {searchQuery ? `No forecast data found for "${searchQuery}"` : "No forecast data found. Import a file to get started."}
            </Typography>
          </div>
        )}
      </CardBody>
    </Card>
    
    <ConfirmationDialog 
      open={isDeleteConfirmOpen} 
      handleOpen={() => setIsDeleteConfirmOpen(false)} 
      onConfirm={handleConfirmDelete} 
      title="Delete All Forecast Data?" 
      message="Are you sure you want to permanently delete ALL sales forecast data? This action cannot be undone."
    />
  </>
);
}