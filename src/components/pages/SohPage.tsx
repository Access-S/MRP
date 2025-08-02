// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Typography,
  Card,
  CardBody,
  Spinner,
  Input,
} from "@material-tailwind/react";
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { ExcelImportModal } from "../modals/ExcelImportModal";
import { Component } from "../../types/mrp.types";
import { getAllSoh, importSohData } from "../../services/inventory.service";
import toast from "react-hot-toast";

// BLOCK 2: Constants
const TABLE_HEAD = ["Product ID", "Stock on Hand"];

// BLOCK 3: Main SohPage Component
export function SohPage() {
  // BLOCK 4: State Management
  const { theme } = useTheme();
  const [sohData, setSohData] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // BLOCK 5: Handlers and Effects
  const handleOpenImportModal = () => setIsImportModalOpen((cur) => !cur);

  const fetchData = async () => {
    setLoading(true);
    const data = await getAllSoh();
    setSohData(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSohImport = async (file: File) => {
    const loadingToast = toast.loading("Importing SOH data...");
    try {
      const { successCount, errorCount } = await importSohData(file);
      toast.dismiss(loadingToast);
      toast.success(
        `${successCount} records imported! ${
          errorCount > 0 ? `${errorCount} rows failed.` : ""
        }`
      );
      fetchData();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Import failed: ${error.message}`);
    }
  };

  const filteredSohData = useMemo(() => {
    if (!searchQuery) return sohData;
    return sohData.filter((item) =>
      item.partCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sohData, searchQuery]);

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
              Stock on Hand
            </Typography>{" "}
            {/* 👈 Corrected Title */}
            <Typography
              color="gray"
              className={`mt-1 font-normal ${theme.text} opacity-80`}
            >
              View and update current stock levels.
            </Typography>
          </div>
          <div>
            <Button
              onClick={handleOpenImportModal}
              className="flex items-center gap-3"
              size="sm"
            >
              <ArrowUpTrayIcon strokeWidth={2} className="h-4 w-4" /> Import SOH
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`p-4 border-b ${theme.borderColor}`}>
          <Input
            label="Search by Product ID"
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color={theme.isDark ? "white" : "black"}
          />
        </div>

        {/* SOH Table */}
        <CardBody className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-12 w-12" />
            </div>
          ) : filteredSohData.length > 0 ? (
            <table className="w-full min-w-max table-auto text-left">
              <thead>
                <tr>
                  {TABLE_HEAD.map((head) => (
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
                {filteredSohData.map((item) => (
                  <tr key={item.id} className={theme.hoverBg}>
                    <td className={`p-4 border-b ${theme.borderColor}`}>
                      <Typography
                        variant="small"
                        className={`font-bold ${theme.text}`}
                      >
                        {item.partCode}
                      </Typography>
                    </td>
                    <td className={`p-4 border-b ${theme.borderColor}`}>
                      <Typography
                        variant="small"
                        className={`font-semibold ${theme.text}`}
                      >
                        {item.stock.toLocaleString()}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <Typography color="gray" className={theme.text}>
                No stock data found. Use "Import SOH" to upload a file.
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>

      <ExcelImportModal
        open={isImportModalOpen}
        handleOpen={handleOpenImportModal}
        onImport={handleSohImport}
        title="Import Stock on Hand (SOH)"
      />
    </>
  );
}
