"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter, MultiSelectOption } from '@/components/ui/multi-select-filter'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar, Building2, Activity, Layers, Filter, RefreshCw, ChevronRight } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export interface PivotFilterState {
  startDate: Date | null
  endDate: Date | null
  organizationIds: string[]
  statuses: string[]
  sectorCodes: string[]
  transactionTypes: string[]
  fiscalYears: string[]
  recordTypes: string[]
}

interface PivotFiltersProps {
  filters: PivotFilterState
  onChange: (filters: PivotFilterState) => void
  onApply: () => void
  isLoading?: boolean
  onFilterOptionsLoaded?: (options: {
    organizationLabels: Map<string, string>
    sectorLabels: Map<string, string>
  }) => void
}

// Activity status options based on IATI standard
const ACTIVITY_STATUS_OPTIONS: MultiSelectOption[] = [
  { value: '1', label: 'Pipeline/Identification', code: '1' },
  { value: '2', label: 'Implementation', code: '2' },
  { value: '3', label: 'Finalisation', code: '3' },
  { value: '4', label: 'Closed', code: '4' },
  { value: '5', label: 'Cancelled', code: '5' },
  { value: '6', label: 'Suspended', code: '6' },
]

// Transaction type options based on IATI standard
const TRANSACTION_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: '1', label: 'Incoming Funds', code: '1' },
  { value: '2', label: 'Outgoing Commitment', code: '2' },
  { value: '3', label: 'Disbursement', code: '3' },
  { value: '4', label: 'Expenditure', code: '4' },
  { value: '5', label: 'Interest Payment', code: '5' },
  { value: '6', label: 'Loan Repayment', code: '6' },
  { value: '7', label: 'Reimbursement', code: '7' },
  { value: '8', label: 'Purchase of Equity', code: '8' },
  { value: '9', label: 'Sale of Equity', code: '9' },
  { value: '10', label: 'Credit Guarantee', code: '10' },
  { value: '11', label: 'Incoming Commitment', code: '11' },
  { value: '12', label: 'Outgoing Pledge', code: '12' },
  { value: '13', label: 'Incoming Pledge', code: '13' },
]

// Record type options (Transaction, Planned Disbursement, Budget)
const RECORD_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: 'Transaction', label: 'Transactions' },
  { value: 'Planned Disbursement', label: 'Planned Disbursements' },
  { value: 'Budget', label: 'Budgets' },
]

// Generate fiscal year options for the last 20 years
const generateFiscalYearOptions = (): MultiSelectOption[] => {
  const currentYear = new Date().getFullYear()
  const years: MultiSelectOption[] = []
  for (let year = currentYear + 2; year >= currentYear - 20; year--) {
    years.push({ value: year.toString(), label: year.toString() })
  }
  return years
}

const FISCAL_YEAR_OPTIONS = generateFiscalYearOptions()

