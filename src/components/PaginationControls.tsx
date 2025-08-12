// BLOCK 1: Imports
import React from 'react';
import { Button, Typography } from '@material-tailwind/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

// BLOCK 2: Interface and Component Definition
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onItemsPerPageChange: (newLimit: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationControlsProps) {
  const { theme } = useTheme();

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex items-center justify-between p-4 border-t ${theme.borderColor}`}>
      <Typography variant="small" className={theme.text}>
        Showing {startItem} to {endItem} of {totalItems} entries
      </Typography>

      <div className="flex items-center gap-4">
        {/* --- DARK MODE FIX for the dropdown --- */}
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className={`p-2 border rounded-md ${theme.borderColor} ${theme.cards} ${theme.text}`}
        >
          {[25, 50, 75, 100].map(size => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>

        {/* --- DARK MODE FIX for the buttons --- */}
        <Button
          variant="text"
          className={`flex items-center gap-2 ${theme.buttonText}`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ArrowLeftIcon strokeWidth={2} className="h-4 w-4" /> Previous
        </Button>
        <Typography color="gray" className={`font-normal ${theme.text}`}>
          Page <strong className={theme.text}>{currentPage}</strong> of{" "}
          <strong className={theme.text}>{totalPages || 1}</strong>
        </Typography>
        <Button
          variant="text"
          className={`flex items-center gap-2 ${theme.buttonText}`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next <ArrowRightIcon strokeWidth={2} className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}