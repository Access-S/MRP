// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Typography,
  Card,
  Spinner,
  Chip,
  CardBody,
  Collapse,
  Input,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  IconButton,
} from "@material-tailwind/react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { CreatePoForm } from "../forms/CreatePoForm";
import { EditPoForm } from "../forms/EditPoForm";
import { DespatchPoForm } from "../forms/DespatchPoForm";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { PurchaseOrder, Product, PoStatus } from "../../types/mrp.types";
import {
  getAllPurchaseOrders,
  updatePoStatus,
  despatchPo,
  reopenDespatchedPo,
  deletePurchaseOrder,
} from "../../services/purchaseOrder.service";
import { getAllProducts } from "../../services/product.service";
import { ALL_PO_STATUSES } from "../../types/mrp.types";
import toast from "react-hot-toast";

// BLOCK 2: Constants and Helpers
const formatDate = (date: Date) => {
  if (!date || !(date instanceof Date)) return "N/A";
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};
const TABLE_HEAD = [
  "Actions",
  "PO Number",
  "Product Code",
  "Description",
  "Order Qty (shprs)",
  "Prod. Time (hrs)",
  "Status",
];

// BLOCK 3: PoDetailsRow Component
const PoDetailsRow = ({
  po,
  isVisible,
  theme,
}: {
  po: PurchaseOrder;
  isVisible: boolean;
  theme: any;
}) => {
  if (!po || !po.id) return null;
  const subRowClass = theme.isDark ? "bg-gray-800" : "bg-blue-gray-50/50";
  const bulkComponent = po.components?.find(
    (c) => c.partType === "Bulk - Supplied"
  );
  const unitsPerShipper = bulkComponent?.perShipper || "N/A";
  const DetailItem = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex flex-col text-center">
      <Typography
        variant="small"
        className={`font-semibold leading-none ${theme.text} opacity-70`}
      >
        {label}
      </Typography>
      <Typography variant="small" className={`font-normal mt-1 ${theme.text}`}>
        {value}
      </Typography>
    </div>
  );
  const isDespatched = po.status.includes("Despatched/ Completed");
  return (
    <tr>
      <td colSpan={TABLE_HEAD.length} className="p-0">
        <Collapse open={isVisible}>
          <div className={`p-6 ${subRowClass}`}>
            {isDespatched ? (
              <div className="flex flex-row items-start justify-around">
                <DetailItem
                  label="Delivery Date"
                  value={formatDate(po.deliveryDate!)}
                />
                <DetailItem
                  label="Delivery Docket #"
                  value={po.deliveryDocketNumber}
                />
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-y-4 gap-x-8">
                <DetailItem label="Customer" value={po.customerName} />
                <DetailItem
                  label="Created Date"
                  value={formatDate(po.poCreatedDate)}
                />
                <DetailItem
                  label="Received Date"
                  value={formatDate(po.poReceivedDate)}
                />
                <DetailItem label="Units / Shipper" value={unitsPerShipper} />
                <DetailItem
                  label="Qty (Pieces)"
                  value={po.orderedQtyPieces.toLocaleString()}
                />
              </div>
            )}
          </div>
        </Collapse>
      </td>
    </tr>
  );
};

