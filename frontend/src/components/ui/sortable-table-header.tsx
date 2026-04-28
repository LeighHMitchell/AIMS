"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SortableTableHeaderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function SortableTableHeader({
  id,
  children,
  className,
  disabled = false,
  onClick,
}: SortableTableHeaderProps) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-top text-body font-medium text-muted-foreground",
        className
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
