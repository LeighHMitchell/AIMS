'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  Globe,
  Calendar,
  Wallet,
  User,
  FileText,
  ExternalLink,
  X,
  SlidersHorizontal,
  Activity,
  Banknote,
  CreditCard,
  Receipt,
  PiggyBank,
  CalendarClock,
  Layers,
  Copy,
  Heart,
  Tag,
  Shield,
  Link2,
  Hash,
  ListChecks,
  Clock,
  TrendingUp,
  Landmark,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ParsedActivity } from './types'
import { IATI_COUNTRIES } from '@/data/iati-countries'
import { useHomeCountry } from '@/contexts/SystemSettingsContext'

interface BulkPreviewStepProps {
  activities: ParsedActivity[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  /** Country filter used during fetch (e.g. 'MM') — for National/Regional classification */
  filterCountry?: string
}

/** Classify an activity as National, Regional, or Unknown based on recipient countries/regions/transactions */
function classifyScope(activity: ParsedActivity, filterCountry?: string): 'National' | 'Regional' | 'Unknown' {
  const countries = activity.recipientCountries || []
  const regions = activity.recipientRegions || []
  const transactions = activity.transactions || []

  // Any recipient regions → Regional
  if (regions.length > 0) return 'Regional'

  // Multiple different recipient countries → Regional
  if (countries.length > 1) return 'Regional'

  // Check if transactions have multiple distinct countries or any regions
  const txnCountries = new Set<string>()
  let hasTransactionRegion = false
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].recipientCountryCode) txnCountries.add(transactions[i].recipientCountryCode!)
    if (transactions[i].recipientRegionCode) hasTransactionRegion = true
  }
  if (hasTransactionRegion) return 'Regional'
  if (txnCountries.size > 1) return 'Regional'

  // No data at all (no activity-level countries/regions, no transaction-level countries)
  if (countries.length === 0 && txnCountries.size === 0) return 'Unknown'

  // Single country — check against filter
  const singleCountry = countries.length === 1 ? countries[0].code : (txnCountries.size === 1 ? Array.from(txnCountries)[0] : null)
  if (singleCountry) {
    if (filterCountry) {
      return singleCountry === filterCountry ? 'National' : 'Regional'
    }
    return 'National'
  }

  return 'Unknown'
}

type FilterStatus = 'all' | 'valid' | 'warnings' | 'errors'
type SortField = 'id' | 'title' | 'transactions' | 'budget' | 'status'

// Activity status codes and labels
const ACTIVITY_STATUS_OPTIONS: Record<string, string> = {
  '1': 'Pipeline/Identification',
  '2': 'Implementation',
  '3': 'Finalisation',
  '4': 'Closed',
  '5': 'Cancelled',
  '6': 'Suspended',
}

// OECD DAC Aid Type codes (comprehensive list)
const AID_TYPE_OPTIONS: Record<string, string> = {
  // Budget support
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  // Core contributions
  'B01': 'Core support to NGOs, other private bodies, PPPs and research institutes',
  'B02': 'Core contributions to multilateral institutions',
  'B021': 'Core contributions to multilateral institutions (assessed)',
  'B022': 'Core contributions to multilateral institutions (voluntary)',
  'B03': 'Contributions to specific-purpose programmes and funds managed by implementing partners',
  'B031': 'Contributions to multi-donor/multi-entity funding mechanisms',
  'B032': 'Contributions to specific-purpose programmes and funds managed by implementing partners',
  'B033': 'Contributions to PPPs with multilaterals',
  'B04': 'Basket funds/pooled funding',
  // Project-type
  'C01': 'Project-type interventions',
  // Experts and technical assistance
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  // Scholarships
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  // Debt relief
  'F01': 'Debt relief',
  // Administrative costs
  'G01': 'Administrative costs not included elsewhere',
  // Other in-donor expenditures
  'H01': 'Development awareness',
  'H02': 'Refugees/Asylum seekers in donor countries',
  'H03': 'Asylum seekers ultimately not granted asylum',
  'H04': 'In-donor scholarships for students from developing countries',
  'H05': 'In-donor support to refugees',
}

// Common finance type codes
const FINANCE_TYPE_OPTIONS: Record<string, string> = {
  '110': 'Standard grant',
  '210': 'Interest subsidy',
  '310': 'Capital subscription (deposit)',
  '410': 'Aid loan (excl. debt reorg.)',
  '421': 'Standard loan',
  '422': 'Reimbursable grant',
  '510': 'Common equity',
  '610': 'Debt forgiveness',
  '621': 'Debt rescheduling',
}

