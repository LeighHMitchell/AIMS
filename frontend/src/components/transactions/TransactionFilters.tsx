import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TRANSACTION_TYPE_LABELS, FLOW_TYPE_LABELS, TransactionType, FlowType } from "@/types/transaction";

interface FilterState {
  transactionType: string;
  aidType: string;
  flowType: string;
  financeType: string;
  organization: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface TransactionFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function TransactionFilters({ filters, onFilterChange }: TransactionFiltersProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      transactionType: "all",
      aidType: "all",
      flowType: "all",
      financeType: "all",
      organization: "all",
      dateFrom: "",
      dateTo: "",
      status: "all",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== "all" && value !== ""
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Transaction Type Filter */}
      <div className="space-y-2">
        <Label htmlFor="transactionType">Transaction Type</Label>
        <Select
          value={filters.transactionType}
          onValueChange={(value) => handleFilterChange("transactionType", value)}
        >
          <SelectTrigger id="transactionType">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flow Type Filter */}
      <div className="space-y-2">
        <Label htmlFor="flowType">Flow Type</Label>
        <Select
          value={filters.flowType}
          onValueChange={(value) => handleFilterChange("flowType", value)}
        >
          <SelectTrigger id="flowType">
            <SelectValue placeholder="All flow types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flow types</SelectItem>
            {Object.entries(FLOW_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label>Date Range</Label>
        <div className="flex space-x-2">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            placeholder="From"
            className="flex-1"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            placeholder="To"
            className="flex-1"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
} 