// BLOCK 4: Main PurchaseOrdersPage Component Definition
export function PurchaseOrdersPage() {
  // BLOCK 5: State Management
  const { theme } = useTheme();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState<PurchaseOrder | null>(null);
  const [isDespatchFormOpen, setIsDespatchFormOpen] = useState(false);
  const [poToDespatch, setPoToDespatch] = useState<PurchaseOrder | null>(null);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [poToReopen, setPoToReopen] = useState<PurchaseOrder | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);

  // BLOCK 6: Handlers and Effects
  const handleOpenCreateForm = () => setIsCreateFormOpen((cur) => !cur);
  const handleOpenEditForm = (po: PurchaseOrder | null) => {
    setPoToEdit(po);
    setIsEditFormOpen(po ? true : false);
  };
  const handleOpenDespatchForm = (po: PurchaseOrder | null) => {
    setPoToDespatch(po);
    setIsDespatchFormOpen(po ? true : false);
  };
  const handleOpenReopenConfirm = (po: PurchaseOrder | null) => {
    setPoToReopen(po);
    setIsReopenConfirmOpen(po ? true : false);
  };
  const handleOpenDeleteConfirm = (po: PurchaseOrder | null) => {
    setPoToDelete(po);
    setIsDeleteConfirmOpen(po ? true : false);
  };
  const handleRowToggle = (poId: string) =>
    setOpenRow(openRow === poId ? null : poId);
  const handleSort = () =>
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const fetchData = async () => {
    setLoading(true);
    try {
      const products = await getAllProducts();
      setAllProducts(products);
      const fetchedPOs = await getAllPurchaseOrders(products, sortDirection);
      setPurchaseOrders(fetchedPOs);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Could not load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sortDirection]);

  const handlePoCreated = () => {
    fetchData();
  };

  const handlePoUpdate = (updatedPoData: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prevPOs) =>
      prevPOs.map((po) =>
        po.id === updatedPoData.id ? { ...po, ...updatedPoData } : po
      )
    );
  };

  const handleStatusUpdate = async (po: PurchaseOrder, newStatus: string) => {
    if (newStatus === "Despatched/ Completed") {
      handleOpenDespatchForm(po);
      return;
    }

    const toastId = toast.loading("Updating status...");
    try {
      // Let the service do the work and tell us what the new state is
      const newStatusArray = await updatePoStatus(
        po.id,
        newStatus as PoStatus,
        po.status
      );

      // Update the UI with the exact new state from the service
      handlePoUpdate({ id: po.id, status: newStatusArray });

      toast.success("Status updated!", { id: toastId });
    } catch (error) {
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  const handleConfirmDespatch = async (
    deliveryDate: string,
    docketNumber: string
  ) => {
    if (!poToDespatch) return;
    const toastId = toast.loading("Despatching PO...");
    try {
      await despatchPo(poToDespatch.id, deliveryDate, docketNumber);
      handlePoUpdate({
        id: poToDespatch.id,
        status: ["Despatched/ Completed"],
        deliveryDate: new Date(deliveryDate),
        deliveryDocketNumber: docketNumber,
      });
      toast.success("PO despatched successfully!", { id: toastId });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to despatch PO.");
    }
  };

  const handleConfirmReopen = async () => {
    if (!poToReopen) return;
    const toastId = toast.loading("Re-opening PO...");
    try {
      await reopenDespatchedPo(poToReopen.id);
      handlePoUpdate({
        id: poToReopen.id,
        status: ["Open"],
        deliveryDate: undefined,
        deliveryDocketNumber: undefined,
      });
      toast.success("PO re-opened successfully!", { id: toastId });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to re-open PO.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!poToDelete) return;
    const toastId = toast.loading("Deleting PO...");
    try {
      await deletePurchaseOrder(poToDelete.id);
      setPurchaseOrders((prevPOs) =>
        prevPOs.filter((po) => po.id !== poToDelete.id)
      );
      toast.success(`PO ${poToDelete.poNumber} deleted successfully.`, {
        id: toastId,
      });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to delete PO.");
    }
  };

  const filteredPurchaseOrders = useMemo(() => {
    if (!Array.isArray(purchaseOrders)) return [];
    const validPOs = purchaseOrders.filter(
      (po) => po && typeof po === "object"
    );
    if (!searchQuery) return validPOs;
    const lowercasedQuery = searchQuery.toLowerCase();
    return validPOs.filter((po) => {
      const poNumberMatch = po.poNumber
        ? po.poNumber.toLowerCase().includes(lowercasedQuery)
        : false;
      const productCodeMatch = po.productCode
        ? po.productCode.toLowerCase().includes(lowercasedQuery)
        : false;
      const descriptionMatch = po.description
        ? po.description.toLowerCase().includes(lowercasedQuery)
        : false;
      return poNumberMatch || productCodeMatch || descriptionMatch;
    });
  }, [purchaseOrders, searchQuery]);

  // BLOCK 7: Render Logic
  if (!loading && !Array.isArray(purchaseOrders)) {
    return (
      <Typography color="red" className="p-8">
        Error: Data could not be loaded.
      </Typography>
    );
  }

  return (
    <>
      <Card className={`w-full ${theme.cards} shadow-sm`}>
        {/* --- CORRECTED HEADER --- */}
        <div
          className={`flex items-center justify-between p-4 border-b ${theme.borderColor}`}
        >
          <div>
            <Typography variant="h5" className={theme.text}>
              Purchase Orders
            </Typography>
            <Typography
              color="gray"
              className={`mt-1 font-normal ${theme.text} opacity-80`}
            >
              Manage all incoming customer orders.
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="text"
              className="flex items-center gap-2"
              onClick={handleSort}
            >
              {sortDirection === "desc" ? (
                <ArrowDownIcon
                  strokeWidth={2}
                  className={`h-4 w-4 ${theme.text}`}
                />
              ) : (
                <ArrowUpIcon
                  strokeWidth={2}
                  className={`h-4 w-4 ${theme.text}`}
                />
              )}
              <Typography
                variant="small"
                className={`font-normal ${theme.text}`}
              >
                Sort by {sortDirection === "desc" ? "Newest" : "Oldest"}
              </Typography>
            </Button>
            <Button
              onClick={handleOpenCreateForm}
              className="flex items-center gap-3"
              size="sm"
            >
              <PlusIcon strokeWidth={2} className="h-4 w-4" /> Create New PO
            </Button>
          </div>
        </div>

        <div className={`p-4 border-b ${theme.borderColor}`}>
          <Input
            label="Search by PO Number, FG, or Description"
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color={theme.isDark ? "white" : "black"}
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="h-12 w-12" />
          </div>
        ) : filteredPurchaseOrders.length > 0 ? (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-max table-auto text-left">
              <thead>
                <tr>
                  {TABLE_HEAD.map((head) => (
                    <th
                      key={head}
                      className={`border-b-2 ${theme.borderColor} ${theme.tableHeaderBg} p-4 text-center`}
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
                {filteredPurchaseOrders.map((po) => {
                  const isRowOpen = openRow === po.id;
                  const openRowBgClass = theme.activeRowBg;
                  const productionTimeHours =
                    (po.orderedQtyShippers * (po.minsPerShipper || 0)) / 60;
                  const statuses = Array.isArray(po.status)
                    ? po.status
                    : ["Error"];

                  return (
                    <React.Fragment key={po.id}>
                      <tr
                        className={`cursor-pointer ${
                          isRowOpen ? openRowBgClass : theme.hoverBg
                        }`}
                        onClick={() => handleRowToggle(po.id)}
                      >
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center`}
                        >
                          <Menu>
                            <MenuHandler>
                              <IconButton
                                variant="text"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Cog6ToothIcon
                                  className={`h-5 w-5 ${theme.text}`}
                                />
                              </IconButton>
                            </MenuHandler>
                            <MenuList>
                              <MenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditForm(po);
                                }}
                              >
                                Edit PO Details
                              </MenuItem>
                              <hr className="my-2" />
                              <MenuItem
                                className="text-red-500 hover:bg-red-50 focus:bg-red-50 active:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteConfirm(po);
                                }}
                              >
                                Delete PO
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </td>
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center`}
                        >
                          <Typography
                            variant="small"
                            className={`font-bold ${theme.text}`}
                          >
                            {po.poNumber}
                          </Typography>
                        </td>
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center`}
                        >
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {po.productCode}
                          </Typography>
                        </td>
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-left`}
                        >
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {po.description}
                          </Typography>
                        </td>
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center`}
                        >
                          <Typography
                            variant="small"
                            className={`font-semibold ${theme.text}`}
                          >
                            {po.orderedQtyShippers.toFixed(2)}
                          </Typography>
                        </td>
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center`}
                        >
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {productionTimeHours.toFixed(2)}
                          </Typography>
                        </td>
                        {/* --- THIS IS THE CORRECTED STATUS CELL --- */}
                        <td
                          className={`p-4 border-b ${theme.borderColor} text-center max-w-xs`}
                        >
                          <Menu>
                            <MenuHandler>
                              <div
                                className="flex flex-wrap justify-center gap-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {statuses.map((s) => (
                                  <Chip
                                    key={s}
                                    variant="ghost" // Restored "ghost" variant
                                    size="sm"
                                    value={s}
                                    color={
                                      s === "PO Check" || s === "Error"
                                        ? "red"
                                        : s === "Open"
                                        ? "green"
                                        : s === "Despatched/ Completed"
                                        ? "blue"
                                        : "blue-gray"
                                    }
                                  />
                                ))}
                              </div>
                            </MenuHandler>
                            <MenuList>
                              {po.status.includes("PO Check") ? (
                                <MenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditForm(po);
                                  }}
                                >
                                  Correct PO Details
                                </MenuItem>
                              ) : po.status.includes(
                                  "Despatched/ Completed"
                                ) ? (
                                <MenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReopenConfirm(po);
                                  }}
                                >
                                  Re-open Despatched PO
                                </MenuItem>
                              ) : (
                                ALL_PO_STATUSES.map((statusOption) => {
                                  if (statusOption === "PO Check") return null;
                                  return (
                                    <MenuItem
                                      key={statusOption}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(po, statusOption);
                                      }}
                                    >
                                      <span
                                        className={`mr-2 ${
                                          statuses.includes(statusOption)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        }`}
                                      >
                                        ✓
                                      </span>
                                      {statusOption}
                                    </MenuItem>
                                  );
                                })
                              )}
                            </MenuList>
                          </Menu>
                        </td>
                      </tr>
                      <PoDetailsRow
                        po={po}
                        isVisible={isRowOpen}
                        theme={theme}
                      />
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        ) : (
          <div className="p-8 text-center">
            <Typography color="gray" className={theme.text}>
              {searchQuery
                ? `No purchase orders found matching "${searchQuery}"`
                : "No purchase orders found."}
            </Typography>
          </div>
        )}
      </Card>

      <CreatePoForm
        open={isCreateFormOpen}
        handleOpen={handleOpenCreateForm}
        onPoCreated={handlePoCreated}
      />
      <EditPoForm
        open={isEditFormOpen}
        handleOpen={() => handleOpenEditForm(null)}
        po={poToEdit}
        product={
          allProducts.find((p) => p.productCode === poToEdit?.productCode) ||
          null
        }
        onUpdate={handlePoUpdate}
      />
      <DespatchPoForm
        open={isDespatchFormOpen}
        handleOpen={() => handleOpenDespatchForm(null)}
        onSubmit={handleConfirmDespatch}
      />
      <ConfirmationDialog
        open={isReopenConfirmOpen}
        handleOpen={() => handleOpenReopenConfirm(null)}
        onConfirm={handleConfirmReopen}
        title="Re-open Despatched PO?"
        message="..."
      />
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        handleOpen={() => handleOpenDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Purchase Order?"
        message="..."
      />
    </>
  );
}
