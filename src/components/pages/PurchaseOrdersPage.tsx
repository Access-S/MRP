// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Typography,
  Card,
  Spinner,
  Chip,
  CardBody,
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
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon, // --- THIS WAS MISSING ---
  ArrowRightIcon, // --- THIS WAS MISSING ---
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { CreatePoForm } from "../forms/CreatePoForm";
import { EditPoForm } from "../forms/EditPoForm";
import { DespatchPoForm } from "../forms/DespatchPoForm";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { PoDetailModal } from "../modals/PoDetailModal";
import { PurchaseOrder, Product, PoStatus } from "../../types/mrp.types";
import {
  updatePoStatus,
  despatchPo,
  reopenDespatchedPo,
  deletePurchaseOrder,
  getTotalPurchaseOrdersCount,
  getPurchaseOrdersPaginated,
  PaginatedPoResponse,
} from "../../services/purchaseOrder.service";
import { getAllProducts } from "../../services/product.service";
import { ALL_PO_STATUSES } from "../../types/mrp.types";
import toast from "react-hot-toast";
import { PaginationControls } from "../PaginationControls";
import { QueryDocumentSnapshot } from "firebase/firestore";

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
  "View",
  "Manage",
  "PO Number",
  "Product Code",
  "Description",
  "Order Qty|(shippers)",
  "Prod. Time|(hrs)",
  "Status",
];

