// BLOCK 1: Imports and Dependencies
import React, { useState, useEffect } from 'react';
import {
  Button, Typography, Card, Spinner, CardBody, Input,
  IconButton
} from "@material-tailwind/react";
import {
  PlusIcon, MagnifyingGlassIcon, TrashIcon, ArrowPathIcon
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { 
  analyzeExcelHeaders, 
  importSohData, 
  getAllSoh, 
  getSohSummary 
} from '../../services/inventory.service';
import { Component } from '../../types/mrp.types';
import toast from "react-hot-toast";
// BLOCK 2: Interface Definitions
interface ExcelAnalysis {
  headers: string[];
  sampleData: any[];
  totalRows: number;
  filename: string;
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  totalRows: number;
  batchId: string;
  errors: string[];
}

interface SohSummary {
  totalRecords: number;
  latestImport: any;
}

// BLOCK 3: Constants
const TABLE_HEAD = ["Product ID", "Description", "Stock on Hand", "Default UOM", "Locations", "EAN", "Weight KG", "Volume M3"];

// BLOCK 4: Main SOH Page Component
export function SohPage() {
  const { theme } = useTheme();
  const [sohData, setSohData] = useState<Component[]>([]);
  const [summary, setSummary] = useState<SohSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelAnalysis, setExcelAnalysis] = useState<ExcelAnalysis | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // UI states
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Confirmation dialog states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // BLOCK 5: Data Fetching Functions
  const fetchSohData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSoh();
      setSohData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SOH data');
      toast.error('Failed to fetch SOH data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const summaryData = await getSohSummary();
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  useEffect(() => {
    fetchSohData();
    fetchSummary();
  }, []);

  // BLOCK 6: File Upload and Delete Handlers
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    setLoading(true);
    setError(null);
    setSelectedFile(file);
    
    const analysis = await analyzeExcelHeaders(file);
    setExcelAnalysis(analysis);
    setShowColumnSelection(true);
    setSelectedColumns([]); // Reset selection
    toast.success('File analyzed successfully!');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to analyze Excel file');
    toast.error('Failed to analyze Excel file');
  } finally {
    setLoading(false);
  }
};

const handleColumnToggle = (columnName: string) => {
  setSelectedColumns(prev => 
    prev.includes(columnName)
      ? prev.filter(col => col !== columnName)
      : [...prev, columnName]
  );
};

const handleImport = async () => {
  if (!selectedFile || selectedColumns.length === 0) {
    setError('Please select at least one column to import');
    toast.error('Please select at least one column to import');
    return;
  }

  const toastId = toast.loading('Importing data...');
  try {
    setImporting(true);
    setError(null);
    
    const result = await importSohData(selectedFile, selectedColumns, replaceExisting);
    setImportResult(result);
    
    // Refresh data after successful import
    if (result.successCount > 0) {
      await fetchSohData();
      await fetchSummary();
      toast.success(`Successfully imported ${result.successCount} records!`, { id: toastId });
    } else {
      toast.error('No records were imported', { id: toastId });
    }
    
    // Reset upload state
    setShowColumnSelection(false);
    setSelectedFile(null);
    setExcelAnalysis(null);
    setSelectedColumns([]);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to import data');
    toast.error('Failed to import data', { id: toastId });
  } finally {
    setImporting(false);
  }
};

const handleOpenDeleteConfirm = () => {
  setIsDeleteConfirmOpen(true);
};