export default function BulkPreviewStep({
  activities,
  selectedIds,
  onSelectionChange,
  filterCountry,
}: BulkPreviewStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const homeCountry = useHomeCountry()

  // Advanced filters
  const [activityStatusFilter, setActivityStatusFilter] = useState<string[]>([])
  const [hierarchyFilter, setHierarchyFilter] = useState<number[]>([])
  const [aidTypeFilter, setAidTypeFilter] = useState<string[]>([])
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string[]>([])
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'has' | 'none'>('all')
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'has' | 'none'>('all')
  const [plannedDisbursementFilter, setPlannedDisbursementFilter] = useState<'all' | 'has' | 'none'>('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'National' | 'Regional' | 'Unknown'>('all')

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activityStatusFilter.length > 0) count++
    if (hierarchyFilter.length > 0) count++
    if (aidTypeFilter.length > 0) count++
    if (financeTypeFilter.length > 0) count++
    if (transactionFilter !== 'all') count++
    if (budgetFilter !== 'all') count++
    if (plannedDisbursementFilter !== 'all') count++
    if (scopeFilter !== 'all') count++
    return count
  }, [activityStatusFilter, hierarchyFilter, aidTypeFilter, financeTypeFilter, transactionFilter, budgetFilter, plannedDisbursementFilter, scopeFilter])

  // Get unique values from activities for filter options with counts
  const availableOptions = useMemo(() => {
    const statusCounts = new Map<string, number>()
    const hierarchyCounts = new Map<number, number>()
    const aidTypeCounts = new Map<string, number>()
    const financeTypeCounts = new Map<string, number>()

    for (const a of activities) {
      const status = a.status || a.activity_status
      if (status) {
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
      }
      if (a.hierarchy != null) {
        hierarchyCounts.set(a.hierarchy, (hierarchyCounts.get(a.hierarchy) || 0) + 1)
      }
      if (a.defaultAidType) {
        aidTypeCounts.set(a.defaultAidType, (aidTypeCounts.get(a.defaultAidType) || 0) + 1)
      }
      if (a.defaultFinanceType) {
        financeTypeCounts.set(a.defaultFinanceType, (financeTypeCounts.get(a.defaultFinanceType) || 0) + 1)
      }
    }

    return {
      statuses: Array.from(statusCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      hierarchies: Array.from(hierarchyCounts.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => a.level - b.level),
      aidTypes: Array.from(aidTypeCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      financeTypes: Array.from(financeTypeCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    }
  }, [activities])

  const clearAllFilters = () => {
    setActivityStatusFilter([])
    setHierarchyFilter([])
    setAidTypeFilter([])
    setFinanceTypeFilter([])
    setTransactionFilter('all')
    setBudgetFilter('all')
    setPlannedDisbursementFilter('all')
    setScopeFilter('all')
  }

  const filteredActivities = useMemo(() => {
    let result = [...activities]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        a =>
          a.iatiIdentifier?.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q)
      )
    }

    // Validation status filter
    if (filterStatus === 'valid') {
      result = result.filter(a => !a.validationIssues?.some(i => i.severity === 'error' || i.severity === 'warning'))
    } else if (filterStatus === 'warnings') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'warning'))
    } else if (filterStatus === 'errors') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'error'))
    }

    // Activity status filter
    if (activityStatusFilter.length > 0) {
      result = result.filter(a => {
        const status = a.status || a.activity_status
        return status && activityStatusFilter.includes(status)
      })
    }

    // Hierarchy filter
    if (hierarchyFilter.length > 0) {
      result = result.filter(a => a.hierarchy != null && hierarchyFilter.includes(a.hierarchy))
    }

    // Aid type filter
    if (aidTypeFilter.length > 0) {
      result = result.filter(a => a.defaultAidType && aidTypeFilter.includes(a.defaultAidType))
    }

    // Finance type filter
    if (financeTypeFilter.length > 0) {
      result = result.filter(a => a.defaultFinanceType && financeTypeFilter.includes(a.defaultFinanceType))
    }

    // Transaction filter
    if (transactionFilter === 'has') {
      result = result.filter(a => a.transactions && a.transactions.length > 0)
    } else if (transactionFilter === 'none') {
      result = result.filter(a => !a.transactions || a.transactions.length === 0)
    }

    // Budget filter
    if (budgetFilter === 'has') {
      result = result.filter(a => a.budgets && a.budgets.length > 0)
    } else if (budgetFilter === 'none') {
      result = result.filter(a => !a.budgets || a.budgets.length === 0)
    }

    // Planned disbursement filter
    if (plannedDisbursementFilter === 'has') {
      result = result.filter(a => a.plannedDisbursements && a.plannedDisbursements.length > 0)
    } else if (plannedDisbursementFilter === 'none') {
      result = result.filter(a => !a.plannedDisbursements || a.plannedDisbursements.length === 0)
    }

    // Scope filter (National/Regional/Unknown)
    if (scopeFilter !== 'all') {
      result = result.filter(a => classifyScope(a, filterCountry) === scopeFilter)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'id') cmp = (a.iatiIdentifier || '').localeCompare(b.iatiIdentifier || '')
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '')
      if (sortField === 'transactions') cmp = (a.transactions?.length || 0) - (b.transactions?.length || 0)
      if (sortField === 'budget') {
        const aBudget = (a.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
        const bBudget = (b.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
        cmp = aBudget - bBudget
      }
      if (sortField === 'status') {
        const aErr = a.validationIssues?.some(i => i.severity === 'error') ? 2 : a.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        const bErr = b.validationIssues?.some(i => i.severity === 'error') ? 2 : b.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        cmp = aErr - bErr
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [activities, searchQuery, filterStatus, activityStatusFilter, hierarchyFilter, aidTypeFilter, financeTypeFilter, transactionFilter, budgetFilter, plannedDisbursementFilter, scopeFilter, filterCountry, sortField, sortAsc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const selectAll = () => {
    const ids = new Set(filteredActivities.map(a => a.iatiIdentifier))
    onSelectionChange(ids)
  }

  const deselectAll = () => {
    onSelectionChange(new Set())
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const totalBudget = (a: ParsedActivity) => {
    return (a.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by IATI ID or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter controls */}
      <div className="flex items-center gap-3">
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <div className="flex gap-1">
          {(['all', 'valid', 'warnings', 'errors'] as FilterStatus[]).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status === 'valid' ? 'Valid' : status === 'warnings' ? 'Warnings' : 'Errors'}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="overflow-visible">
          <CardContent className="p-4 overflow-visible">
            <div className="flex flex-wrap gap-6">
              {/* Activity Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Status
                </Label>
                <div className="flex flex-col gap-2">
                  {availableOptions.statuses.map(({ code, count }) => (
                    <div key={code} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${code}`}
                        checked={activityStatusFilter.includes(code)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setActivityStatusFilter([...activityStatusFilter, code])
                          } else {
                            setActivityStatusFilter(activityStatusFilter.filter(s => s !== code))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`status-${code}`}
                        className="flex items-center gap-2 text-sm cursor-pointer font-normal"
                      >
                        <span className="truncate">{ACTIVITY_STATUS_OPTIONS[code] || code}</span>
                        <span className="text-gray-400">({count})</span>
                      </Label>
                    </div>
                  ))}
                  {availableOptions.statuses.length === 0 && (
                    <span className="text-sm text-gray-400">No statuses available</span>
                  )}
                </div>
              </div>

              {/* Hierarchy Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Hierarchy Level
                </Label>
                <div className="flex flex-col gap-2">
                  {availableOptions.hierarchies.map(({ level, count }) => {
                    const hierarchyNames: Record<number, string> = {
                      1: 'Parent',
                      2: 'Sub-Activity',
                    }
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <Checkbox
                          id={`hierarchy-${level}`}
                          checked={hierarchyFilter.includes(level)}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              setHierarchyFilter([...hierarchyFilter, level])
                            } else {
                              setHierarchyFilter(hierarchyFilter.filter(h => h !== level))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`hierarchy-${level}`}
                          className="flex items-center gap-2 text-sm cursor-pointer font-normal"
                        >
                          <span>Level {level} ({hierarchyNames[level] || `Level ${level}`})</span>
                          <span className="text-gray-400">({count})</span>
                        </Label>
                      </div>
                    )
                  })}
                  {availableOptions.hierarchies.length === 0 && (
                    <span className="text-sm text-gray-400">No hierarchy data</span>
                  )}
                </div>
              </div>

              {/* Aid Type */}
              <div className="space-y-3 max-w-xs">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Aid Type
                </Label>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {availableOptions.aidTypes.map(({ code, count }) => (
                    <div key={code} className="flex items-start gap-2">
                      <Checkbox
                        id={`aid-${code}`}
                        checked={aidTypeFilter.includes(code)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setAidTypeFilter([...aidTypeFilter, code])
                          } else {
                            setAidTypeFilter(aidTypeFilter.filter(t => t !== code))
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`aid-${code}`}
                        className="text-sm cursor-pointer font-normal leading-snug"
                      >
                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">{code}</span>{' '}
                        {AID_TYPE_OPTIONS[code] || code}{' '}
                        <span className="text-gray-400">({count})</span>
                      </Label>
                    </div>
                  ))}
                  {availableOptions.aidTypes.length === 0 && (
                    <span className="text-sm text-gray-400">No aid types available</span>
                  )}
                </div>
              </div>

              {/* Finance Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Finance Type
                </Label>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {availableOptions.financeTypes.map(({ code, count }) => (
                    <div key={code} className="flex items-center gap-2">
                      <Checkbox
                        id={`finance-${code}`}
                        checked={financeTypeFilter.includes(code)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setFinanceTypeFilter([...financeTypeFilter, code])
                          } else {
                            setFinanceTypeFilter(financeTypeFilter.filter(t => t !== code))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`finance-${code}`}
                        className="flex items-center gap-2 text-sm cursor-pointer font-normal"
                        title={FINANCE_TYPE_OPTIONS[code] || code}
                      >
                        <span className="truncate max-w-[120px]">{FINANCE_TYPE_OPTIONS[code] || code}</span>
                        <span className="text-gray-400">({count})</span>
                      </Label>
                    </div>
                  ))}
                  {availableOptions.financeTypes.length === 0 && (
                    <span className="text-sm text-gray-400">No finance types available</span>
                  )}
                </div>
              </div>

              {/* Transactions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Transactions
                </Label>
                <div className="flex flex-col gap-2">
                  {(['all', 'has', 'none'] as const).map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                        id={`tx-${opt}`}
                        checked={transactionFilter === opt}
                        onCheckedChange={() => {
                          // Toggle: clicking already-selected option reverts to 'all'
                          setTransactionFilter(transactionFilter === opt ? 'all' : opt)
                        }}
                      />
                      <Label
                        htmlFor={`tx-${opt}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {opt === 'all' ? 'All Activities' : opt === 'has' ? 'Has Transactions' : 'No Transactions'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budgets */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Budgets
                </Label>
                <div className="flex flex-col gap-2">
                  {(['all', 'has', 'none'] as const).map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                        id={`budget-${opt}`}
                        checked={budgetFilter === opt}
                        onCheckedChange={() => {
                          // Toggle: clicking already-selected option reverts to 'all'
                          setBudgetFilter(budgetFilter === opt ? 'all' : opt)
                        }}
                      />
                      <Label
                        htmlFor={`budget-${opt}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {opt === 'all' ? 'All Activities' : opt === 'has' ? 'Has Budgets' : 'No Budgets'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope (National/Regional) */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Scope
                </Label>
                <div className="flex flex-col gap-2">
                  {(['all', 'National', 'Regional', 'Unknown'] as const).map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                        id={`scope-${opt}`}
                        checked={scopeFilter === opt}
                        onCheckedChange={() => {
                          setScopeFilter(scopeFilter === opt ? 'all' : opt)
                        }}
                      />
                      <Label
                        htmlFor={`scope-${opt}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {opt === 'all' ? 'All Activities' : opt}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Planned Disbursements */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Planned Disbursements
                </Label>
                <div className="flex flex-col gap-2">
                  {(['all', 'has', 'none'] as const).map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                        id={`pd-${opt}`}
                        checked={plannedDisbursementFilter === opt}
                        onCheckedChange={() => {
                          // Toggle: clicking already-selected option reverts to 'all'
                          setPlannedDisbursementFilter(plannedDisbursementFilter === opt ? 'all' : opt)
                        }}
                      />
                      <Label
                        htmlFor={`pd-${opt}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {opt === 'all' ? 'All Activities' : opt === 'has' ? 'Has Planned Disbursements' : 'No Planned Disbursements'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Button */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              {activeFilterCount > 0 ? (
                <span className="text-sm text-gray-600">
                  Showing <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-gray-700">{filteredActivities.length}</span> of <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-gray-700">{activities.length}</span> activities
                </span>
              ) : (
                <span />
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{selectedIds.size}</span> of{' '}
          <span className="font-semibold">{activities.length}</span> activities selected for import
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_200px_80px_100px_120px_80px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div />
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('id')}>
              Activity Title and IATI Identifier {sortField === 'id' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('title')}>
              Planned Start/End Dates
            </button>
            <div className="text-center">Scope</div>
            <button className="text-right hover:text-gray-700" onClick={() => toggleSort('transactions')}>
              Transactions {sortField === 'transactions' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-right hover:text-gray-700 w-full" onClick={() => toggleSort('budget')}>
              Budgets {sortField === 'budget' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-center hover:text-gray-700" onClick={() => toggleSort('status')}>
              Status {sortField === 'status' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>

          {/* Table Body */}
          <ScrollArea className="h-[440px]">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activities match your filters</div>
            ) : (
              filteredActivities.map((activity) => {
                const isExpanded = expandedRow === activity.iatiIdentifier
                const hasErrors = activity.validationIssues?.some(i => i.severity === 'error')
                const hasWarnings = activity.validationIssues?.some(i => i.severity === 'warning')

                return (
                  <div key={activity.iatiIdentifier} className="border-b last:border-b-0">
                    <div className="grid grid-cols-[40px_1fr_200px_80px_100px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-gray-50">
                      <Checkbox
                        checked={selectedIds.has(activity.iatiIdentifier)}
                        onCheckedChange={() => toggleSelection(activity.iatiIdentifier)}
                      />
                      <div
                        className="cursor-pointer min-w-0"
                        onClick={() => setExpandedRow(isExpanded ? null : activity.iatiIdentifier)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          <div className="min-w-0 group/activity">
                            <p className="font-medium text-sm flex items-center gap-1 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                {activity.title || 'Untitled'}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(activity.title || '')
                                    toast.success('Title copied')
                                  }}
                                  className="opacity-0 group-hover/activity:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                                  title="Copy title"
                                >
                                  <Copy className="h-3 w-3 text-gray-400" />
                                </button>
                              </span>
                              {' '}
                              <span className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground font-normal whitespace-nowrap">
                                {activity.iatiIdentifier}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(activity.iatiIdentifier)
                                    toast.success('IATI ID copied')
                                  }}
                                  className="opacity-0 group-hover/activity:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                                  title="Copy IATI ID"
                                >
                                  <Copy className="h-3 w-3 text-gray-400" />
                                </button>
                              </span>
                              {activity.matched && (
                                <span title="Exists in database" className="inline-flex ml-0.5 align-middle"><Database className="h-3 w-3 text-gray-400" /></span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const formatDate = (dateStr: string) => {
                            const d = new Date(dateStr)
                            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          }
                          return (
                            <>
                              {activity.planned_start_date && (
                                <span>{formatDate(activity.planned_start_date)}</span>
                              )}
                              {activity.planned_start_date && activity.planned_end_date && ' → '}
                              {activity.planned_end_date && (
                                <span>{formatDate(activity.planned_end_date)}</span>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      <div className="text-center text-xs text-gray-600">
                        {classifyScope(activity, filterCountry) === 'Unknown' ? '-' : classifyScope(activity, filterCountry)}
                      </div>
                      <div className="text-right text-sm">
                        {(activity.transactions || []).length}
                      </div>
                      <div className="text-right text-sm">
                        {(activity.budgets || []).length || '-'}
                      </div>
                      <div className="text-center">
                        {hasErrors ? (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Row Detail */}
                    {isExpanded && (
                      <div className="px-12 py-4 bg-gray-50 border-t text-sm">
                        {/* Description - full width */}
                        {activity.description && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Description</span>
                            <p className="text-gray-600 mt-1">{activity.description}</p>
                          </div>
                        )}

                        {activity.lastUpdatedDatetime && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                            <Clock className="h-3 w-3" />
                            Last updated: {new Date(activity.lastUpdatedDatetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}

                        {/* 3 column grid */}
                        <div className="grid grid-cols-3 gap-6">
                          {/* Column 1: Dates, Status, Hierarchy */}
                          <div className="space-y-3">
                            {(activity.status || activity.activity_status) && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Status</span>
                                <p className="text-gray-600 mt-0.5">
                                  {(() => {
                                    const statusCode = activity.status || activity.activity_status
                                    const statusNames: Record<string, string> = {
                                      '1': 'Pipeline/Identification',
                                      '2': 'Implementation',
                                      '3': 'Finalisation',
                                      '4': 'Closed',
                                      '5': 'Cancelled',
                                      '6': 'Suspended',
                                    }
                                    return (
                                      <>
                                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{statusCode}</span>
                                        {statusNames[statusCode || ''] || statusCode}
                                      </>
                                    )
                                  })()}
                                </p>
                              </div>
                            )}

                            {activity.hierarchy != null && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Hierarchy Level</span>
                                <p className="text-gray-600 mt-0.5">
                                  {(() => {
                                    const hierarchyNames: Record<number, string> = {
                                      1: 'Parent',
                                      2: 'Sub-Activity',
                                    }
                                    return (
                                      <>
                                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{activity.hierarchy}</span>
                                        {hierarchyNames[activity.hierarchy] || `Level ${activity.hierarchy}`}
                                      </>
                                    )
                                  })()}
                                </p>
                              </div>
                            )}

                            {activity.otherIdentifiers && activity.otherIdentifiers.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Hash className="h-3 w-3" /> Other Identifiers
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <tbody>
                                    {activity.otherIdentifiers.map((oi, i) => {
                                      const oiTypeNames: Record<string, string> = {
                                        'A1': 'Reporting Org Internal',
                                        'A2': 'CRS Activity ID',
                                        'A3': 'Previous Activity ID',
                                        'A9': 'Other',
                                        'B1': 'Previous Donor ID',
                                        'B9': 'Other',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{oi.type}</span>
                                            {oiTypeNames[oi.type] || ''}
                                          </td>
                                          <td className="py-1 text-gray-600">
                                            <span className="font-mono text-xs">{oi.ref}</span>
                                            {(oi.ownerOrgRef || oi.ownerOrgNarrative) && (
                                              <p className="text-gray-400 text-[10px] mt-0.5">
                                                Owner: {oi.ownerOrgNarrative || oi.ownerOrgRef}
                                              </p>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* DAC/CRS Classification Fields */}
                            {(activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus) && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Classification</span>
                                <table className="mt-1 w-full text-xs">
                                  <tbody>
                                    {activity.collaborationType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Collaboration Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.collaborationType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '1': 'Bilateral', '2': 'Multilateral (inflows)', '3': 'Bilateral, core contributions', '4': 'Multilateral outflows', '6': 'Private sector outflows', '7': 'Bilateral, ex-post reporting', '8': 'Bilateral, triangular co-operation' }
                                            return names[activity.collaborationType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultAidType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Aid Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.defaultAidType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { 'A01': 'General budget support', 'A02': 'Sector budget support', 'B01': 'Core support to NGOs', 'B02': 'Core contributions to multilaterals', 'B03': 'Contributions to specific programmes', 'B04': 'Basket funds', 'C01': 'Project-type interventions', 'D01': 'Donor country personnel', 'D02': 'Other technical assistance', 'E01': 'Scholarships in donor country', 'E02': 'Imputed student costs', 'F01': 'Debt relief', 'G01': 'Administrative costs', 'H01': 'Development awareness', 'H02': 'Refugees in donor countries' }
                                            return names[activity.defaultAidType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultFinanceType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Finance Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.defaultFinanceType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '110': 'Standard grant', '111': 'Subsidies to national private investors', '210': 'Interest subsidy', '211': 'Interest subsidy to national private exporters', '310': 'Capital subscription on deposit basis', '311': 'Capital subscription on encashment basis', '410': 'Aid loan excluding debt reorganisation', '411': 'Investment-related loan to developing country', '412': 'Loan in donor country currency', '413': 'Loan with concession for interest', '414': 'Loan with concession for principal', '421': 'Standard loan', '422': 'Reimbursable grant', '423': 'Bonds', '424': 'Asset-backed securities', '425': 'Other debt securities', '431': 'Subordinated loan', '432': 'Preferred equity', '433': 'Other hybrid instruments', '451': 'Non-banks guaranteed export credits', '452': 'Non-banks non-guaranteed portions', '453': 'Bank export credits', '510': 'Common equity', '511': 'Acquisition of equity not part of joint venture', '512': 'Other acquisition of equity', '520': 'Shares in collective investment vehicles', '530': 'Reinvested earnings', '610': 'Debt forgiveness', '611': 'Debt conversion', '612': 'Debt rescheduling', '613': 'Debt buyback', '614': 'Other debt reduction', '615': 'Debt payment', '616': 'HIPC debt relief', '617': 'Multilateral debt relief', '618': 'Forgiveness of arrears' }
                                            return names[activity.defaultFinanceType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultFlowType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Flow Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.defaultFlowType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '10': 'ODA', '20': 'OOF', '21': 'Non-export credit OOF', '22': 'Officially supported export credits', '30': 'Private grants', '35': 'Private market', '36': 'Private FDI', '37': 'Other private flows at market terms', '40': 'Non flow', '50': 'Other flows' }
                                            return names[activity.defaultFlowType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultTiedStatus && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Tied Status</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.defaultTiedStatus}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '3': 'Partially tied', '4': 'Tied', '5': 'Untied' }
                                            return names[activity.defaultTiedStatus] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.capitalSpend != null && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Capital Spend</span>
                                <p className="text-gray-600 mt-0.5">
                                  <span className="font-semibold">{activity.capitalSpend}%</span>
                                </p>
                              </div>
                            )}

                            {activity.actual_start_date && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Actual Start
                                </span>
                                <p className="text-gray-600 mt-0.5">
                                  {new Date(activity.actual_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}

                            {activity.actual_end_date && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Actual End
                                </span>
                                <p className="text-gray-600 mt-0.5">
                                  {new Date(activity.actual_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}

                            {activity.recipientCountries && activity.recipientCountries.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> Recipient Countries
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Country</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...activity.recipientCountries]
                                      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                                      .map((c, i) => {
                                        const countryName = IATI_COUNTRIES.find(ic => ic.code === c.code)?.name || c.code
                                        const isHomeCountry = c.code === homeCountry
                                        return (
                                          <tr key={i} className={`border-t border-gray-100 ${isHomeCountry ? 'font-semibold' : ''}`}>
                                            <td className={`py-1 ${isHomeCountry ? 'text-gray-900' : 'text-gray-600'}`}>
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{c.code}</span>
                                              {countryName}
                                            </td>
                                            <td className={`py-1 text-right ${isHomeCountry ? 'text-gray-900' : ''}`}>{c.percentage != null ? `${c.percentage}%` : '-'}</td>
                                          </tr>
                                        )
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.recipientRegions && activity.recipientRegions.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> Recipient Regions
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Region</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.recipientRegions.map((r, i) => {
                                      const regionNames: Record<string, string> = {
                                        '88': 'States Ex-Yugoslavia',
                                        '89': 'Europe, regional',
                                        '189': 'North of Sahara, regional',
                                        '289': 'South of Sahara, regional',
                                        '298': 'Africa, regional',
                                        '380': 'West Indies, regional',
                                        '389': 'N. & Central America, regional',
                                        '489': 'South America, regional',
                                        '498': 'America, regional',
                                        '589': 'Middle East, regional',
                                        '619': 'Central Asia, regional',
                                        '679': 'South Asia, regional',
                                        '689': 'South & Central Asia, regional',
                                        '789': 'Far East Asia, regional',
                                        '798': 'Asia, regional',
                                        '889': 'Oceania, regional',
                                        '998': 'Developing countries, unspecified',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            {r.vocabulary && r.vocabulary !== '1' && (
                                              <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">V{r.vocabulary}</span>
                                            )}
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{r.code}</span>
                                            {regionNames[r.code] || r.code}
                                          </td>
                                          <td className="py-1 text-right">{r.percentage != null ? `${r.percentage}%` : '-'}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.locations && activity.locations.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> Locations
                                </span>
                                <div className="mt-1 space-y-1">
                                  {activity.locations.slice(0, 3).map((loc, i) => (
                                    <p key={i} className="text-xs text-gray-600">
                                      {loc.name || 'Unnamed'}
                                      {loc.coordinates && (
                                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground ml-1.5">
                                          {loc.coordinates.latitude.toFixed(2)}, {loc.coordinates.longitude.toFixed(2)}
                                        </span>
                                      )}
                                    </p>
                                  ))}
                                  {activity.locations.length > 3 && (
                                    <p className="text-xs text-gray-500">+ {activity.locations.length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Organizations, Sectors */}
                          <div className="space-y-3">
                            {activity.participatingOrgs && activity.participatingOrgs.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Organizations</span>
                                <table className="mt-1 w-full text-xs">
                                  <tbody>
                                    {activity.participatingOrgs.map((org, i) => {
                                      const roleNames: Record<string, string> = {
                                        '1': 'Funding',
                                        '2': 'Accountable',
                                        '3': 'Extending',
                                        '4': 'Implementing',
                                      }
                                      const orgTypeNames: Record<string, string> = {
                                        '10': 'Government',
                                        '15': 'Other Public Sector',
                                        '21': 'International NGO',
                                        '22': 'National NGO',
                                        '23': 'Regional NGO',
                                        '30': 'Public Private Partnership',
                                        '40': 'Multilateral',
                                        '60': 'Foundation',
                                        '70': 'Private Sector',
                                        '80': 'Academic/Training/Research',
                                        '90': 'Other',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{org.role}</span>
                                            {roleNames[org.role] || org.role}
                                          </td>
                                          <td className="py-1 text-gray-600">
                                            {org.type ? (
                                              <>
                                                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{org.type}</span>
                                                {orgTypeNames[org.type] || ''}
                                              </>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-gray-600">{org.name}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.sectors && activity.sectors.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Sectors</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Sector</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.sectors.map((s, i) => {
                                      const vocabNames: Record<string, string> = {
                                        '1': 'DAC 5',
                                        '2': 'DAC 3',
                                        '3': 'COFOG',
                                        '7': 'SDG Goal',
                                        '8': 'SDG Target',
                                        '9': 'SDG Indicator',
                                        '99': 'ORG',
                                      }
                                      const vocabLabel = s.vocabulary ? vocabNames[s.vocabulary] || `V${s.vocabulary}` : ''
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            {vocabLabel && (
                                              <>
                                                <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono text-[10px]">{vocabLabel}</span>
                                                {' '}
                                              </>
                                            )}
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{s.code}</span>
                                            {' '}
                                            {s.name || s.code}
                                          </td>
                                          <td className="py-1 text-right">{s.percentage != null ? `${s.percentage}%` : '-'}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.relatedActivities && activity.relatedActivities.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Link2 className="h-3 w-3" /> Related Activities
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Type</th>
                                      <th className="font-medium py-1">Identifier</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.relatedActivities.map((ra, i) => {
                                      const raTypeNames: Record<string, string> = {
                                        '1': 'Parent',
                                        '2': 'Child',
                                        '3': 'Sibling',
                                        '4': 'Co-funded',
                                        '5': 'Third Party',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{ra.type}</span>
                                            {raTypeNames[ra.type] || ''}
                                          </td>
                                          <td className="py-1 text-gray-600 font-mono text-xs">{ra.ref}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {(activity.conditionsAttached != null || (activity.conditions && activity.conditions.length > 0)) && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <ListChecks className="h-3 w-3" /> Conditions
                                </span>
                                {activity.conditionsAttached != null && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Conditions attached: <span className="font-medium">{activity.conditionsAttached ? 'Yes' : 'No'}</span>
                                  </p>
                                )}
                                {activity.conditions && activity.conditions.length > 0 && (
                                  <table className="mt-1 w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="font-medium py-1">Type</th>
                                        <th className="font-medium py-1">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activity.conditions.map((c, i) => {
                                        const condTypeNames: Record<string, string> = {
                                          '1': 'Policy',
                                          '2': 'Performance',
                                          '3': 'Fiduciary',
                                        }
                                        return (
                                          <tr key={i} className="border-t border-gray-100">
                                            <td className="py-1 text-gray-600">
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{c.type}</span>
                                              {condTypeNames[c.type] || ''}
                                            </td>
                                            <td className="py-1 text-gray-600">{c.narrative || '-'}</td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Column 3: Transactions, Budgets */}
                          <div className="space-y-3">
                            {activity.transactions && activity.transactions.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Transactions</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Type</th>
                                      <th className="font-medium py-1 text-center">Country</th>
                                      <th className="font-medium py-1 text-center">Region</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.transactions.slice(0, 5).map((tx, i) => {
                                      const txTypeNames: Record<string, string> = {
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
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{tx.type}</span>
                                            {txTypeNames[tx.type] || tx.type}
                                          </td>
                                          <td className="py-1 text-center">
                                            {tx.recipientCountryCode ? <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{tx.recipientCountryCode}</span> : <span className="text-gray-300">-</span>}
                                          </td>
                                          <td className="py-1 text-center">
                                            {tx.recipientRegionCode ? <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{tx.recipientRegionCode}</span> : <span className="text-gray-300">-</span>}
                                          </td>
                                          <td className="py-1 text-right font-medium"><span className="text-xs text-gray-400 mr-0.5">{tx.currency}</span>{tx.value?.toLocaleString()}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.transactions.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.transactions.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {activity.budgets && activity.budgets.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Wallet className="h-3 w-3" /> Budgets
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Period</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.budgets.slice(0, 5).map((b, i) => (
                                      <tr key={i} className="border-t border-gray-100">
                                        <td className="py-1 text-gray-600">
                                          {b.periodStart && new Date(b.periodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                          {b.periodStart && b.periodEnd && ' - '}
                                          {b.periodEnd && new Date(b.periodEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-1 text-right font-medium">{b.currency} {b.value?.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {activity.budgets.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.budgets.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {activity.plannedDisbursements && activity.plannedDisbursements.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Planned Disbursements</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Period</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.plannedDisbursements.slice(0, 5).map((pd, i) => {
                                      const pdTypeNames: Record<string, string> = {
                                        '1': 'Original',
                                        '2': 'Revised',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            {pd.type && (
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5" title={pdTypeNames[pd.type] || pd.type}>
                                                {pdTypeNames[pd.type] || pd.type}
                                              </span>
                                            )}
                                            {pd.periodStart && new Date(pd.periodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                            {pd.periodStart && pd.periodEnd && ' - '}
                                            {pd.periodEnd && new Date(pd.periodEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                          </td>
                                          <td className="py-1 text-right font-medium">{pd.currency} {pd.value?.toLocaleString()}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.plannedDisbursements.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.plannedDisbursements.length - 5} more</p>
                                )}
                              </div>
                            )}
                            {activity.countryBudgetItems && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Country Budget Items</span>
                                {activity.countryBudgetItems.vocabulary && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Vocabulary: <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.countryBudgetItems.vocabulary}</span>
                                  </p>
                                )}
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Code</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.countryBudgetItems.items.map((item, i) => (
                                      <tr key={i} className="border-t border-gray-100">
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{item.code}</span>
                                          {item.description && <span className="ml-1.5">{item.description}</span>}
                                        </td>
                                        <td className="py-1 text-right">{item.percentage != null ? `${item.percentage}%` : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contacts and Documents - 2 column grid below main grid */}
                        {((activity.contacts && activity.contacts.length > 0) || (activity.documents && activity.documents.length > 0)) && (
                          <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                            {/* Contacts */}
                            {activity.contacts && activity.contacts.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <User className="h-3 w-3" /> Contacts
                                </span>
                                <div className="mt-1 space-y-3">
                                  {activity.contacts.slice(0, 5).map((contact, i) => {
                                    const contactTypeNames: Record<string, string> = {
                                      '1': 'General Enquiries',
                                      '2': 'Project Management',
                                      '3': 'Financial Management',
                                      '4': 'Communications',
                                    }
                                    return (
                                      <table key={i} className="w-full text-xs border border-gray-100 rounded">
                                        <tbody>
                                          <tr className="border-b border-gray-100">
                                            <td className="py-1.5 px-2 text-gray-500 w-20 bg-gray-50">Type</td>
                                            <td className="py-1.5 px-2 text-gray-600">
                                              {contact.type ? (
                                                <>
                                                  <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{contact.type}</span>
                                                  {' '}
                                                  <span className="text-gray-500">{contactTypeNames[contact.type] || ''}</span>
                                                </>
                                              ) : (
                                                <span className="text-gray-400">-</span>
                                              )}
                                            </td>
                                          </tr>
                                          <tr className="border-b border-gray-100">
                                            <td className="py-1.5 px-2 text-gray-500 bg-gray-50">Org</td>
                                            <td className="py-1.5 px-2 text-gray-600">
                                              {contact.organisationName || contact.departmentName ? (
                                                <>
                                                  {contact.organisationName && <span className="font-medium">{contact.organisationName}</span>}
                                                  {contact.organisationName && contact.departmentName && ' · '}
                                                  {contact.departmentName && <span className="text-gray-500">{contact.departmentName}</span>}
                                                </>
                                              ) : (
                                                <span className="text-gray-400">-</span>
                                              )}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td className="py-1.5 px-2 text-gray-500 bg-gray-50 align-top">Contact</td>
                                            <td className="py-1.5 px-2 text-gray-600">
                                              <div className="space-y-0.5">
                                                {contact.personName && <p className="font-medium">{contact.personName}</p>}
                                                {contact.jobTitle && <p className="text-gray-500">{contact.jobTitle}</p>}
                                                {contact.email && (
                                                  <p>
                                                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                                                  </p>
                                                )}
                                                {contact.telephone && <p className="text-gray-500">{contact.telephone}</p>}
                                                {contact.website && (
                                                  <p>
                                                    <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                      {contact.website.replace(/^https?:\/\//, '')}
                                                    </a>
                                                  </p>
                                                )}
                                                {!contact.personName && !contact.email && !contact.telephone && !contact.website && (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    )
                                  })}
                                </div>
                                {activity.contacts.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.contacts.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {/* Documents */}
                            {activity.documents && activity.documents.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Documents
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Category</th>
                                      <th className="font-medium py-1">Title</th>
                                      <th className="font-medium py-1">Format</th>
                                      <th className="font-medium py-1 w-8"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.documents.slice(0, 5).map((doc, i) => {
                                      const docCategoryNames: Record<string, string> = {
                                        'A01': 'Pre/Post-Project Assessment',
                                        'A02': 'Objectives/Purposes',
                                        'A03': 'Intended Beneficiaries',
                                        'A04': 'Conditions',
                                        'A05': 'Budget',
                                        'A06': 'Summary Information',
                                        'A07': 'Review of Project Performance',
                                        'A08': 'Results/Outcomes',
                                        'A09': 'Memorandum of Understanding',
                                        'A10': 'Tender',
                                        'A11': 'Contract',
                                        'A12': 'Activity Web Page',
                                        'B01': 'Annual Report',
                                        'B02': 'Strategy Paper',
                                        'B03': 'Country Strategy Paper',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1.5 text-gray-600 align-top">
                                            {doc.categoryCode ? (
                                              <>
                                                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{doc.categoryCode}</span>
                                                <p className="text-gray-500 mt-0.5">{docCategoryNames[doc.categoryCode] || ''}</p>
                                              </>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-gray-600 align-top">
                                            <p className="font-medium">{doc.title || 'Untitled'}</p>
                                            {doc.documentDate && (
                                              <p className="text-gray-400 text-[10px]">
                                                {new Date(doc.documentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </p>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-gray-500 align-top">
                                            {doc.format && (
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                                                {doc.format.replace('application/', '').replace('text/', '').toUpperCase()}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 align-top">
                                            <a
                                              href={doc.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                              title="Open document"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.documents.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.documents.length - 5} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* New IATI Fields: Humanitarian, Scope, Policy Markers, Humanitarian Scope, Tags */}
                        {(activity.humanitarian || activity.activityScope || activity.language ||
                          (activity.policyMarkers && activity.policyMarkers.length > 0) ||
                          (activity.humanitarianScopes && activity.humanitarianScopes.length > 0) ||
                          (activity.tags && activity.tags.length > 0)) && (
                          <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                            {/* Column 1: Flags, Scope & Policy Markers */}
                            <div className="space-y-3">
                              {activity.humanitarian && (
                                <div>
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Humanitarian
                                  </Badge>
                                </div>
                              )}

                              {activity.activityScope && (
                                <div>
                                  <span className="font-medium text-gray-700 text-xs uppercase">Activity Scope</span>
                                  <p className="text-gray-600 mt-0.5">
                                    <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1.5">{activity.activityScope}</span>
                                    {(() => {
                                      const scopeNames: Record<string, string> = {
                                        '1': 'Global', '2': 'Regional', '3': 'Multi-national',
                                        '4': 'National', '5': 'Sub-national: Multi-first-level',
                                        '6': 'Sub-national: Single first-level', '7': 'Sub-national: Multi-second-level',
                                        '8': 'Single location',
                                      }
                                      return scopeNames[activity.activityScope!] || ''
                                    })()}
                                  </p>
                                </div>
                              )}

                              {activity.language && (
                                <div>
                                  <span className="font-medium text-gray-700 text-xs uppercase">Language</span>
                                  <p className="text-gray-600 mt-0.5">
                                    <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.language}</span>
                                  </p>
                                </div>
                              )}

                              {activity.policyMarkers && activity.policyMarkers.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Policy Markers
                                  </span>
                                  <table className="mt-1 w-full text-xs">
                                    <tbody>
                                      {activity.policyMarkers.map((pm, i) => {
                                        const markerNames: Record<string, string> = {
                                          '1': 'Gender Equality', '2': 'Aid to Environment',
                                          '3': 'PD/GG', '4': 'Trade Development',
                                          '5': 'Biodiversity', '6': 'Climate Mitigation',
                                          '7': 'Climate Adaptation', '8': 'Desertification',
                                          '9': 'Disability', '10': 'Nutrition',
                                        }
                                        const sigNames: Record<number, string> = {
                                          0: 'Not targeted', 1: 'Significant', 2: 'Principal', 3: 'Explicit primary',
                                        }
                                        return (
                                          <tr key={i} className="border-t border-gray-100">
                                            <td className="py-1 text-gray-600">
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{pm.code}</span>
                                              {pm.narrative || markerNames[pm.code] || ''}
                                            </td>
                                            <td className="py-1 text-right">
                                              {pm.significance != null ? (
                                                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground" title={sigNames[pm.significance] || ''}>
                                                  {sigNames[pm.significance] || pm.significance}
                                                </span>
                                              ) : '-'}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Column 2: Humanitarian Scope + Tags */}
                            <div className="space-y-3">
                              {activity.humanitarianScopes && activity.humanitarianScopes.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                    <Heart className="h-3 w-3" /> Humanitarian Scope
                                  </span>
                                  <div className="mt-1 space-y-1">
                                    {activity.humanitarianScopes.map((hs, i) => {
                                      const typeNames: Record<string, string> = { '1': 'Emergency', '2': 'Appeal' }
                                      return (
                                        <div key={i} className="text-xs text-gray-600">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground mr-1">{typeNames[hs.type] || hs.type}</span>
                                          <span className="font-mono">{hs.code}</span>
                                          {hs.narrative && <span className="ml-1 text-gray-500">{hs.narrative}</span>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {activity.tags && activity.tags.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> Tags / SDGs
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {activity.tags.map((tag, i) => {
                                      const vocabLabels: Record<string, string> = {
                                        '1': 'OECD', '2': 'SDG Goal', '3': 'SDG Target', '99': 'Custom',
                                      }
                                      return (
                                        <Badge key={i} variant="outline" className="text-xs font-normal">
                                          {tag.vocabulary && tag.vocabulary !== '99' && (
                                            <span className="text-gray-400 mr-1">{vocabLabels[tag.vocabulary] || `V${tag.vocabulary}`}:</span>
                                          )}
                                          {tag.narrative || tag.code}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* FSS and CRS Additional Data */}
                        {(activity.fss || activity.crsAdd) && (
                          <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                            {/* FSS */}
                            {activity.fss && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" /> Forward Spending Survey
                                </span>
                                <div className="mt-1 space-y-1 text-xs text-gray-600">
                                  {activity.fss.extractionDate && <p>Extraction date: {activity.fss.extractionDate}</p>}
                                  {activity.fss.priority != null && <p>Priority: {activity.fss.priority}</p>}
                                  {activity.fss.phaseoutYear != null && <p>Phaseout year: {activity.fss.phaseoutYear}</p>}
                                </div>
                                {activity.fss.forecasts.length > 0 && (
                                  <table className="mt-1 w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="font-medium py-1">Year</th>
                                        <th className="font-medium py-1 text-right">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activity.fss.forecasts.map((f, i) => (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">{f.year}</td>
                                          <td className="py-1 text-right font-medium">{f.currency || 'USD'} {f.value?.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}

                            {/* CRS Add */}
                            {activity.crsAdd && (
                              <div className="space-y-3">
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Landmark className="h-3 w-3" /> CRS Additional
                                </span>

                                {activity.crsAdd.otherFlags && activity.crsAdd.otherFlags.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Other Flags</p>
                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                      {activity.crsAdd.otherFlags.map((f, i) => {
                                        const flagNames: Record<string, string> = {
                                          '1': 'Free standing TC',
                                          '2': 'Programme-based approach',
                                          '3': 'Investment project',
                                          '4': 'Associated financing',
                                        }
                                        return (
                                          <Badge key={i} variant="outline" className="text-xs font-normal">
                                            <span className="font-mono mr-1">{f.code}</span>
                                            {flagNames[f.code] || ''}
                                            {f.significance && <span className="text-gray-400 ml-1">sig: {f.significance}</span>}
                                          </Badge>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {activity.crsAdd.loanTerms && (
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Loan Terms</p>
                                    <table className="mt-0.5 w-full text-xs">
                                      <tbody>
                                        {activity.crsAdd.loanTerms.rate1 != null && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500 w-28">Rate 1</td>
                                            <td className="py-1 text-gray-600">{activity.crsAdd.loanTerms.rate1}%</td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.rate2 != null && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">Rate 2</td>
                                            <td className="py-1 text-gray-600">{activity.crsAdd.loanTerms.rate2}%</td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.repaymentType && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">Repayment Type</td>
                                            <td className="py-1 text-gray-600">
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.crsAdd.loanTerms.repaymentType}</span>
                                            </td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.repaymentPlan && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">Repayment Plan</td>
                                            <td className="py-1 text-gray-600">
                                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{activity.crsAdd.loanTerms.repaymentPlan}</span>
                                            </td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.commitmentDate && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">Commitment Date</td>
                                            <td className="py-1 text-gray-600">{activity.crsAdd.loanTerms.commitmentDate}</td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.repaymentFirstDate && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">First Repayment</td>
                                            <td className="py-1 text-gray-600">{activity.crsAdd.loanTerms.repaymentFirstDate}</td>
                                          </tr>
                                        )}
                                        {activity.crsAdd.loanTerms.repaymentFinalDate && (
                                          <tr className="border-t border-gray-100">
                                            <td className="py-1 text-gray-500">Final Repayment</td>
                                            <td className="py-1 text-gray-600">{activity.crsAdd.loanTerms.repaymentFinalDate}</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {activity.crsAdd.loanStatus && activity.crsAdd.loanStatus.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Loan Status</p>
                                    <table className="mt-0.5 w-full text-xs">
                                      <thead>
                                        <tr className="text-left text-gray-500">
                                          <th className="font-medium py-1">Year</th>
                                          <th className="font-medium py-1 text-right">Principal</th>
                                          <th className="font-medium py-1 text-right">Interest</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {activity.crsAdd.loanStatus.map((ls, i) => (
                                          <tr key={i} className="border-t border-gray-100">
                                            <td className="py-1 text-gray-600">{ls.year}</td>
                                            <td className="py-1 text-right text-gray-600">
                                              {ls.principalOutstanding != null ? `${ls.currency || 'USD'} ${ls.principalOutstanding.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-1 text-right text-gray-600">
                                              {ls.interestReceived != null ? `${ls.currency || 'USD'} ${ls.interestReceived.toLocaleString()}` : '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Validation Issues - full width below grid */}
                        {activity.validationIssues && activity.validationIssues.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <span className="font-medium text-gray-700 text-xs uppercase">Validation Issues</span>
                            <div className="mt-1 space-y-1">
                              {activity.validationIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  {issue.severity === 'error' ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                                  ) : issue.severity === 'warning' ? (
                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  )}
                                  <span>[{issue.field}] {issue.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
