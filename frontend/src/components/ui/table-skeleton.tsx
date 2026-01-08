"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Props for the TableSkeleton component
 */
export interface TableSkeletonProps {
  /** Number of skeleton rows to display (default: 5) */
  rows?: number;
  /** Number of columns to display (default: 6) */
  columns?: number;
}

/**
 * A standardised loading skeleton for table views.
 * Displays skeleton rows matching typical table row height and padding.
 */
export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b border-gray-200 bg-muted/30">
        <div className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? "200px" : "120px" }}
            />
          ))}
        </div>
      </div>
      {/* Row skeletons */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
                style={{ maxWidth: colIndex === 0 ? "200px" : "120px" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
