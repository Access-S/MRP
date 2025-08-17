// src/components/modals/BomDetailModal.tsx

// BLOCK 1: Imports
import React, { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogBody, Typography, Spinner, Card } from "@material-tailwind/react";
import { BomComponent, Product } from "../../types/mrp.types";
import { fetchEnrichedBomForProduct } from "../../services/api.service";
import { useTheme } from "../../contexts/ThemeContext";
import toast from "react-hot-toast";

// BLOCK 2: DetailRow Sub-component
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex justify-between items-center py-2 border-b ${theme.borderColor}`}>
      <Typography variant="small" className={`font-semibold ${theme.text} opacity-80`}>{label}:</Typography>
      <Typography variant="small" className={`font-medium ${theme.text}`}>{value}</Typography>
    </div>
  );
};

// BLOCK 3: Interface Definition
interface BomDetailModalProps {
  open: boolean;
  handleOpen: () => void;
  product: Product | null;
}

// BLOCK 4: Main BomDetailModal Component
export function BomDetailModal({ open, handleOpen, product }: BomDetailModalProps) {
  const { theme } = useTheme();
  const [bomData, setBomData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // BLOCK 5: Data Fetching Effect
  useEffect(() => {
    const getEnrichedBomData = async () => {
      if (!product?.id) return;
      setIsLoading(true);
      try {
        const response = await fetchEnrichedBomForProduct(product.id);
        setBomData(response.data);
      } catch (error) {
        toast.error("Failed to fetch enriched BOM data.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && product) {
      getEnrichedBomData();
    }
    if (!open) {
      setBomData(null);
    }
  }, [open, product]);

  // BLOCK 6: Render Logic
return (
  <Dialog open={open} handler={handleOpen} size="xl">
    <DialogHeader>
      BOM for: {product?.product_code} - {product?.description}
    </DialogHeader>
    <DialogBody divider className="p-6">
      {isLoading || !bomData ? (
        <div className="flex justify-center items-center h-48"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={`lg:col-span-1 p-4 ${theme.cards} border-2 ${theme.borderColor} rounded-lg`}>
            <Typography variant="h6" className={`mb-2 pb-2 border-b-2 ${theme.borderColor}`}>Product Details</Typography>
            <div className="space-y-1">
              <DetailRow label="Units per Shipper" value={bomData.productDetails.units_per_shipper || 'N/A'} />
              <DetailRow label="Mins per Shipper" value={Number(bomData.productDetails.mins_per_shipper || 0).toFixed(3)} />
              <DetailRow label="Hourly Run Rate" value={Number(bomData.productDetails.hourly_run_rate || 0).toFixed(2)} />
              <DetailRow label="Daily Run Rate" value={Number(bomData.productDetails.daily_run_rate || 0).toLocaleString()} />
              <DetailRow label="Price per Shipper" value={`$${Number(bomData.productDetails.price_per_shipper || 0).toFixed(2)}`} />
            </div>

            <Typography variant="h6" className={`mt-4 mb-2 pb-2 border-b-2 ${theme.borderColor}`}>PO Statistics</Typography>
            <div className="space-y-1">
              <DetailRow label="Open POs for SKU" value={bomData.poStats.openPoCount} />
              <DetailRow label="Dispatched POs" value={bomData.poStats.dispatchedPoCount} />
            </div>
          </Card>

          <Card className={`lg:col-span-2 p-4 ${theme.cards} border-2 ${theme.borderColor} rounded-lg`}>
            <Typography variant="h6" className={`mb-2 pb-2 border-b-2 ${theme.borderColor}`}>Bill of Materials Components</Typography>
            {bomData.bomComponents.length > 0 ? (
              <div className={`border-2 ${theme.borderColor} rounded-lg overflow-x-auto`}>
                <table className="w-full min-w-max table-auto text-left">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '50%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead className={`border-b-2 ${theme.borderColor}`}>
                    <tr>
                      <th className={`p-2 border-r ${theme.borderColor} ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Part Code</Typography></th>
                      <th className={`p-2 border-r ${theme.borderColor} ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Description</Typography></th>
                      <th className={`p-2 border-r ${theme.borderColor} ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Part Type</Typography></th>
                      <th className={`p-2 text-center ${theme.tableHeaderBg}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>Qty / Shipper</Typography></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomData.bomComponents.map((comp: BomComponent, index: number) => {
                      const isLastRow = index === bomData.bomComponents.length - 1;
                      return (
                        <tr key={comp.part_code} className={theme.hoverBg}>
                          <td className={`p-2 border-r ${isLastRow ? '' : `border-b`} ${theme.borderColor}`}><Typography variant="small" className={`font-mono ${theme.text}`}>{comp.part_code}</Typography></td>
                          <td className={`p-2 border-r ${isLastRow ? '' : `border-b`} ${theme.borderColor}`}><Typography variant="small" className={theme.text}>{comp.part_description}</Typography></td>
                          <td className={`p-2 border-r ${isLastRow ? '' : `border-b`} ${theme.borderColor}`}><Typography variant="small" className={`${theme.text} opacity-80`}>{comp.part_type}</Typography></td>
                          <td className={`p-2 text-center ${isLastRow ? '' : `border-b`} ${theme.borderColor}`}><Typography variant="small" className={`font-semibold ${theme.text}`}>{comp.per_shipper}</Typography></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Typography className={theme.text}>No components found for this product.</Typography>
            )}
          </Card>
        </div>
      )}
    </DialogBody>
  </Dialog>
);
}