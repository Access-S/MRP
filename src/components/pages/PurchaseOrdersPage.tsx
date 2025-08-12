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
import { EditPoForm } from "../forms/EditPoForm";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { PaginationControls } from "../PaginationControls";
import { PurchaseOrder, PoStatus, ALL_PO_STATUSES } from "../../types/mrp.types";
import toast from "react-hot-toast";
import { useDebounce } from 'use-debounce';
import { fetchPurchaseOrders, updatePurchaseOrderStatus, deletePo, PaginatedApiResponse } from "../../services/api.service";

// BLOCK 2: Constants and Helpers
const TABLE_HEAD = [ "View", "Manage", "PO Number", "Product Code", "Description", "Order Qty|(shippers)", "Prod. Time|(hrs)", "Status" ];

// BLOCK 3: Main Component Definition
export function PurchaseOrdersPage() {
  // BLOCK 4: State
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginatedApiResponse['pagination']>({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc");
  const [poToView, setPoToView] = useState<any | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<any | null>(null);

  // BLOCK 5: Data Fetching and Handlers
  const loadPurchaseOrders = useCallback(async (page: number, search: string, status: string, limit: number) => {
    setLoading(true);
    try {
      const response = await fetchPurchaseOrders({ page, search, status, limit, sortDirection });
      setPurchaseOrders(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.message || "Failed to load purchase orders.");
    } finally { setLoading(false); }
  }, [sortDirection]);

  useEffect(() => {
    loadPurchaseOrders(1, debouncedSearchQuery, statusFilter, itemsPerPage);
  }, [debouncedSearchQuery, statusFilter, sortDirection, itemsPerPage, loadPurchaseOrders]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      loadPurchaseOrders(newPage, debouncedSearchQuery, statusFilter, itemsPerPage);
    }
  };
  
  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
  };

  const handleOpenViewModal = (po: any | null) => setPoToView(po);
  const handleSort = () => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  
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
  const handlePoCreated = () => { toast.success("Purchase Order created successfully!"); loadPurchaseOrders(1, '', '', itemsPerPage); };
  
  const handleOpenDeleteConfirm = (po: any | null) => { setPoToDelete(po); setIsDeleteConfirmOpen(!!po); };
  const handleConfirmDelete = async () => {
    if (!poToDelete) return;
    const toastId = toast.loading(`Deleting PO ${poToDelete.po_number}...`);
    try {
      await deletePo(poToDelete.id);
      setPurchaseOrders(prevPOs => prevPOs.filter(p => p.id !== poToDelete.id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      toast.success(`PO ${poToDelete.po_number} deleted successfully.`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      handleOpenDeleteConfirm(null);
    }
  };

  const handleOpenEditForm = (po: any | null) => { setPoToEdit(po); setIsEditFormOpen(!!po); };
  const handlePoUpdate = (updatedPo: any) => { toast.success(`PO ${updatedPo.po_number} updated successfully!`); setPurchaseOrders(prevPOs => prevPOs.map(p => (p.id === updatedPo.id ? updatedPo : p))); };

  // BLOCK 6: Render Logic
  if (loading && purchaseOrders.length === 0) {
    return ( <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12" /></div> );
  }

  return (
    <>
      <Card className={`w-full ${theme.cards} shadow-sm`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.borderColor}`}>
          <div>
            <Typography variant="h5" className={theme.text}>Purchase Orders</Typography>
            <Typography color="gray" className={`mt-1 font-normal ${theme.text} opacity-80`}>Manage all incoming customer orders.</Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="text" className="flex items-center gap-2" onClick={handleSort}>
              {sortDirection === "desc" ? <ArrowDownIcon strokeWidth={2} className={`h-4 w-4 ${theme.text}`} /> : <ArrowUpIcon strokeWidth={2} className={`h-4 w-4 ${theme.text}`} />}
              <Typography variant="small" className={`font-normal ${theme.text}`}>Sort by {sortDirection === "desc" ? "Newest" : "Oldest"}</Typography>
            </Button>
            <Button onClick={handleOpenCreateForm} className="flex items-center gap-3" size="sm">
              <PlusIcon strokeWidth={2} className="h-4 w-4" /> Create New PO
            </Button>
          </div>
        </div>

        <div className={`flex flex-wrap items-center justify-between border-b ${theme.borderColor}`}>
          <div className="p-4 flex-grow">
            <Input label="Search all purchase orders..." icon={<MagnifyingGlassIcon className="h-5 w-5" />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} color={theme.isDark ? "white" : "black"} />
          </div>
          <div className="p-4 w-full md:w-auto">
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full p-2 border rounded-md ${theme.borderColor} ${theme.cards} ${theme.text}`}
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
            <Button variant="text" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className={theme.buttonText}>
              <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
            </Button>
            <Button variant="text" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className={theme.buttonText}>
              Next <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {loading ? ( <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12" /></div> ) : purchaseOrders.length > 0 ? (
          <CardBody className="overflow-x-auto p-0">
            <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
              <table className="w-full table-auto text-left">
                 <thead className={`border-b-2 ${theme.borderColor}`}>
                  <tr>
                    {TABLE_HEAD.map((head) => {
                      let thClasses = `${theme.tableHeaderBg} p-4 text-center border-r ${theme.borderColor}`;
                      let fontClasses = `font-bold text-base`;
                      if (head === 'Description') { thClasses = thClasses.replace('text-center', 'text-left'); }
                      
                      const style: React.CSSProperties = { minWidth: '120px' };
                        if (head === 'View') style.minWidth = '50px';
                        if (head === 'Manage') style.minWidth = '20px';
                        if (head === 'Description') style.minWidth = '470px';
                        if (head === 'Status') style.minWidth = '250px';

                      return (
                        <th key={head} className={thClasses} style={style}>
                          {head.includes("|") ? ( 
                            <div>
                              <Typography variant="small" className={`${fontClasses} ${theme.text}`}>{head.split("|")[0]}</Typography>
                              <Typography variant="small" className={`${fontClasses} ${theme.text} opacity-80`}>{head.split("|")[1]}</Typography>
                            </div> 
                          ) : ( 
                            <Typography variant="small" className={`${fontClasses} ${theme.text}`}>{head}</Typography> 
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => {
                    const getCellClasses = (isLast = false, align = 'center') => {
                      let classes = `p-1 border-b ${theme.borderColor} text-${align}`;
                      if (!isLast) { classes += ` border-r ${theme.borderColor}`; }
                      return classes;
                    };
                    return (
                      <tr key={po.id} className={theme.hoverBg}>
                        <td className={getCellClasses()}><IconButton variant="text" size="sm" onClick={() => handleOpenViewModal(po)}><ArrowTopRightOnSquareIcon className={`h-5 w-5 ${theme.text}`} /></IconButton></td>
                        <td className={getCellClasses()}><Menu><MenuHandler><IconButton variant="text" size="sm"><Cog6ToothIcon className={`h-5 w-5 ${theme.text}`} /></IconButton></MenuHandler><MenuList><MenuItem onClick={() => handleOpenEditForm(po)}>Edit PO Details</MenuItem><hr className="my-2" /><MenuItem className="text-red-500 hover:bg-red-50 focus:bg-red-50 active:bg-red-50" onClick={() => handleOpenDeleteConfirm(po)}>Delete PO</MenuItem></MenuList></Menu></td>
                        <td className={getCellClasses()}><Typography variant="body" className={`font-bold ${theme.text}`}>{po.po_number}</Typography></td>
                        <td className={getCellClasses()}><Typography variant="body" className={`font-normal ${theme.text}`}>{po.product?.product_code || 'N/A'}</Typography></td>
                        <td className={getCellClasses(false, 'left')}><Typography variant="body" className={`font-normal ${theme.text}`}>{po.description}</Typography></td>
                        <td className={getCellClasses()}><Typography variant="body" className={`font-semibold ${theme.text}`}>{Number(po.ordered_qty_shippers || 0).toFixed(2)}</Typography></td>
                        <td className={getCellClasses()}><Typography variant="body" className={`font-normal ${theme.text}`}>{ (po.hourly_run_rate > 0 ? po.ordered_qty_shippers / po.hourly_run_rate : 0).toFixed(2)}</Typography></td>
                        <td className={getCellClasses(true)}>
                          <Menu>
                            <MenuHandler>
                              <div className="flex flex-wrap justify-center items-center gap-1 p-1 cursor-pointer">
                                {po.statuses?.map((s: { status: string }) => {
                                  let chipClass = theme.chip.blueGray;
                                  if (s.status === "PO Check") chipClass = theme.chip.red;
                                  else if (s.status === "Despatched/ Completed") chipClass = theme.chip.blue;
                                  else if (s.status === "Open") chipClass = theme.chip.green;
                                  
                                  return (
                                    <div key={s.status} className={`py-1.5 px-3 rounded-md text-sm font-medium leading-none ${chipClass}`}>
                                      {s.status}
                                    </div>
                                  );
                                })}
                                {(!po.statuses || po.statuses.length === 0) && (
                                   <div className={`py-1.5 px-3 rounded-md text-sm font-medium leading-none ${theme.chip.green}`}>Open</div>
                                )}
                              </div>
                            </MenuHandler>
                            <MenuList>
                              {ALL_PO_STATUSES.map((statusOption) => {
                                const isChecked = po.statuses?.some((s: { status: string }) => s.status === statusOption);
                                return ( <MenuItem key={statusOption} onClick={() => handleStatusUpdate(po.id, statusOption)}> <span className={`mr-2 ${isChecked ? "opacity-100" : "opacity-0"}`}>✓</span> {statusOption} </MenuItem> );
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
        ) : ( <div className="p-8 text-center"><Typography color="gray" className={theme.text}>{searchQuery || statusFilter ? `No purchase orders found matching the current filters.` : "No purchase orders found."}</Typography></div> )}

        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={pagination.total}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Card>
      
      <PoDetailModal open={poToView !== null} handleOpen={() => handleOpenViewModal(null)} po={poToView} />
      <CreatePoForm open={isCreateFormOpen} handleOpen={handleOpenCreateForm} onPoCreated={handlePoCreated} />
      <EditPoForm open={isEditFormOpen} handleOpen={() => handleOpenEditForm(null)} po={poToEdit} onUpdate={handlePoUpdate} />
      <ConfirmationDialog open={isDeleteConfirmOpen} handleOpen={() => handleOpenDeleteConfirm(null)} onConfirm={handleConfirmDelete} title="Delete Purchase Order?" message={`Are you sure you want to permanently delete PO ${poToDelete?.po_number}?`}/>
    </>
  );
}