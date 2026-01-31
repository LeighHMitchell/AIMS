"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Calendar, 
  Building2, 
  Activity, 
  Layers, 
  ArrowRightLeft,
  CalendarDays,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { PivotFilterState } from './PivotFilters'
import { cn } from '@/lib/utils'

// Activity status labels for display
const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  '1': 'Pipeline/Identification',
  '2': 'Implementation',
  '3': 'Finalisation',
  '4': 'Closed',
  '5': 'Cancelled',
  '6': 'Suspended',
}

// Transaction type labels for display
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge',
}

interface FilterBreadcrumbsProps {
  filters: PivotFilterState
  onRemove: (filterKey: keyof PivotFilterState, value?: string) => void
  onClearAll: () => void
  organizationLabels: Map<string, string>
  sectorLabels: Map<string, string>
  className?: string
}

interface FilterChipProps {
  icon: React.ReactNode
  label: string
  values: string[]
  maxDisplay?: number
  onRemove: () => void
  onRemoveValue?: (value: string) => void
}

function FilterChip({ 
  icon, 
  label, 
  values, 
  maxDisplay = 2, 
  onRemove,
  onRemoveValue 
}: FilterChipProps) {
  const displayValues = values.slice(0, maxDisplay)
  const remainingCount = values.length - maxDisplay

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20 group">
      <span className="text-primary/70">{icon}</span>
      <span className="font-medium">{label}:</span>
      <span className="text-primary/90">
        {displayValues.join(', ')}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
            +{remainingCount}
          </Badge>
        )}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
        title={`Remove ${label} filter`}
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

function DateRangeChip({ 
  startDate, 
  endDate, 
  onRemove 
}: { 
  startDate: Date | null
  endDate: Date | null
  onRemove: () => void 
}) {
  const formatDate = (date: Date) => format(date, 'MMM d, yyyy')
  
  let label = ''
  if (startDate && endDate) {
    label = `${formatDate(startDate)} - ${formatDate(endDate)}`
  } else if (startDate) {
    label = `From ${formatDate(startDate)}`
  } else if (endDate) {
    label = `Until ${formatDate(endDate)}`
  }

  if (!label) return null

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20">
      <Calendar className="h-3.5 w-3.5 text-primary/70" />
      <span className="font-medium">Date:</span>
      <span className="text-primary/90">{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
        title="Remove date filter"
        aria-label="Remove date filter"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function FilterBreadcrumbs({
  filters,
  onRemove,
  onClearAll,
  organizationLabels,
  sectorLabels,
  className,
}: FilterBreadcrumbsProps) {
  // Count active filters
  const activeFilterCount = [
    filters.startDate || filters.endDate ? 1 : 0,
    filters.organizationIds.length > 0 ? 1 : 0,
    filters.statuses.length > 0 ? 1 : 0,
    filters.sectorCodes.length > 0 ? 1 : 0,
    filters.transactionTypes.length > 0 ? 1 : 0,
    filters.fiscalYears.length > 0 ? 1 : 0,
    filters.recordTypes.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  if (activeFilterCount === 0) {
    return (
      <div className={cn("flex items-center gap-2 py-2", className)}>
        <span className="text-xs text-muted-foreground/60 italic">
          No filters applied — filter chips will appear here
        </span>
      </div>
    )
  }

  // Helper to get organization labels
  const getOrgLabels = (ids: string[]) => 
    ids.map(id => organizationLabels.get(id) || id)

  // Helper to get sector labels
  const getSectorLabels = (codes: string[]) => 
    codes.map(code => sectorLabels.get(code) || code)

  // Helper to get status labels
  const getStatusLabels = (codes: string[]) => 
    codes.map(code => ACTIVITY_STATUS_LABELS[code] || code)

  // Helper to get transaction type labels
  const getTransactionTypeLabels = (codes: string[]) => 
    codes.map(code => TRANSACTION_TYPE_LABELS[code] || code)

  return (
    <nav 
      className={cn(
        "flex items-center gap-2 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted",
        className
      )}
      aria-label="Active filters"
      role="navigation"
    >
      <span className="text-xs text-muted-foreground font-medium shrink-0" aria-hidden="true">
        Active filters:
      </span>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date Range */}
        {(filters.startDate || filters.endDate) && (
          <DateRangeChip
            startDate={filters.startDate}
            endDate={filters.endDate}
            onRemove={() => {
              onRemove('startDate')
              onRemove('endDate')
            }}
          />
        )}

        {/* Organizations */}
        {filters.organizationIds.length > 0 && (
          <FilterChip
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Partners"
            values={getOrgLabels(filters.organizationIds)}
            onRemove={() => onRemove('organizationIds')}
          />
        )}

        {/* Activity Status */}
        {filters.statuses.length > 0 && (
          <FilterChip
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Status"
            values={getStatusLabels(filters.statuses)}
            maxDisplay={3}
            onRemove={() => onRemove('statuses')}
          />
        )}

        {/* Sectors */}
        {filters.sectorCodes.length > 0 && (
          <FilterChip
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Sectors"
            values={getSectorLabels(filters.sectorCodes)}
            onRemove={() => onRemove('sectorCodes')}
          />
        )}

        {/* Transaction Types */}
        {filters.transactionTypes.length > 0 && (
          <FilterChip
            icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
            label="Transaction"
            values={getTransactionTypeLabels(filters.transactionTypes)}
            maxDisplay={2}
            onRemove={() => onRemove('transactionTypes')}
          />
        )}

        {/* Fiscal Years */}
        {filters.fiscalYears.length > 0 && (
          <FilterChip
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Years"
            values={filters.fiscalYears}
            maxDisplay={3}
            onRemove={() => onRemove('fiscalYears')}
          />
        )}

        {/* Record Types */}
        {filters.recordTypes.length > 0 && (
          <FilterChip
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Record Type"
            values={filters.recordTypes}
            maxDisplay={2}
            onRemove={() => onRemove('recordTypes')}
          />
        )}

        {/* Clear All button - only show when multiple filters active */}
        {activeFilterCount >= 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 shrink-0"
            aria-label="Clear all filters"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Clear all
          </Button>
        )}
      </div>
    </nav>
  )
}
