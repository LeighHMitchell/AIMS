"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X, ArrowDownWideNarrow } from "lucide-react"

export type SortOption = 'overspend' | 'percentage' | 'organization';

interface Organization {
  id: string;
  name: string;
}

interface FinancialCompletenessFiltersProps {
  organizations: Organization[];
  selectedOrgId: string;
  sortBy: SortOption;
  onOrgChange: (orgId: string) => void;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
}

export function FinancialCompletenessFilters({
  organizations,
  selectedOrgId,
  sortBy,
  onOrgChange,
  onSortChange,
  onClearFilters
}: FinancialCompletenessFiltersProps) {
  const hasActiveFilters = selectedOrgId !== 'all';

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Reporting Organization Dropdown */}
      <Select value={selectedOrgId} onValueChange={onOrgChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="All Organizations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Organizations</SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort By Dropdown */}
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[280px]">
          <div className="flex items-center gap-2">
            <ArrowDownWideNarrow className="h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="overspend">Sort by Overspend</SelectItem>
          <SelectItem value="percentage">Sort by % Spent</SelectItem>
          <SelectItem value="organization">Sort by Organization</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