// BLOCK 3: Main Component Definition
export function PurchaseOrdersPage() {
  // BLOCK 4: State
  const { theme } = useTheme();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [poResponse, setPoResponse] = useState<PaginatedPoResponse>({
    purchaseOrders: [],
    firstVisibleDoc: null,
    lastVisibleDoc: null,
  });
  const [totalPoCount, setTotalPoCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pageCursors, setPageCursors] = useState<
    (QueryDocumentSnapshot | null)[]
  >([null]);
  const [poToView, setPoToView] = useState<PurchaseOrder | null>(null);
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

  // BLOCK 5: Handlers & Effects
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
  const handleOpenViewModal = (po: PurchaseOrder | null) => {
    setPoToView(po);
  };

  const fetchPageData = async (options: {
    direction?: "next" | "prev";
    sort?: "asc" | "desc";
    perPage?: number;
  }) => {
    if (!allProducts.length) return;
    setLoading(true);
    try {
      const {
        direction,
        sort = sortDirection,
        perPage = itemsPerPage,
      } = options;
      let cursor: QueryDocumentSnapshot | null | undefined = undefined;
      if (direction === "next") {
        cursor = poResponse.lastVisibleDoc;
        setCurrentPage((prev) => prev + 1);
      } else if (direction === "prev" && currentPage > 1) {
        cursor = pageCursors[currentPage - 2] ?? undefined;
        setCurrentPage((prev) => prev - 1);
      } else {
        setCurrentPage(1);
        setPageCursors([null]);
      }
      const response = await getPurchaseOrdersPaginated(allProducts, {
        sortDirection: sort,
        itemsPerPage: perPage,
        direction: direction,
        cursor,
      });
      if (direction === "next") {
        setPageCursors((prev) => [...prev, response.lastVisibleDoc]);
      } else if (direction === "prev") {
        setPageCursors((prev) => prev.slice(0, -1));
      } else {
        setPageCursors([null, response.lastVisibleDoc]);
      }
      setPoResponse(response);
    } catch (error) {
      console.error("Error fetching paginated data:", error);
      toast.error("Could not load page data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = () => {
    const newSortDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newSortDirection);
    fetchPageData({ sort: newSortDirection });
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    fetchPageData({ perPage: newItemsPerPage });
  };

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      try {
        const products = await getAllProducts();
        setAllProducts(products);
        const total = await getTotalPurchaseOrdersCount();
        setTotalPoCount(total);
        const response = await getPurchaseOrdersPaginated(products, {
          sortDirection,
          itemsPerPage,
        });
        setPoResponse(response);
        setPageCursors([null, response.lastVisibleDoc]);
      } catch (error) {
        console.error("Initial data load failed:", error);
        toast.error("Failed to load initial data.");
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, []);

  const handlePoCreated = async () => {
    const total = await getTotalPurchaseOrdersCount();
    setTotalPoCount(total);
    fetchPageData({});
  };

  const handlePoUpdate = (updatedPoData: Partial<PurchaseOrder>) => {
    setPoResponse((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((po) =>
        po.id === updatedPoData.id ? { ...po, ...updatedPoData } : po
      ),
    }));
  };

  const handleStatusUpdate = async (po: PurchaseOrder, newStatus: string) => {
    if (newStatus === "Despatched/ Completed") {
      handleOpenDespatchForm(po);
      return;
    }
    const toastId = toast.loading("Updating status...");
    try {
      const newStatusArray = await updatePoStatus(
        po.id,
        newStatus as PoStatus,
        po.status
      );
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
      const total = await getTotalPurchaseOrdersCount();
      setTotalPoCount(total);
      fetchPageData({});
      toast.success(`PO ${poToDelete.poNumber} deleted successfully.`, {
        id: toastId,
      });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to delete PO.");
    }
  };

  const filteredPurchaseOrders = useMemo(() => {
    if (!searchQuery) return poResponse.purchaseOrders;
    const lowercasedQuery = searchQuery.toLowerCase();
    return poResponse.purchaseOrders.filter((po) => {
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
  }, [poResponse.purchaseOrders, searchQuery]);

  // BLOCK 6: Render Logic
  if (!allProducts.length && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  const paginationProps = {
    currentPage,
    itemsPerPage,
    totalItems: totalPoCount,
    onPageChange: (direction: "next" | "prev") => fetchPageData({ direction }),
    onItemsPerPageChange: handleItemsPerPageChange,
    hasNextPage:
      poResponse.lastVisibleDoc !== null &&
      poResponse.purchaseOrders.length === itemsPerPage,
    hasPrevPage: currentPage > 1,
  };

  return (
    <>
      <Card className={`w-full ${theme.cards} shadow-sm`}>
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

        <div className="flex flex-wrap items-center justify-between border-b">
          <div className="p-4 flex-grow">
            <Input
              label="Search current page..."
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              color={theme.isDark ? "white" : "black"}
            />
          </div>
          <div className="p-4 flex items-center gap-4">
            <Button
              variant="text"
              className="flex items-center gap-2"
              onClick={() => paginationProps.onPageChange("prev")}
              disabled={!paginationProps.hasPrevPage}
              placeholder={undefined}
              onPointerEnterCapture={undefined}
              onPointerLeaveCapture={undefined}
            >
              <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="text"
              className="flex items-center gap-2"
              onClick={() => paginationProps.onPageChange("next")}
              disabled={!paginationProps.hasNextPage}
              placeholder={undefined}
              onPointerEnterCapture={undefined}
              onPointerLeaveCapture={undefined}
            >
              Next <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="h-12 w-12" />
          </div>
        ) : filteredPurchaseOrders.length > 0 ? (
          <CardBody className="overflow-x-auto p-0">
            <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col style={{ width: "5%" }} />{" "}
                  <col style={{ width: "5%" }} />{" "}
                  <col style={{ width: "10%" }} />{" "}
                  <col style={{ width: "10%" }} />{" "}
                  <col style={{ width: "35%" }} />{" "}
                  <col style={{ width: "10%" }} />{" "}
                  <col style={{ width: "10%" }} />{" "}
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead className={`border-b-2 ${theme.borderColor}`}>
                  <tr>
                    {TABLE_HEAD.map((head, index) => {
                      let thClasses = `${theme.tableHeaderBg} p-2 text-center`;
                      if (index < TABLE_HEAD.length - 1) {
                        thClasses += ` border-r ${theme.borderColor}`;
                      }
                      return (
                        <th key={head} className={thClasses}>
                          {head.includes("|") ? (
                            <>
                              <Typography
                                variant="small"
                                className={`font-semibold leading-tight ${theme.text}`}
                              >
                                {head.split("|")[0]}
                              </Typography>
                              <Typography
                                variant="small"
                                className={`font-semibold leading-tight ${theme.text} opacity-80`}
                              >
                                {head.split("|")[1]}
                              </Typography>
                            </>
                          ) : (
                            <Typography
                              variant="small"
                              className={`font-semibold leading-none ${theme.text}`}
                            >
                              {head}
                            </Typography>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchaseOrders.map((po) => {
                    const hoverBgClass = theme.hoverBg;
                    const hourlyRunRate = po.hourlyRunRate || 0;
                    const productionTimeHours =
                      hourlyRunRate > 0
                        ? po.orderedQtyShippers / hourlyRunRate
                        : 0;
                    const statuses = Array.isArray(po.status)
                      ? po.status
                      : ["Error"];
                    const getCellClasses = (isLast = false) => {
                      let classes = `border-b ${theme.borderColor} p-1`;
                      if (!isLast) {
                        classes += ` border-r`;
                      }
                      return classes;
                    };
                    return (
                      <tr key={po.id} className={hoverBgClass}>
                        <td className={`${getCellClasses()} text-center`}>
                          <IconButton
                            variant="text"
                            size="sm"
                            onClick={() => handleOpenViewModal(po)}
                          >
                            <ArrowTopRightOnSquareIcon
                              className={`h-5 w-5 ${theme.text}`}
                            />
                          </IconButton>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Menu>
                            <MenuHandler>
                              <IconButton variant="text" size="sm">
                                <Cog6ToothIcon
                                  className={`h-5 w-5 ${theme.text}`}
                                />
                              </IconButton>
                            </MenuHandler>
                            <MenuList>
                              <MenuItem onClick={() => handleOpenEditForm(po)}>
                                Edit PO Details
                              </MenuItem>
                              <hr className="my-2" />
                              <MenuItem
                                className="text-red-500 hover:bg-red-50 focus:bg-red-50 active:bg-red-50"
                                onClick={() => handleOpenDeleteConfirm(po)}
                              >
                                Delete PO
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography
                            variant="small"
                            className={`font-bold ${theme.text}`}
                          >
                            {po.poNumber}
                          </Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {po.productCode}
                          </Typography>
                        </td>
                        <td className={`${getCellClasses()} text-left`}>
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {po.description}
                          </Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography
                            variant="small"
                            className={`font-semibold ${theme.text}`}
                          >
                            {po.orderedQtyShippers.toFixed(2)}
                          </Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography
                            variant="small"
                            className={`font-normal ${theme.text}`}
                          >
                            {productionTimeHours.toFixed(2)}
                          </Typography>
                        </td>
                        <td className={`${getCellClasses(true)} text-center`}>
                          <Menu>
                            <MenuHandler>
                              <div className="flex flex-wrap justify-center gap-1 cursor-pointer">
                                {statuses.map((s) => (
                                  <Chip
                                    key={s}
                                    variant="ghost"
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
                                  onClick={() => handleOpenEditForm(po)}
                                >
                                  Correct PO Details
                                </MenuItem>
                              ) : po.status.includes(
                                  "Despatched/ Completed"
                                ) ? (
                                <MenuItem
                                  onClick={() => handleOpenReopenConfirm(po)}
                                >
                                  Re-open Despatched PO
                                </MenuItem>
                              ) : (
                                ALL_PO_STATUSES.map((statusOption) => {
                                  if (statusOption === "PO Check") return null;
                                  return (
                                    <MenuItem
                                      key={statusOption}
                                      onClick={() =>
                                        handleStatusUpdate(po, statusOption)
                                      }
                                    >
                                      <span
                                        className={`mr-2 ${
                                          statuses.includes(statusOption)
                                            ? "opacity-1-00"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
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

        <div className="border-t">
          <PaginationControls {...paginationProps} />
        </div>
      </Card>

      <PoDetailModal
        open={poToView !== null}
        handleOpen={() => handleOpenViewModal(null)}
        po={poToView}
      />
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
