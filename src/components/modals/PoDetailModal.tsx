// BLOCK 1: Imports
import React, { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogBody, Typography, Spinner, Card } from "@material-tailwind/react";
import { PurchaseOrder, BomComponent } from "../../types/mrp.types";
import { fetchBomForProduct } from "../../services/api.service";
import { useTheme } from "../../contexts/ThemeContext";

// BLOCK 2: Helper function
const formatDate = (date: Date | undefined) => {
  if (!date) return "N/A";
  // --- THIS IS THE FIX: Removed the rogue apostrophe from toLocaleDateString ---
  return new Date(date).toLocaleDateString("en-AU", { year: 'numeric', month: 'short', day: 'numeric' });
};

// BLOCK 3: DetailRow Sub-component
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex justify-between items-center py-2 border-b ${theme.borderColor}`}>
      <Typography variant="small" className={`font-semibold ${theme.text} opacity-80`}>{label}:</Typography>
      <Typography variant="small" className={`font-medium ${theme.text}`}>{value}</Typography>
    </div>
  );
};

// BLOCK 4: Interface and Component Definition
interface PoDetailModalProps {
  open: boolean;
  handleOpen: () => void;
  po: any | null;
}

export function PoDetailModal({ open, handleOpen, po }: PoDetailModalProps) {
  const { theme } = useTheme();
  const [components, setComponents] = useState<any[]>([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);

  useEffect(() => {
    if (open && po?.product?.id && components.length === 0) {
      setIsLoadingBom(true);
      fetchBomForProduct(po.product.id)
        .then(data => setComponents(data))
        .catch(console.error)
        .finally(() => setIsLoadingBom(false));
    } else if (!open) {
      setComponents([]);
    }
  }, [open, po, components.length]);

  return (
    <Dialog open={open} handler={handleOpen} size="xl">
      <DialogHeader className="justify-between">
        <Typography variant="h5" color="blue-gray">
          Details for PO: {po?.po_number}
        </Typography>
        <div className="flex items-center gap-2">
            {po?.statuses?.map((s: {status: string}) => (
                <Typography key={s.status} variant="small" className="py-1 px-2 rounded-lg bg-blue-500 text-white font-semibold">
                    {s.status}
                </Typography>
            ))}
        </div>
      </DialogHeader>
      <DialogBody divider className="p-6">
        {po ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={`lg:col-span-1 p-4 ${theme.cards} border-2 ${theme.borderColor} rounded-lg`}>
              <Typography variant="h6" className={`mb-2 pb-2 border-b-2 ${theme.borderColor}`}>Order Information</Typography>
              <div className="space-y-1">
                <DetailRow label="Customer" value={po.customer_name} />
                <DetailRow label="Created Date" value={formatDate(po.po_created_date)} />
                <DetailRow label="Received Date" value={formatDate(po.po_received_date)} />
                <DetailRow label="Qty (Pieces)" value={po.ordered_qty_pieces.toLocaleString()} />
                <DetailRow label="Qty (Shippers)" value={Number(po.ordered_qty_shippers).toFixed(2)} />
                <DetailRow label="Customer Amount" value={`$${Number(po.customer_amount).toFixed(2)}`} />
                <DetailRow label="System Amount" value={`$${Number(po.system_amount).toFixed(2)}`} />
                <DetailRow label="Hourly Run Rate" value={Number(po.hourly_run_rate).toFixed(2)} />
                <DetailRow label="Mins per Shipper" value={Number(po.mins_per_shipper).toFixed(3)} />
                
                {po.delivery_date && (
                  <>
                    <DetailRow label="Despatch Date" value={formatDate(po.delivery_date)} />
                    <DetailRow label="Docket Number" value={po.delivery_docket_number || 'N/A'} />
                  </>
                )}
              </div>
            </Card>

            <Card className={`lg:col-span-2 p-4 ${theme.cards} border-2 ${theme.borderColor} rounded-lg`}>
              <Typography variant="h6" className={`mb-2 pb-2 border-b-2 ${theme.borderColor}`}>Product & Bill of Materials</Typography>
              <div className={`p-2 my-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 ${theme.borderColor}`}>
                <DetailRow label="Product Code" value={po.product?.product_code} />
                <DetailRow label="Description" value={po.description} />
              </div>

              {isLoadingBom ? (
                <div className="flex justify-center items-center h-32"><Spinner /></div>
              ) : (
                <div className={`border-2 ${theme.borderColor} rounded-lg`}>
                  <table className="w-full min-w-max table-auto text-left">
                    <thead className={`border-b-2 ${theme.borderColor}`}>
                      <tr>
                        <th className={`p-2 border-r ${theme.borderColor} ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Part Code</Typography></th>
                        <th className={`p-2 border-r ${theme.borderColor} ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Description</Typography></th>
                        <th className={`p-2 text-center ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Qty/Shipper</Typography></th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((comp, index) => {
                        const isLastRow = index === components.length - 1;
                        return (
                          <tr key={comp.id} className={theme.hoverBg}>
                            <td className={`p-2 border-r ${isLastRow ? '' : 'border-b'} ${theme.borderColor}`}><Typography variant="small" className={`font-mono ${theme.text}`}>{comp.part_code}</Typography></td>
                            <td className={`p-2 border-r ${isLastRow ? '' : 'border-b'} ${theme.borderColor}`}><Typography variant="small" className={theme.text}>{comp.part_description}</Typography></td>
                            <td className={`p-2 text-center ${isLastRow ? '' : 'border-b'} ${theme.borderColor}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>{comp.per_shipper}</Typography></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex justify-center items-center h-48"><Spinner /></div>
        )}
      </DialogBody>
    </Dialog>
  );
}