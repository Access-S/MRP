// src/components/forms/DespatchPoForm.tsx

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
  Card,
} from "@material-tailwind/react";
import { CalendarDaysIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface DespatchPoFormProps {
  open: boolean;
  handleOpen: () => void;
  onSubmit: (deliveryDate: string, docketNumber: string) => void;
  po?: any; // Optional PO data to show context
}

export function DespatchPoForm({
  open,
  handleOpen,
  onSubmit,
  po,
}: DespatchPoFormProps) {
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [docketNumber, setDocketNumber] = useState("");

  // Clear form data when dialog opens
  useEffect(() => {
    if (open) {
      setDeliveryDate(null);
      setDocketNumber("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!deliveryDate || !docketNumber.trim()) {
      toast.error("Please fill out both delivery date and docket number.");
      return;
    }
    
    // Format date as ISO string for backend
    const formattedDate = deliveryDate.toISOString().split('T')[0];
    onSubmit(formattedDate, docketNumber.trim());
    
    // Clear form after successful submission
    setDeliveryDate(null);
    setDocketNumber("");
    handleOpen();
  };

  const handleCancel = () => {
    // Clear form when cancelled
    setDeliveryDate(null);
    setDocketNumber("");
    handleOpen();
  };

  return (
    <Dialog open={open} handler={handleOpen} size="md" className="bg-transparent shadow-none">
      <Card className="mx-auto w-full max-w-[24rem] bg-white">
        <DialogHeader className="flex flex-col items-start space-y-0 pb-4">
          <Typography variant="h4" color="blue-gray" className="font-bold">
            Complete Dispatch
          </Typography>
          <Typography color="gray" className="mt-1 font-normal text-sm">
            Finalize the delivery details for this purchase order
          </Typography>
        </DialogHeader>

        <DialogBody className="space-y-6 pt-0">
          {/* PO Context Card */}
{po && (
  <Card className="bg-blue-50 border border-blue-200 p-4">
    <Typography variant="small" className="font-semibold text-blue-gray-800 mb-3">
      Purchase Order Details
    </Typography>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Typography variant="small" className="text-blue-gray-600 font-medium">
          PO Number:
        </Typography>
        <Typography variant="small" className="font-semibold text-blue-gray-800">
          {po.po_number}
        </Typography>
      </div>
      
      <div className="flex justify-between items-center">
        <Typography variant="small" className="text-blue-gray-600 font-medium">
          Customer:
        </Typography>
        <Typography variant="small" className="font-semibold text-blue-gray-800">
          {po.customer_name}
        </Typography>
      </div>
      
      <div className="flex justify-between items-center">
        <Typography variant="small" className="text-blue-gray-600 font-medium">
          Quantity:
        </Typography>
        <Typography variant="small" className="font-semibold text-blue-gray-800">
          {po.ordered_qty_shippers} shippers ({po.ordered_qty_pieces} pieces)
        </Typography>
      </div>
      
      <div className="pt-2 border-t border-blue-200">
        <Typography variant="small" className="text-blue-gray-600 font-medium mb-1">
          Description:
        </Typography>
        <Typography variant="small" className="text-blue-gray-800">
          {po.description}
        </Typography>
      </div>
    </div>
  </Card>
)}

          {/* Delivery Date Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-gray-700">
              <CalendarDaysIcon className="h-4 w-4" />
              Delivery Date
            </label>
            <div className="relative">
              <DatePicker
                selected={deliveryDate}
                onChange={(date: Date | null) => setDeliveryDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select delivery date"
                className="w-full px-4 py-3 border border-blue-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                calendarClassName="shadow-lg border-0"
                dayClassName={(date) => 
                  "hover:bg-blue-500 hover:text-white rounded-lg transition-colors duration-150"
                }
                required
                minDate={new Date()}
                showPopperArrow={false}
              />
            </div>
          </div>

          {/* Docket Number Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-gray-700">
              <DocumentTextIcon className="h-4 w-4" />
              Delivery Docket Number
            </label>
            <input
              type="text"
              value={docketNumber}
              onChange={(e) => setDocketNumber(e.target.value)}
              placeholder="Enter docket number"
              className="w-full px-4 py-3 border border-blue-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
              required
            />
          </div>

          {/* Warning Message */}
          <Card className="bg-amber-50 border border-amber-200 p-3">
            <Typography variant="small" className="text-amber-800 font-medium">
              ⚠️ Important
            </Typography>
            <Typography variant="small" className="text-amber-700 mt-1">
              This action will clear all existing statuses and mark the PO as "Despatched/Completed". This cannot be undone.
            </Typography>
          </Card>
        </DialogBody>

        <DialogFooter className="space-x-2 pt-4">
          <Button
            variant="text"
            color="gray"
            onClick={handleCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button 
            variant="gradient" 
            color="green" 
            onClick={handleSubmit}
            className="px-6 flex items-center gap-2"
            disabled={!deliveryDate || !docketNumber.trim()}
          >
            <DocumentTextIcon className="h-4 w-4" />
            Complete Dispatch
          </Button>
        </DialogFooter>
      </Card>
    </Dialog>
  );
}