const handleConfirmDelete = async () => {
  const toastId = toast.loading('Deleting all data...');
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/soh`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete data');
    }

    // Refresh data
    await fetchSohData();
    await fetchSummary();
    
    // Clear any import results
    setImportResult(null);
    toast.success('All SOH data deleted successfully!', { id: toastId });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete data');
    toast.error('Failed to delete data', { id: toastId });
  } finally {
    setLoading(false);
    setIsDeleteConfirmOpen(false);
  }
};

const cancelImport = () => {
  setShowColumnSelection(false);
  setSelectedFile(null);
  setExcelAnalysis(null);
  setSelectedColumns([]);
  setError(null);
};

// BLOCK 7: Render Functions
const renderSummaryCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
    <div className={`p-6 rounded-lg shadow ${theme.cards}`}>
      <h3 className={`text-lg font-semibold ${theme.text}`}>Total Records</h3>
      <p className="text-3xl font-bold text-blue-600">{summary?.totalRecords || 0}</p>
    </div>
    <div className={`p-6 rounded-lg shadow ${theme.cards}`}>
      <h3 className={`text-lg font-semibold ${theme.text}`}>Latest Import</h3>
      <p className={`text-sm ${theme.text} opacity-80`}>
        {summary?.latestImport?.import_source || 'No imports yet'}
      </p>
      <p className={`text-xs ${theme.text} opacity-60`}>
        {summary?.latestImport?.created_at 
          ? new Date(summary.latestImport.created_at).toLocaleDateString()
          : ''
        }
      </p>
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
        <Typography variant="h6" className={theme.text}>Import SOH Data</Typography>
        <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
          Upload Excel files to import stock on hand data.
        </Typography>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={() => { fetchSohData(); fetchSummary(); }} 
          disabled={loading}
          className="flex items-center gap-2" 
          size="sm"
          variant="text"
        >
          <ArrowPathIcon strokeWidth={2} className="h-4 w-4" />
          Refresh
        </Button>
        {sohData.length > 0 && (
          <Button
            onClick={handleOpenDeleteConfirm}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            size="sm"
          >
            <TrashIcon strokeWidth={2} className="h-4 w-4" />
            Delete All Data
          </Button>
        )}
      </div>
    </div>
    
    <CardBody>
      {!showColumnSelection ? (
        <div>
          <div className="mb-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={loading}
              id="file-upload"
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={loading}
              className="flex items-center gap-3"
              size="sm"
            >
              <PlusIcon strokeWidth={2} className="h-4 w-4" />
              {loading ? 'Analyzing...' : 'Choose File'}
            </Button>
          </div>
          <Typography color="gray" className={`text-sm ${theme.text} opacity-80`}>
            Upload Excel (.xlsx, .xls) or CSV files. You'll be able to select which columns to import.
          </Typography>
        </div>
      ) : (
        <div>
          <Typography variant="h6" className={`${theme.text} mb-3`}>
            Select Columns to Import from "{excelAnalysis?.filename}"
          </Typography>
          <Typography color="gray" className={`text-sm ${theme.text} opacity-80 mb-4`}>
            Found {excelAnalysis?.totalRows} rows with {excelAnalysis?.headers.length} columns
          </Typography>
          
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {excelAnalysis?.headers.map((header, index) => (
              <label key={index} className={`flex items-center space-x-4 p-2 hover:bg-opacity-50 rounded ${theme.hoverBg}`}>
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(header)}
                  onChange={() => handleColumnToggle(header)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${theme.text}`}>{header}</span>
                  {excelAnalysis.sampleData[0] && (
                    <span className={`text-xs ${theme.text} opacity-60 ml-2`}>
                      (e.g., {excelAnalysis.sampleData[0][index] || 'empty'})
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
          
          <div className={`flex items-center space-x-4 mb-4 p-2 hover:bg-opacity-50 rounded ${theme.hoverBg}`}>
            <input
              type="checkbox"
              id="replaceExisting"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2"
            />
            <label htmlFor="replaceExisting" className={`text-sm ${theme.text}`}>
              Replace all existing data (Warning: This will delete current SOH data)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleImport}
              disabled={selectedColumns.length === 0 || importing}
              className="flex items-center gap-2"
              size="sm"
            >
              <PlusIcon strokeWidth={2} className="h-4 w-4" />
              {importing ? 'Importing...' : `Import ${selectedColumns.length} Columns`}
            </Button>
            <Button
              onClick={cancelImport}
              variant="outlined"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </CardBody>
  </Card>
);

