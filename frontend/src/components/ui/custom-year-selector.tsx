"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomYear } from "@/types/custom-years";
import { cn } from "@/lib/utils";

interface CustomYearSelectorProps {
  /** List of available custom years */
  customYears: CustomYear[];
  /** Currently selected custom year ID */
  selectedId: string | null;
  /** Callback when selection changes */
  onSelect: (id: string | null) => void;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Dropdown selector for custom year/fiscal year definitions.
 * Styled to match other chart control dropdowns.
 */
export function CustomYearSelector({
  customYears,
  selectedId,
  onSelect,
  loading = false,
  disabled = false,
  className,
  placeholder = "Select year type",
}: CustomYearSelectorProps) {
  // Find the selected custom year for display
  const selectedYear = selectedId
    ? customYears.find((cy) => cy.id === selectedId)
    : null;

  const handleValueChange = (value: string) => {
    onSelect(value || null);
  };

  if (loading) {
    return (
      <div
        className={cn(
          "w-[180px] h-8 bg-muted animate-pulse rounded-md",
          className
        )}
      />
    );
  }

  // Don't render if no custom years available
  if (customYears.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedId || undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "min-w-[200px] w-auto h-8 text-xs",
          className
        )}
      >
        <SelectValue placeholder={placeholder}>
          {selectedYear?.name || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {customYears.map((cy) => (
          <SelectItem key={cy.id} value={cy.id} className="text-xs">
            {cy.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
