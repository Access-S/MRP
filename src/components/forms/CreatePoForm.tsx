// BLOCK 1: Imports
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
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
import { Product, PoStatus, PurchaseOrder } from "../../types/mrp.types";
import { getAllProducts } from "../../services/product.service";
import {
  checkPoNumberExists,
  createNewPurchaseOrder,
} from "../../services/purchaseOrder.service";

// BLOCK 2: Interface and Component Definition
interface CreatePoFormProps {
  open: boolean;
  handleOpen: () => void;
  onPoCreated: (newPo: PurchaseOrder) => void;
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
  const [customerName, setCustomerName] = useState("");
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
      toast.error("Please ensure all required fields are filled out.");
      return;
    }

    const product = allProducts.find(
      (p) => p.productCode === productCode.trim()
    );

    // A safety check to make sure we found the product
    if (!product) {
      toast.error(
        "Could not find product details. Please re-select the product."
      );
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
      description: product.description,
      minsPerShipper: product.minsPerShipper || 0,
      hourlyRunRate: product.hourlyRunRate || 0,
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

      const newPoForState: PurchaseOrder = {
        id: newPoId,
        ...poData,
        sequence: Date.now(), // Use timestamp as a temporary unique key for sorting
        poCreatedDate: new Date(poData.poCreatedDate),
        poReceivedDate: new Date(poData.poReceivedDate),
        requestedDeliveryDate: new Date(poData.poReceivedDate), // Default to received date
        status: [finalStatus],
        components: product.components || [],
      };

      onPoCreated(newPoForState);

      toast.dismiss(loadingToast);
      toast.success(`PO ${poData.poNumber} created successfully!`);
      resetForm();
      handleOpen();
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("Error creating PO:", err);
      toast.error("Failed to create PO. Please try again.");
    }
  };

  // BLOCK 6: Render Logic
  return (
    <Dialog open={open} handler={handleOpen} size="md">
      <DialogHeader>Create New Purchase Order</DialogHeader>
      <DialogBody divider className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="PO Number"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              required
            />
            {poNumberStatus === "checking" && (
              <Typography variant="small" color="blue" className="mt-1">
                Checking...
              </Typography>
            )}
            {poNumberStatus === "valid" && (
              <Typography variant="small" color="green" className="mt-1">
                PO Number is available.
              </Typography>
            )}
            {poNumberStatus === "invalid" && (
              <Typography variant="small" color="red" className="mt-1">
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
            />
            {productCodeStatus === "invalid" && (
              <Typography variant="small" color="red" className="mt-1">
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
          />
          <Input
            type="date"
            label="PO Received Date"
            value={poReceivedDate}
            onChange={(e) => setPoReceivedDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Ordered Quantity (Pieces)"
            value={orderedQtyPieces}
            onChange={(e) => setOrderedQtyPieces(e.target.value)}
            required
          />
          <Input
            type="number"
            label="Amount"
            value={customerAmount}
            onChange={(e) => setCustomerAmount(e.target.value)}
            required
          />
        </div>

        <Collapse open={productCodeStatus === "valid"}>
          <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-2">
            <Typography variant="h6">System Calculation</Typography>
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
      <DialogFooter>
        <Button variant="text" color="red" onClick={handleOpen}>
          Cancel
        </Button>
        <Button
          variant="gradient"
          color="green"
          onClick={handleSubmit}
          disabled={poNumberStatus !== "valid" || productCodeStatus !== "valid"}
        >
          Submit PO
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