const renderImportResult = () => {
  if (!importResult) return null;

  return (
    <div className={`p-4 rounded-md mb-6 ${
      importResult.errorCount > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
    }`}>
      <Typography variant="h6" className="text-gray-900 mb-2">Import Complete</Typography>
      <Typography className="text-sm text-gray-700">
        Successfully imported {importResult.successCount} of {importResult.totalRows} records
      </Typography>
      {importResult.errorCount > 0 && (
        <div className="mt-2">
          <Typography className="text-sm text-yellow-700">{importResult.errorCount} errors occurred:</Typography>
          <ul className="text-xs text-yellow-600 mt-1 space-y-1">
            {importResult.errors.slice(0, 5).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {importResult.errors.length > 5 && (
              <li>• ... and {importResult.errors.length - 5} more errors</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
    // BLOCK 8: Main Render
  if (loading && sohData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      {renderSummaryCards()}
      {renderFileUpload()}
      {renderImportResult()}

      <Card className={`w-full ${theme.cards} shadow-sm`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.borderColor}`}>
          <div>
            <Typography variant="h5" className={theme.text}>Stock on Hand Data</Typography>
            <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
              Manage inventory stock levels and product information.
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Typography variant="small" className={`font-normal ${theme.text}`}>
              Total Records: {sohData.length}
            </Typography>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="h-12 w-12" />
          </div>
        ) : sohData.length > 0 ? (
          <CardBody className="overflow-x-auto p-0">
            <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
              <table className="w-full table-auto text-left">
                <thead className={`border-b-2 ${theme.borderColor}`}>
                  <tr>
                    {TABLE_HEAD.map((head, index) => {
                      let thClasses = `${theme.tableHeaderBg} p-4 text-center border-r ${theme.borderColor}`;
                      let fontClasses = `font-bold text-base`;
                      
                      if (head === 'Description') {
                        thClasses = thClasses.replace('text-center', 'text-left');
                      }
                      
                      const style: React.CSSProperties = { minWidth: '120px' };
                      if (head === 'Product ID') style.minWidth = '150px';
                      if (head === 'Description') style.minWidth = '300px';
                      if (head === 'Stock on Hand') style.minWidth = '130px';
                      if (head === 'Default UOM') style.minWidth = '120px';
                      if (head === 'Locations') style.minWidth = '150px';
                      if (head === 'EAN') style.minWidth = '150px';
                      if (head === 'Weight KG') style.minWidth = '100px';
                      if (head === 'Volume M3') style.minWidth = '100px';

                      return (
                        <th key={head} className={thClasses} style={style}>
                          <Typography variant="small" className={`${fontClasses} ${theme.text}`}>
                            {head}
                          </Typography>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sohData.slice(0, 100).map((item, index) => {
                    const getCellClasses = (isLast = false, align = 'center') => {
                      let classes = `p-1 border-b ${theme.borderColor} text-${align}`;
                      if (!isLast) {
                        classes += ` border-r ${theme.borderColor}`;
                      }
                      return classes;
                    };

                    return (
                      <tr key={item.id || index} className={theme.hoverBg}>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).product_id || '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses(false, 'left')}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).description || '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-semibold ${theme.text}`}>
                            {(item as any).stock_on_hand !== undefined ? Number((item as any).stock_on_hand).toLocaleString() : '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).default_uom || '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).locations || '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).ean || '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses()}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).weight_kg !== undefined ? Number((item as any).weight_kg).toFixed(2) : '-'}
                          </Typography>
                        </td>
                        <td className={getCellClasses(true)}>
                          <Typography variant="body" className={`font-normal ${theme.text}`}>
                            {(item as any).volume_m3 !== undefined ? Number((item as any).volume_m3).toFixed(3) : '-'}
                          </Typography>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        ) : (
          <div className="p-8 text-center">
            <Typography color="gray" className={theme.text}>
              No SOH data found. Import some data to get started.
            </Typography>
          </div>
        )}

        {sohData.length > 100 && (
          <div className={`px-6 py-3 border-t ${theme.borderColor} text-center`}>
            <Typography variant="small" className={`${theme.text} opacity-80`}>
              Showing first 100 of {sohData.length} records
            </Typography>
          </div>
        )}
      </Card>
      <ConfirmationDialog 
        open={isDeleteConfirmOpen} 
        handleOpen={() => setIsDeleteConfirmOpen(false)} 
        onConfirm={handleConfirmDelete} 
        title="Delete All SOH Data?" 
        message="Are you sure you want to permanently delete ALL stock on hand data? This action cannot be undone."
      />
    </>
  );
}

// BLOCK 9: Export
export default SohPage;