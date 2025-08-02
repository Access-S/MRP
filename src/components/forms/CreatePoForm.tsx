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
  Collapse,
} from "@material-tailwind/react";
import { Product, PoStatus } from "../../types/mrp.types";
import { getAllProducts } from "../../services/product.service";
import {
  checkPoNumberExists,
  createNewPurchaseOrder,
} from "../../services/purchaseOrder.service";

// BLOCK 2: Interface and Component Definition
import toast from "react-hot-toast"; // 👈 Import toast
import { PurchaseOrder } from "../../types/mrp.types"; // 👈 Import PurchaseOrder

interface CreatePoFormProps {
  open: boolean;
  handleOpen: () => void;
  onPoCreated: (newPo: PurchaseOrder) => void; // 👈 Add the new prop
}

export function CreatePoForm({
  open,
  handleOpen,
  onPoCreated,
}: CreatePoFormProps) {
  // BLOCK 3: State Management
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Form State
  const [poNumber, setPoNumber] = useState("");
  const [productCode, setProductCode] = useState("");
  const [customerName, setCustomerName] = useState(""); // Add customerName state
  const [poCreatedDate, setPoCreatedDate] = useState("");
  const [poReceivedDate, setPoReceivedDate] = useState("");
  const [orderedQtyPieces, setOrderedQtyPieces] = useState<number | string>("");
  const [customerAmount, setCustomerAmount] = useState<number | string>("");

  // Validation & Calculation State
  const [poNumberStatus, setPoNumberStatus] = useState<
    "checking" | "valid" | "invalid" | "idle"
  >("idle");
  const [productCodeStatus, setProductCodeStatus] = useState<
    "valid" | "invalid" | "idle"
  >("idle");
  const [calculatedShippers, setCalculatedShippers] = useState(0);
  const [systemAmount, setSystemAmount] = useState(0);
  const [amountDifference, setAmountDifference] = useState(0);
  const [isAmountMismatch, setIsAmountMismatch] = useState(false);

  // BLOCK 4: Effects
  useEffect(() => {
    getAllProducts().then((fetchedProducts) => {
      setAllProducts(fetchedProducts);
    });
  }, []);

  useEffect(() => {
    if (poNumber.trim() === "") {
      setPoNumberStatus("idle");
      return;
    }
    setPoNumberStatus("checking");
    const timer = setTimeout(() => {
      checkPoNumberExists(poNumber).then((exists) => {
        setPoNumberStatus(exists ? "invalid" : "valid");
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [poNumber]);

  useEffect(() => {
    const product = allProducts.find(
      (p) => p.productCode === productCode.trim()
    );
    if (!product) {
      setProductCodeStatus(productCode.trim() ? "invalid" : "idle");
      setCalculatedShippers(0);
      setSystemAmount(0);
      return;
    }

    setProductCodeStatus("valid");

    // --- THIS IS THE CORRECTED LOGIC ---
    const unitsPerShipper = product.unitsPerShipper || 0; // Safely access the typed property
    const pricePerShipper = product.pricePerShipper || 0;
    const pieces = Number(orderedQtyPieces) || 0;

    const shippers = unitsPerShipper > 0 ? pieces / unitsPerShipper : 0;
    const calculatedSystemAmount = shippers * pricePerShipper;
    // --- END OF CORRECTION ---

    setCalculatedShippers(shippers);
    setSystemAmount(calculatedSystemAmount);

    const custAmount = Number(customerAmount) || 0;
    const diff = Math.abs(custAmount - calculatedSystemAmount);
    setAmountDifference(diff);
    setIsAmountMismatch(diff > 5);
  }, [productCode, orderedQtyPieces, customerAmount, allProducts]);

  // BLOCK 5: Handlers
  const resetForm = () => {
    setPoNumber("");
    setProductCode("");
    setCustomerName("");
    setPoCreatedDate("");
    setPoReceivedDate("");
    setOrderedQtyPieces("");
    setCustomerAmount("");
    setPoNumberStatus("idle");
    setProductCodeStatus("idle");
  };

  const handleSubmit = async () => {
    if (
      poNumber.trim() === "" ||
      productCode.trim() === "" ||
      customerName.trim() === "" ||
      poCreatedDate.trim() === "" ||
      poReceivedDate.trim() === "" ||
      String(orderedQtyPieces).trim() === "" ||
      String(customerAmount).trim() === ""
    ) {
      alert("Please ensure all required fields are filled out.");
      return;
    }

    const finalStatus: PoStatus =
      poNumberStatus === "valid" &&
      productCodeStatus === "valid" &&
      !isAmountMismatch
        ? "Open"
        : "PO Check";

    const poData = {
      poNumber: poNumber.trim(),
      productCode: productCode.trim(),
      customerName: customerName.trim(),
      poCreatedDate,
      poReceivedDate,
      orderedQtyPieces: Number(orderedQtyPieces),
      customerAmount: Number(customerAmount),
      orderedQtyShippers: calculatedShippers,
      systemAmount,
      status: [finalStatus],
    };

    const loadingToast = toast.loading("Submitting PO...");

    try {
      const newPoId = await createNewPurchaseOrder(poData as any);

      // Create the full new PO object to send back to the parent page
      const newPoForState: PurchaseOrder = {
        id: newPoId,
        ...poData,
        // We need to convert string dates to Date objects for our local state
        poCreatedDate: new Date(poData.poCreatedDate),
        poReceivedDate: new Date(poData.poReceivedDate),
        requestedDeliveryDate: new Date(poData.poReceivedDate), // Use received date as default
        status: [finalStatus],
      };

      onPoCreated(newPoForState); // 👈 Call the new prop to update the parent's state

      toast.dismiss(loadingToast); // Dismiss loading toast
      toast.success(`PO ${poData.poNumber} created successfully!`); // Show success toast
      resetForm();
      handleOpen();
    } catch (err) {
      console.error("Error creating PO:", err);
      toast.error("Failed to create PO. Please try again.");
    }
  };

  // BLOCK 6: Render Logic
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
        Create New Purchase Order
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
          <div>
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
            {poNumberStatus === "checking" && (
              <Typography 
                variant="small" 
                color="blue" 
                className="mt-1"
                placeholder=""
                onResize={() => {}}
                onResizeCapture={() => {}}
                onPointerEnterCapture={() => {}}
                onPointerLeaveCapture={() => {}}
              >
                Checking...
              </Typography>
            )}
            {poNumberStatus === "valid" && (
              <Typography 
                variant="small" 
                color="green" 
                className="mt-1"
                placeholder=""
                onResize={() => {}}
                onResizeCapture={() => {}}
                onPointerEnterCapture={() => {}}
                onPointerLeaveCapture={() => {}}
              >
                PO Number is available.
              </Typography>
            )}
            {poNumberStatus === "invalid" && (
              <Typography 
                variant="small" 
                color="red" 
                className="mt-1"
                placeholder=""
                onResize={() => {}}
                onResizeCapture={() => {}}
                onPointerEnterCapture={() => {}}
                onPointerLeaveCapture={() => {}}
              >
                This PO Number already exists.
              </Typography>
            )}
          </div>
          <div>
            <Input
              label="Finish Code / Product Code"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
              list="product-codes"
              onResize={() => {}}
              onResizeCapture={() => {}}
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              crossOrigin=""
            />
            {productCodeStatus === "invalid" && (
              <Typography 
                variant="small" 
                color="red" 
                className="mt-1"
                placeholder=""
                onResize={() => {}}
                onResizeCapture={() => {}}
                onPointerEnterCapture={() => {}}
                onPointerLeaveCapture={() => {}}
              >
                Product code not found in BOM.
              </Typography>
            )}
          </div>
        </div>

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

        <datalist id="product-codes">
          {allProducts.map((p) => (
            <option key={p.id} value={p.productCode} />
          ))}
        </datalist>

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

        <Collapse open={productCodeStatus === "valid"}>
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
                    ? "bg-red-50 text-red-700"
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
          onClick={handleSubmit}
          disabled={poNumberStatus !== "valid" || productCodeStatus !== "valid"}
          placeholder=""
          onResize={() => {}}
          onResizeCapture={() => {}}
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          Submit PO
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
