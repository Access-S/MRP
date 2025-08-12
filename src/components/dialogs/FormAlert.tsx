// BLOCK 1: Imports
import React from "react";
import { Alert } from "@material-tailwind/react";
import { InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

// BLOCK 2: Interface and Component Definition
interface FormAlertProps {
  type: "error" | "info";
  message: string;
  onDismiss?: () => void;
}

export function FormAlert({ type, message, onDismiss }: FormAlertProps) {
  const isError = type === "error";
  const color = isError ? "red" : "blue";
  const Icon = isError ? ExclamationTriangleIcon : InformationCircleIcon;

  return (
    <Alert
      color={color}
      icon={<Icon className="h-5 w-5" />}
      open={!!message} // The alert is visible only if there is a message
      onClose={onDismiss} // Enables the 'x' button to dismiss
      className="mt-4"
    >
      {message}
    </Alert>
  );
}