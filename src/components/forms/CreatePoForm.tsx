// BLOCK 1: Imports
import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Button, Dialog, DialogHeader, DialogBody, DialogFooter,
  Input, Typography,
} from "@material-tailwind/react";
import { createPo } from "../../services/api.service";

// BLOCK 2: Interface and Component Definition
interface CreatePoFormProps {
  open: boolean;
  handleOpen: () => void;
  onPoCreated: () => void;
}

export function CreatePoForm({
  open,
  handleOpen,
  onPoCreated,
}: CreatePoFormProps) {
  // BLOCK 3: State Management
  const [poNumber, setPoNumber] = useState("");
  const [productCode, setProductCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [poCreatedDate, setPoCreatedDate] = useState("");
  const [poReceivedDate, setPoReceivedDate] = useState("");
  const [orderedQtyPieces, setOrderedQtyPieces] = useState<number | string>("");
  const [customerAmount, setCustomerAmount] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BLOCK 4: Handlers
  const resetForm = () => {
    setPoNumber("");
    setProductCode("");
    setCustomerName("");
    setPoCreatedDate("");
    setPoReceivedDate("");
    setOrderedQtyPieces("");
    setCustomerAmount("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    handleOpen();
  };

  const handleSubmit = async () => {
    if (!poNumber || !productCode || !customerName || !poCreatedDate || !poReceivedDate || !orderedQtyPieces || !customerAmount) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting PO...");

    const poData = {
      poNumber: poNumber.trim(),
      productCode: productCode.trim(),
      customerName: customerName.trim(),
      poCreatedDate,
      poReceivedDate,
      orderedQtyPieces: Number(orderedQtyPieces),
      customerAmount: Number(customerAmount),
    };

    try {
      const newPo = await createPo(poData);
      toast.dismiss(loadingToast);
      toast.success(`PO ${newPo.po_number} created successfully!`);
      
      onPoCreated();
      handleClose();

    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to create PO. Please try again.");
      setIsSubmitting(false);
    }
  };

  // BLOCK 5: Render Logic
  return (
    <Dialog open={open} handler={handleClose} size="md">
      <DialogHeader>Create New Purchase Order</DialogHeader>
      <DialogBody divider className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="PO Number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required />
          <Input label="Finish Code / Product Code" value={productCode} onChange={(e) => setProductCode(e.target.value)} required />
        </div>
        <Input label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input type="date" label="PO Created Date" value={poCreatedDate} onChange={(e) => setPoCreatedDate(e.target.value)} required />
          <Input type="date" label="PO Received Date" value={poReceivedDate} onChange={(e) => setPoReceivedDate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input type="number" label="Ordered Quantity (Pieces)" value={orderedQtyPieces} onChange={(e) => setOrderedQtyPieces(e.target.value)} required />
          <Input type="number" label="Amount" value={customerAmount} onChange={(e) => setCustomerAmount(e.target.value)} required />
        </div>
        <Typography variant="small" color="gray" className="mt-2">
          System calculations and status will be determined upon submission.
        </Typography>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" color="red" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="gradient" color="green" onClick={handleSubmit} loading={isSubmitting}>
          Submit PO
        </Button>
      </DialogFooter>
    </Dialog>
  );
}