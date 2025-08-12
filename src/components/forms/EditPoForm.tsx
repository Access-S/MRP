// BLOCK 1: Imports
import React, { useState, useEffect } from "react";
import {
  Button, Dialog, DialogHeader, DialogBody, DialogFooter,
  Input, Typography, Collapse, Spinner,
} from "@material-tailwind/react";
import { PurchaseOrder, Product } from "../../types/mrp.types";
import { updatePo } from "../../services/api.service";
import { FormAlert } from "../dialogs/FormAlert";

// BLOCK 2: Interface and Component Definition
interface EditPoFormProps {
  open: boolean;
  handleOpen: () => void;
  po: any | null;
  onUpdate: (updatedData: any) => void;
}

export function EditPoForm({
  open,
  handleOpen,
  po,
  onUpdate,
}: EditPoFormProps) {
  // BLOCK 3: State Management
  const [formData, setFormData] = useState({
    poNumber: "", customerName: "", poCreatedDate: "",
    poReceivedDate: "", orderedQtyPieces: "", customerAmount: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [calculatedShippers, setCalculatedShippers] = useState(0);
  const [systemAmount, setSystemAmount] = useState(0);
  const [amountDifference, setAmountDifference] = useState(0);
  const [isAmountMismatch, setIsAmountMismatch] = useState(false);

  // BLOCK 4: Effects
  useEffect(() => {
    if (po) {
      setFormData({
        poNumber: po.po_number || "",
        customerName: po.customer_name || "",
        poCreatedDate: new Date(po.po_created_date).toISOString().split("T")[0],
        poReceivedDate: new Date(po.po_received_date).toISOString().split("T")[0],
        orderedQtyPieces: po.ordered_qty_pieces || "",
        customerAmount: po.customer_amount || "",
      });
    }
  }, [po]);

  useEffect(() => {
    if (!po || !po.product) {
        setCalculatedShippers(0);
        setSystemAmount(0);
        return;
    };

    const unitsPerShipper = po.product.units_per_shipper || 0;
    const pricePerShipper = po.product.price_per_shipper || 0;
    const pieces = Number(formData.orderedQtyPieces) || 0;
    const shippers = unitsPerShipper > 0 ? pieces / unitsPerShipper : 0;
    const calculatedSystemAmount = shippers * pricePerShipper;

    setCalculatedShippers(shippers);
    setSystemAmount(calculatedSystemAmount);

    const custAmount = Number(formData.customerAmount) || 0;
    const diff = Math.abs(custAmount - calculatedSystemAmount);
    setAmountDifference(diff);
    setIsAmountMismatch(diff > 5);
  }, [formData.orderedQtyPieces, formData.customerAmount, po]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // BLOCK 5: Handlers
  const handleSaveChanges = async () => {
    if (!po) return;
    setErrorMessage("");
    setIsSaving(true);
    
    const updatedData = {
      ...formData,
      orderedQtyPieces: Number(formData.orderedQtyPieces),
      customerAmount: Number(formData.customerAmount),
    };

    try {
      const updatedPo = await updatePo(po.id, updatedData);
      onUpdate(updatedPo);
      handleOpen();
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // BLOCK 6: Render Logic
  return (
    <Dialog open={open} handler={handleOpen} size="md">
      <DialogHeader>Edit PO: {po?.po_number}</DialogHeader>
      <DialogBody divider className="flex flex-col gap-4">
        {po ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="poNumber" label="PO Number" value={formData.poNumber} onChange={handleInputChange} />
              <Input name="customerName" label="Customer Name" value={formData.customerName} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="poCreatedDate" type="date" label="PO Created Date" value={formData.poCreatedDate} onChange={handleInputChange} />
              <Input name="poReceivedDate" type="date" label="PO Received Date" value={formData.poReceivedDate} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="orderedQtyPieces" type="number" label="Ordered Quantity (Pieces)" value={formData.orderedQtyPieces} onChange={handleInputChange} />
              <Input name="customerAmount" type="number" label="Amount" value={formData.customerAmount} onChange={handleInputChange} />
            </div>
            <Collapse open={!!po.product}>
              <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-2">
                <Typography variant="h6">System Calculation</Typography>
                <div className="flex justify-between"><span>Shipper Quantity:</span><span className="font-semibold">{calculatedShippers.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Expected Amount:</span><span className="font-semibold">${systemAmount.toFixed(2)}</span></div>
                {Number(formData.customerAmount) > 0 && (
                  <div className={`flex justify-between p-2 rounded ${isAmountMismatch ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    <span>Amount Difference:</span><span className="font-bold">${amountDifference.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Collapse>
            {errorMessage && <FormAlert type="error" message={errorMessage} onDismiss={() => setErrorMessage("")} />}
          </>
        ) : (
          <div className="flex justify-center items-center h-48"><Spinner className="h-12 w-12"/></div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="text" color="red" onClick={handleOpen} disabled={isSaving}>Cancel</Button>
        <Button variant="gradient" color="green" onClick={handleSaveChanges} loading={isSaving}>Save Changes</Button>
      </DialogFooter>
    </Dialog>
  );
}