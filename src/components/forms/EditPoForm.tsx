// BLOCK 1: Imports
import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Typography,
  Collapse, // 👈 THIS WAS THE MISSING IMPORT
} from "@material-tailwind/react";
import { PurchaseOrder, Product, PoStatus } from "../../types/mrp.types";
import { updatePurchaseOrder } from "../../services/purchaseOrder.service";
import toast from "react-hot-toast";

// BLOCK 2: Interface and Component Definition
interface EditPoFormProps {
  open: boolean;
  handleOpen: () => void;
  po: PurchaseOrder | null;
  product: Product | null;
  onUpdate: (updatedData: Partial<PurchaseOrder>) => void;
}

export function EditPoForm({
  open,
  handleOpen,
  po,
  product,
  onUpdate,
}: EditPoFormProps) {
  // BLOCK 3: State Management
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [poCreatedDate, setPoCreatedDate] = useState("");
  const [poReceivedDate, setPoReceivedDate] = useState("");
  const [orderedQtyPieces, setOrderedQtyPieces] = useState<number | string>("");
  const [customerAmount, setCustomerAmount] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Calculation State
  const [calculatedShippers, setCalculatedShippers] = useState(0);
  const [systemAmount, setSystemAmount] = useState(0);
  const [amountDifference, setAmountDifference] = useState(0);
  const [isAmountMismatch, setIsAmountMismatch] = useState(false);

  // BLOCK 4: Effects
  useEffect(() => {
    if (po) {
      setPoNumber(po.poNumber);
      setCustomerName(po.customerName);
      setPoCreatedDate(po.poCreatedDate.toISOString().split("T")[0]);
      setPoReceivedDate(po.poReceivedDate.toISOString().split("T")[0]);
      setOrderedQtyPieces(po.orderedQtyPieces);
      setCustomerAmount(po.customerAmount);
    }
  }, [po]);

  // Real-time calculation effect
  useEffect(() => {
    if (!product) return;

    // --- LOGIC CHANGE POINT 3 ---
    // Use the new `unitsPerShipper` field directly from the product
    const unitsPerShipper = product.unitsPerShipper || 0;
    const pricePerShipper = product.pricePerShipper || 0;
    const pieces = Number(orderedQtyPieces) || 0;
    const shippers = unitsPerShipper > 0 ? pieces / unitsPerShipper : 0;
    const calculatedSystemAmount = shippers * pricePerShipper;

    setCalculatedShippers(shippers);
    setSystemAmount(calculatedSystemAmount);

    const custAmount = Number(customerAmount) || 0;
    const diff = Math.abs(custAmount - calculatedSystemAmount);
    setAmountDifference(diff);
    setIsAmountMismatch(diff > 5);
  }, [orderedQtyPieces, customerAmount, product]);

  // BLOCK 5: Handlers
  const handleSaveChanges = async () => {
    if (!po || !product) {
      alert("Error: Missing PO or Product data.");
      return;
    }
    const loadingToast = toast.loading("Saving changes...");
    setIsLoading(true);
    try {
      const newData = {
        orderedQtyPieces: Number(orderedQtyPieces),
        customerAmount: Number(customerAmount),
      };

      await updatePurchaseOrder(po.id, newData, product);

      // --- THIS IS THE FIX ---
      // Re-calculate the new status based on the same logic as the service
      const perShipper =
        product.components.find((c) => c.partType === "Bulk - Supplied")
          ?.perShipper || 0;
      const pricePerShipper = product.pricePerShipper || 0;
      const newShippers =
        perShipper > 0 ? newData.orderedQtyPieces / perShipper : 0;
      const newSystemAmount = newShippers * pricePerShipper;
      const amountDifference = Math.abs(
        newData.customerAmount - newSystemAmount
      );
      const newStatus: PoStatus[] =
        amountDifference > 5 ? ["PO Check"] : ["Open"];

      // Create a complete object for the optimistic UI update
      const updatedPoForState = {
        ...po,
        ...newData,
        status: newStatus,
        orderedQtyShippers: newShippers,
        systemAmount: newSystemAmount,
      };

      onUpdate(updatedPoForState);

      toast.dismiss(loadingToast);
      toast.success("PO updated successfully!");
      handleOpen();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Error saving changes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // BLOCK 6: Render Logic
  if (!po) return null;

  return (
    <Dialog 
      open={open} 
      handler={handleOpen} 
      size="md"
      placeholder=""
      onResize={() => {}}
      onResizeCapture={() => {}}
      onPointerEnterCapture={() => {}}
      onPointerLeaveCapture={() => {}}
    >
      <DialogHeader
        placeholder=""
        onResize={() => {}}
        onResizeCapture={() => {}}
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
      >
        Edit PO: {po.poNumber}
      </DialogHeader>
      <DialogBody 
        divider 
        className="flex flex-col gap-4"
        placeholder=""
        onResize={() => {}}
        onResizeCapture={() => {}}
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="PO Number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
          <Input
            label="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="PO Created Date"
            value={poCreatedDate}
            onChange={(e) => setPoCreatedDate(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
          <Input
            type="date"
            label="PO Received Date"
            value={poReceivedDate}
            onChange={(e) => setPoReceivedDate(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Ordered Quantity (Pieces)"
            value={orderedQtyPieces}
            onChange={(e) => setOrderedQtyPieces(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
          <Input
            type="number"
            label="Amount"
            value={customerAmount}
            onChange={(e) => setCustomerAmount(e.target.value)}
            required
            onResize={() => {}}
            onResizeCapture={() => {}}
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            crossOrigin=""
          />
        </div>

        {/* --- ANIMATION CHANGE POINT 2 --- */}
        <Collapse open={true}>
          <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-2">
            <Typography 
              variant="h6"
              placeholder=""
              onResize={() => {}}
              onResizeCapture={() => {}}
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
            >
              System Calculation
            </Typography>
            <div className="flex justify-between">
              <span>Shipper Quantity:</span>
              <span className="font-semibold">
                {calculatedShippers.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Expected Amount:</span>
              <span className="font-semibold">${systemAmount.toFixed(2)}</span>
            </div>
            {Number(customerAmount) > 0 && (
              <div
                className={`flex justify-between p-2 rounded ${
                  isAmountMismatch
                    ? "bg-red-50 text-red-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                <span>Amount Difference:</span>
                <span className="font-bold">
                  ${amountDifference.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Collapse>
      </DialogBody>
      <DialogFooter
        placeholder=""
        onResize={() => {}}
        onResizeCapture={() => {}}
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
      >
        <Button
          variant="text"
          color="red"
          onClick={handleOpen}
          className="mr-1"
          placeholder=""
          onResize={() => {}}
          onResizeCapture={() => {}}
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          Cancel
        </Button>
        <Button
          variant="gradient"
          color="green"
          onClick={handleSaveChanges}
          loading={isLoading}
          placeholder=""
          onResize={() => {}}
          onResizeCapture={() => {}}
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          Save Changes
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
