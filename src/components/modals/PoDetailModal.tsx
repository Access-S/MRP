// BLOCK 1: Imports
import React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  IconButton,
  Typography,
  Chip,
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { PurchaseOrder, PoStatus } from '../../types/mrp.types';
import { useTheme } from '../../contexts/ThemeContext';

// BLOCK 2: Props Interface
interface PoDetailModalProps {
  open: boolean;
  handleOpen: () => void;
  po: PurchaseOrder | null;
}

// BLOCK 3: Helper Functions
const formatDate = (date: Date | undefined) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

// BLOCK 4: DetailItem Sub-Component
const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col">
      <Typography variant="small" className={`${theme.text} opacity-70`}>
        {label}
      </Typography>
      <Typography variant="h6" className={`${theme.text} font-semibold`}>
        {value}
      </Typography>
    </div>
  );
};

// BLOCK 5: Main PoDetailModal Component
export function PoDetailModal({ open, handleOpen, po }: PoDetailModalProps) {
  const { theme } = useTheme();

  if (!po) return null; // Don't render if no PO is selected

  // BLOCK 5.1: Calculations
  const productionTimeHours =
    po.hourlyRunRate && po.hourlyRunRate > 0
      ? po.orderedQtyShippers / po.hourlyRunRate
      : 0;
      
  const unitsPerShipper = po.components?.find(c => c.partType === 'Bulk - Supplied')?.perShipper || 'N/A';

  // BLOCK 5.2: Render Logic
  return (
    <Dialog open={open} handler={handleOpen} size="xl" className={`flex flex-col h-[90vh] ${theme.cards}`}>
      <DialogHeader className="flex justify-between items-center">
        <Typography variant="h4" className={theme.text}>
          Purchase Order Details
        </Typography>
        <IconButton variant="text" color="blue-gray" onClick={handleOpen}>
          <XMarkIcon className="h-6 w-6" />
        </IconButton>
      </DialogHeader>
      
      <DialogBody divider className="flex-grow overflow-y-auto p-6 space-y-8">
        {/* Main Details Section */}
        <div className="p-4 border rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <DetailItem label="PO Number" value={po.poNumber} />
          <DetailItem label="Product Code" value={po.productCode} />
          <DetailItem label="Customer" value={po.customerName} />
          <DetailItem
            label="Current Status"
            value={
              <div className="flex flex-wrap gap-1">
                {po.status.map((s: PoStatus) => (
                  <Chip
                    key={s}
                    variant="ghost"
                    size="sm"
                    value={s}
                    color={
                      s === 'PO Check' ? 'red' :
                      s === 'Open' ? 'green' :
                      s === 'Despatched/ Completed' ? 'blue' : 'blue-gray'
                    }
                  />
                ))}
              </div>
            }
          />
        </div>

        {/* Quantity & Time Section */}
        <div className="p-4 border rounded-lg grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="Qty (Shippers)" value={po.orderedQtyShippers.toLocaleString()} />
          <DetailItem label="Qty (Pieces)" value={po.orderedQtyPieces.toLocaleString()} />
          <DetailItem label="Units per Shipper" value={unitsPerShipper} />
          <DetailItem label="Est. Prod. Time" value={`${productionTimeHours.toFixed(2)} hrs`} />
        </div>
        
        {/* Dates Section */}
        <div className="p-4 border rounded-lg grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="PO Created" value={formatDate(po.poCreatedDate)} />
          <DetailItem label="PO Received" value={formatDate(po.poReceivedDate)} />
          <DetailItem label="Delivery Date" value={formatDate(po.deliveryDate)} />
          <DetailItem label="Delivery Docket #" value={po.deliveryDocketNumber || 'N/A'} />
        </div>

        {/* Description Section (Full Width) */}
        <div className="p-4 border rounded-lg">
           <DetailItem label="Product Description" value={po.description} />
        </div>
        
      </DialogBody>
    </Dialog>
  );
}