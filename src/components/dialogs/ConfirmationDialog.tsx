// src/components/dialogs/ConfirmationDialog.tsx

import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
} from "@material-tailwind/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// BLOCK 2: Interface and Component Definition
interface ConfirmationDialogProps {
  open: boolean;
  handleOpen: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string; // Tailwind color name like 'red', 'green'
}

export function ConfirmationDialog({
  open,
  handleOpen,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  confirmColor = "red",
}: ConfirmationDialogProps) {
  // BLOCK 3: Handlers
  const handleConfirmClick = () => {
    onConfirm();
    handleOpen();
  };

  // BLOCK 4: Render Logic
  return (
    <Dialog open={open} handler={handleOpen} size="sm">
      <DialogHeader className="gap-2">
        <ExclamationTriangleIcon
          className={`h-6 w-6 text-${confirmColor}-500`}
        />
        {title}
      </DialogHeader>
      <DialogBody divider>
        <Typography color="gray" className="font-normal">
          {message}
        </Typography>
      </DialogBody>
      <DialogFooter>
        <Button
          variant="text"
          color="blue-gray"
          onClick={handleOpen}
          className="mr-1"
        >
          <span>Cancel</span>
        </Button>
        <Button
          variant="gradient"
          color={confirmColor as any} // Cast to any to allow string colors
          onClick={handleConfirmClick}
        >
          <span>{confirmText}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
