"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FullPaginationProps {
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  perPage: number;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when items-per-page changes */
  onPerPageChange: (perPage: number) => void;
  /** Items-per-page options */
  perPageOptions?: number[];
  /** Label for the item type (e.g., "projects", "parcels") */
  itemLabel?: string;
}

/**
 * Full-featured pagination component with:
 * - "Showing X to Y of Z" info text
 * - First / Previous / Page numbers / Next / Last buttons
 * - Items-per-page dropdown
 */
export function FullPagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 25, 50, 100],
  itemLabel = "items",
}: FullPaginationProps) {
  if (totalItems === 0) return null;

  const startIndex = (page - 1) * perPage;
  const showingFrom = Math.min(startIndex + 1, totalItems);
  const showingTo = Math.min(startIndex + perPage, totalItems);

  // Calculate visible page numbers (5 max, centered on current)
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-4 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Info text */}
        <div className="text-body text-muted-foreground">
          Showing {showingFrom} to {showingTo} of {totalItems} {itemLabel}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum) => (
              <Button
                key={pageNum}
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 p-0 ${
                  page === pageNum ? "bg-muted font-semibold" : ""
                }`}
              >
                {pageNum}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            Last
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Items per page */}
        <div className="flex items-center gap-2">
          <label className="text-body text-muted-foreground">Per page:</label>
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              onPerPageChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
