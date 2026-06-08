"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X, ArrowDownWideNarrow } from "lucide-react"
import { OrganizationCombobox } from "@/components/ui/organization-combobox"

export type SortOption = 'overspend' | 'percentage' | 'organization';

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

interface FinancialCompletenessFiltersProps {
  organizations: Organization[];
  selectedOrgId: string;
  sortBy: SortOption;
  onOrgChange: (orgId: string) => void;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
}

// Sequenced sort options, each shown with a gray monospace code badge.
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'overspend', label: 'Sort by Overspend' },
  { value: 'percentage', label: 'Sort by % Spent' },
  { value: 'organization', label: 'Sort by Organisation' },
];

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
      {/* Reporting Organisation — searchable combobox (cleared = all) */}
      <div className="w-[300px]">
        <OrganizationCombobox
          organizations={organizations}
          value={selectedOrgId === 'all' ? undefined : selectedOrgId}
          onValueChange={(id) => onOrgChange(id || 'all')}
          placeholder="All organisations"
          searchPlaceholder="Search organisations…"
        />
      </div>

      {/* Sort By Dropdown — sequenced, with code badges */}
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[260px]">
          <div className="flex items-center gap-2">
            <ArrowDownWideNarrow className="h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt, i) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">{i + 1}</span>
              {opt.label}
            </SelectItem>
          ))}
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
