// BLOCK 1: Imports
import React from "react";
import { Button, Typography, Select, Option } from "@material-tailwind/react";
import { ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

// BLOCK 2: Props Interface
interface PaginationControlsProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (direction: "next" | "prev") => void;
  onItemsPerPageChange: (value: string) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// BLOCK 3: Main Component
export function PaginationControls({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  hasNextPage,
  hasPrevPage,
}: PaginationControlsProps) {
  // BLOCK 3.1: Calculations for Display
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // BLOCK 3.2: Render Logic
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <Typography variant="small">Rows per page:</Typography>
        <div className="w-20">
          <Select
            value={String(itemsPerPage)}
            onChange={(value) => onItemsPerPageChange(value || "25")}
            placeholder={undefined}
            onPointerEnterCapture={undefined}
            onPointerLeaveCapture={undefined}
          >
            <Option value="25">25</Option>
            <Option value="50">50</Option>
            <Option value="100">100</Option>
          </Select>
        </div>
      </div>

      <Typography color="gray" className="font-normal">
        Showing {startItem}-{endItem} of {totalItems}
      </Typography>

      <div className="flex items-center gap-4">
        <Button
          variant="text"
          className="flex items-center gap-2"
          onClick={() => onPageChange("prev")}
          disabled={!hasPrevPage}
          placeholder={undefined}
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        >
          <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
        </Button>
        <Button
          variant="text"
          className="flex items-center gap-2"
          onClick={() => onPageChange("next")}
          disabled={!hasNextPage}
          placeholder={undefined}
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        >
          Next <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