export function PivotFilters({ filters, onChange, onApply, isLoading, onFilterOptionsLoaded }: PivotFiltersProps) {
  const [organizations, setOrganizations] = useState<MultiSelectOption[]>([])
  const [sectors, setSectors] = useState<MultiSelectOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch organizations and sectors for filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      setLoadingOptions(true)
      try {
        let orgOptions: MultiSelectOption[] = []
        let sectorOptions: MultiSelectOption[] = []

        // Fetch organizations
        const orgsResponse = await fetch('/api/organizations')
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json()
          orgOptions = (orgsData.data || orgsData || []).map((org: { id: string; name: string; acronym?: string }) => ({
            value: org.id,
            label: org.acronym ? `${org.acronym} - ${org.name}` : org.name,
            code: org.acronym,
          }))
          setOrganizations(orgOptions)
        }

        // Fetch sectors from codelists
        const sectorsResponse = await fetch('/api/codelists/sector')
        if (sectorsResponse.ok) {
          const sectorsData = await sectorsResponse.json()
          sectorOptions = (sectorsData.data || sectorsData || []).map((sector: { code: string; name: string }) => ({
            value: sector.code,
            label: sector.name,
            code: sector.code,
          }))
          setSectors(sectorOptions)
        }

        // Notify parent component of loaded options for breadcrumb labels
        if (onFilterOptionsLoaded) {
          const organizationLabels = new Map<string, string>()
          orgOptions.forEach(opt => organizationLabels.set(opt.value, opt.label))
          
          const sectorLabels = new Map<string, string>()
          sectorOptions.forEach(opt => sectorLabels.set(opt.value, opt.label))
          
          onFilterOptionsLoaded({ organizationLabels, sectorLabels })
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchFilterOptions()
  }, [onFilterOptionsLoaded])

  const handleStartDateChange = (date: Date | null) => {
    onChange({ ...filters, startDate: date })
  }

  const handleEndDateChange = (date: Date | null) => {
    onChange({ ...filters, endDate: date })
  }

  const handleClearFilters = () => {
    onChange({
      startDate: null,
      endDate: null,
      organizationIds: [],
      statuses: [],
      sectorCodes: [],
      transactionTypes: [],
      fiscalYears: [],
      recordTypes: [],
    })
  }

  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.organizationIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.sectorCodes.length > 0 ||
    filters.transactionTypes.length > 0 ||
    filters.fiscalYears.length > 0 ||
    filters.recordTypes.length > 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-muted/30 rounded-lg border">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-lg">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground font-normal">(active)</span>
              )}
            </h3>
            {hasActiveFilters && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearFilters()
                }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear all
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Transaction Date Range
                </label>
                <div className="flex gap-2">
                  <DatePicker
                    selected={filters.startDate}
                    onChange={handleStartDateChange}
                    selectsStart
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    placeholderText="Start"
                    className="w-full h-9 px-3 text-sm border rounded-md bg-background"
                    dateFormat="MMM d, yyyy"
                  />
                  <DatePicker
                    selected={filters.endDate}
                    onChange={handleEndDateChange}
                    selectsEnd
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    minDate={filters.startDate || undefined}
                    placeholderText="End"
                    className="w-full h-9 px-3 text-sm border rounded-md bg-background"
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>

              {/* Organization Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Development Partner
                </label>
                <MultiSelectFilter
                  options={organizations}
                  value={filters.organizationIds}
                  onChange={(value) => onChange({ ...filters, organizationIds: value })}
                  placeholder={loadingOptions ? "Loading..." : "Select partners..."}
                  searchPlaceholder="Search organizations..."
                  icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                  className="w-full"
                />
              </div>

              {/* Activity Status Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Activity Status
                </label>
                <MultiSelectFilter
                  options={ACTIVITY_STATUS_OPTIONS}
                  value={filters.statuses}
                  onChange={(value) => onChange({ ...filters, statuses: value })}
                  placeholder="Select statuses..."
                  icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                  className="w-full"
                />
              </div>

              {/* Sector Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Sector
                </label>
                <MultiSelectFilter
                  options={sectors}
                  value={filters.sectorCodes}
                  onChange={(value) => onChange({ ...filters, sectorCodes: value })}
                  placeholder={loadingOptions ? "Loading..." : "Select sectors..."}
                  searchPlaceholder="Search sectors..."
                  icon={<Layers className="h-4 w-4 text-muted-foreground" />}
                  className="w-full"
                />
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Transaction Type
                </label>
                <MultiSelectFilter
                  options={TRANSACTION_TYPE_OPTIONS}
                  value={filters.transactionTypes}
                  onChange={(value) => onChange({ ...filters, transactionTypes: value })}
                  placeholder="Select types..."
                  className="w-full"
                />
              </div>

              {/* Fiscal Year Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Fiscal Year
                </label>
                <MultiSelectFilter
                  options={FISCAL_YEAR_OPTIONS}
                  value={filters.fiscalYears}
                  onChange={(value) => onChange({ ...filters, fiscalYears: value })}
                  placeholder="Select years..."
                  className="w-full"
                />
              </div>

              {/* Record Type Filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Record Type
                </label>
                <MultiSelectFilter
                  options={RECORD_TYPE_OPTIONS}
                  value={filters.recordTypes}
                  onChange={(value) => onChange({ ...filters, recordTypes: value })}
                  placeholder="All record types..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onApply} disabled={isLoading} className="gap-2">
                {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
