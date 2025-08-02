// BLOCK 1: Imports
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Typography,
} from "@material-tailwind/react";
import { ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

// BLOCK 2: Interface and Component Definition
interface ExcelImportModalProps {
  open: boolean;
  handleOpen: () => void;
  onImport: (file: File) => void; // Prop now accepts a File object
  title: string;
}

export function ExcelImportModal({
  open,
  handleOpen,
  onImport,
  title,
}: ExcelImportModalProps) {
  // BLOCK 3: State Management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // BLOCK 4: Handlers
  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setError(
        "Invalid file type. Please upload an Excel (XLSX, XLS) or CSV file."
      );
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileSelect(event.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (selectedFile) {
      onImport(selectedFile);
      handleClose();
    } else {
      setError("Please select a file to import.");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    handleOpen();
  };

  // BLOCK 5: Render Logic
  return (
    <Dialog open={open} handler={handleClose} size="md">
      <DialogHeader>{title}</DialogHeader>
      <DialogBody divider>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center"
        >
          <ArrowUpTrayIcon className="h-12 w-12 text-gray-400" />
          <Typography color="gray" className="mt-2">
            Drag & Drop your Excel/CSV file here
          </Typography>
          <Typography variant="small" color="gray">
            or
          </Typography>
          <Button variant="text" size="sm" className="mt-2">
            Click to browse
          </Button>
          <input
            type="file"
            onChange={handleInputChange}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            accept=".xlsx, .xls, .csv"
          />
        </div>

        {selectedFile && (
          <Typography className="flex items-center gap-2 mt-4">
            <DocumentTextIcon className="h-5 w-5" /> {selectedFile.name}
          </Typography>
        )}
        {error && (
          <Typography color="red" className="mt-2">
            {error}
          </Typography>
        )}
      </DialogBody>
      <DialogFooter>
        <Button
          variant="text"
          color="red"
          onClick={handleClose}
          className="mr-1"
        >
          Cancel
        </Button>
        <Button
          variant="gradient"
          color="green"
          onClick={handleConfirmImport}
          disabled={!selectedFile}
        >
          Confirm & Import
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
