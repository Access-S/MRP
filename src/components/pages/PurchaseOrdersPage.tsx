// BLOCK 1: Imports
import React, { useState, useEffect, useCallback } from "react";
import {
  Button, Typography, Card, Spinner, Chip, CardBody, Input,
  Menu, MenuHandler, MenuList, MenuItem, IconButton
} from "@material-tailwind/react";
import {
  PlusIcon, MagnifyingGlassIcon, Cog6ToothIcon, ArrowDownIcon,
  ArrowUpIcon, ArrowTopRightOnSquareIcon, ArrowLeftIcon, ArrowRightIcon
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { PoDetailModal } from "../modals/PoDetailModal";
import { CreatePoForm } from "../forms/CreatePoForm";
import { PurchaseOrder, PoStatus, ALL_PO_STATUSES } from "../../types/mrp.types";
import toast from "react-hot-toast";
import { useDebounce } from 'use-debounce';
import { fetchPurchaseOrders, updatePurchaseOrderStatus, PaginatedApiResponse } from "../../services/api.service";

// BLOCK 2: Constants and Helpers
const TABLE_HEAD = [ "View", "Manage", "PO Number", "Product Code", "Description", "Order Qty|(shippers)", "Prod. Time|(hrs)", "Status" ];

// BLOCK 3: Main Component Definition
export function PurchaseOrdersPage() {
  // BLOCK 4: State
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginatedApiResponse['pagination']>({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc");
  const [poToView, setPoToView] = useState<PurchaseOrder | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  // BLOCK 5: Data Fetching and Handlers
  const loadPurchaseOrders = useCallback(async (page: number, search: string, status: string) => {
    setLoading(true);
    try {
      const response = await fetchPurchaseOrders({ page, search, status, limit: pagination.limit, sortDirection });
      setPurchaseOrders(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.message || "Failed to load purchase orders.");
    } finally { setLoading(false); }
  }, [pagination.limit, sortDirection]);

  useEffect(() => {
    loadPurchaseOrders(1, debouncedSearchQuery, statusFilter);
  }, [debouncedSearchQuery, statusFilter, sortDirection, loadPurchaseOrders]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      loadPurchaseOrders(newPage, debouncedSearchQuery, statusFilter);
    }
  };
  
  const handleSort = () => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  const handleOpenViewModal = (po: any | null) => setPoToView(po);

  const handleStatusUpdate = async (poId: string, status: string) => {
    const toastId = toast.loading(`Updating status...`);
    try {
      const updatedStatuses = await updatePurchaseOrderStatus(poId, status);
      setPurchaseOrders(prevPOs => 
        prevPOs.map(p => {
          if (p.id === poId) {
            const newStatusArray = updatedStatuses.map(s => ({ status: s }));
            const newCurrentStatus = updatedStatuses.length > 0 ? updatedStatuses[updatedStatuses.length - 1] : 'Open';
            return { ...p, statuses: newStatusArray, current_status: newCurrentStatus };
          }
          return p;
        })
      );
      toast.success('Status updated!', { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleOpenCreateForm = () => setIsCreateFormOpen(cur => !cur);
  const handlePoCreated = () => { loadPurchaseOrders(1, '', ''); };


  // BLOCK 6: Render Logic
  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      <Card className={`w-full ${theme.cards} shadow-sm`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.borderColor}`}>
          <div>
            <Typography variant="h5" className={theme.text}>Purchase Orders</Typography>
            <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>
              Manage all incoming customer orders.
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="text" className="flex items-center gap-2" onClick={handleSort}>
              {sortDirection === "desc" ? (
                <ArrowDownIcon strokeWidth={2} className={`h-4 w-4 ${theme.text}`} />
              ) : (
                <ArrowUpIcon strokeWidth={2} className={`h-4 w-4 ${theme.text}`} />
              )}
              <Typography variant="small" className={`font-normal ${theme.text}`}>
                Sort by {sortDirection === "desc" ? "Newest" : "Oldest"}
              </Typography>
            </Button>
            <Button className="flex items-center gap-3" size="sm">
              <PlusIcon strokeWidth={2} className="h-4 w-4" /> Create New PO
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between border-b">
          <div className="p-4 flex-grow">
            <Input
              label="Search all purchase orders..."
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              color={theme.isDark ? "white" : "black"}
            />
          </div>
          <div className="p-4 w-full md:w-auto">
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full p-2 border rounded-md ${theme.borderColor} ${theme.bg} ${theme.text}`}
            >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Wip Called">Wip Called</option>
                <option value="Packaging Called">Packaging Called</option>
                <option value="In Production">In Production</option>
                <option value="Despatched/ Completed">Despatched/ Completed</option>
                <option value="PO Canceled">PO Canceled</option>
            </select>
          </div>
          <div className="p-4 flex items-center gap-4">
            <Button variant="text" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
              <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
            </Button>
            <Typography>Page {pagination.page} of {pagination.totalPages}</Typography>
            <Button variant="text" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Next <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12" /></div>
        ) : purchaseOrders.length > 0 ? (
          <CardBody className="overflow-x-auto p-0">
            <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
              <table className="w-full table-fixed text-left">
                 <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "35%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
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
                              <Typography variant="small" className={`font-semibold leading-tight ${theme.text}`}>{head.split("|")[0]}</Typography>
                              <Typography variant="small" className={`font-semibold leading-tight ${theme.text} opacity-80`}>{head.split("|")[1]}</Typography>
                            </>
                          ) : (
                            <Typography variant="small" className={`font-semibold leading-none ${theme.text}`}>{head}</Typography>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => {
                    const hoverBgClass = theme.hoverBg;
                    const productionTimeHours = po.hourly_run_rate > 0 ? po.ordered_qty_shippers / po.hourly_run_rate : 0;
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
                          <IconButton variant="text" size="sm" onClick={() => handleOpenViewModal(po)}>
                            <ArrowTopRightOnSquareIcon className={`h-5 w-5 ${theme.text}`} />
                          </IconButton>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Menu>
                            <MenuHandler>
                              <IconButton variant="text" size="sm">
                                <Cog6ToothIcon className={`h-5 w-5 ${theme.text}`} />
                              </IconButton>
                            </MenuHandler>
                            <MenuList>
                              <MenuItem>Edit PO Details</MenuItem>
                              <hr className="my-2" />
                              <MenuItem className="text-red-500 hover:bg-red-50 focus:bg-red-50 active:bg-red-50">
                                Delete PO
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography variant="small" className={`font-bold ${theme.text}`}>{po.po_number}</Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography variant="small" className={`font-normal ${theme.text}`}>{po.product?.product_code || 'N/A'}</Typography>
                        </td>
                        <td className={`${getCellClasses()} text-left`}>
                          <Typography variant="small" className={`font-normal ${theme.text}`}>{po.description}</Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography variant="small" className={`font-semibold ${theme.text}`}>{Number(po.ordered_qty_shippers || 0).toFixed(2)}</Typography>
                        </td>
                        <td className={`${getCellClasses()} text-center`}>
                          <Typography variant="small" className={`font-normal ${theme.text}`}>{productionTimeHours.toFixed(2)}</Typography>
                        </td>
                        <td className={`${getCellClasses(true)} text-center`}>
                          <Menu>
                            <MenuHandler>
                              <div className="flex flex-wrap justify-center gap-1 cursor-pointer p-1">
                                {po.statuses?.map((s: { status: string }) => (
                                  <Chip
                                    key={s.status}
                                    variant="ghost"
                                    size="sm"
                                    value={s.status}
                                    color={ s.status === "PO Check" ? "red" : s.status === "Despatched/ Completed" ? "blue" : "blue-gray" }
                                  />
                                ))}
                                {(!po.statuses || po.statuses.length === 0) && (
                                   <Chip variant="ghost" size="sm" value="Open" color="green" />
                                )}
                              </div>
                            </MenuHandler>
                            <MenuList>
                              {ALL_PO_STATUSES.map((statusOption) => {
                                const isChecked = po.statuses?.some((s: { status: string }) => s.status === statusOption);
                                return (
                                  <MenuItem key={statusOption} onClick={() => handleStatusUpdate(po.id, statusOption)}>
                                    <span className={`mr-2 ${isChecked ? "opacity-100" : "opacity-0"}`}>✓</span>
                                    {statusOption}
                                  </MenuItem>
                                );
                              })}
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
              {searchQuery || statusFilter ? `No purchase orders found matching the current filters.` : "No purchase orders found."}
            </Typography>
          </div>
        )}
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
    </>
  );
}