"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, CalendarIcon, ChevronDown, Download, BarChart3, LineChart as LineChartIcon, TrendingUp, Table as TableIcon, Layers as LayersIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS, getTransactionTypeColor, getFinancialSeriesColor, BUDGET_COLOR, PLANNED_DISBURSEMENT_COLOR, OTHERS_COLOR } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import financeTypesData from '@/data/finance-types.json'
import aidTypesData from '@/data/aid-types.json'
// Brand color palette - 5 distinct colors, no duplicates
const BRAND_PALETTE = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
} as const

import { CustomYear, getCustomYearRange, getCustomYearLabel, crossesCalendarYear, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { format, parseISO } from 'date-fns'
import {
  splitBudgetAcrossYears,
  splitPlannedDisbursementAcrossYears,
  splitTransactionAcrossYears,
  allocateAcrossFiscalYears,
  getFiscalYearForDate,
  type FiscalYearAllocation
} from '@/utils/year-allocation'

// Transaction type mapping (IATI Standard v2.03) — plural forms for chart labels.
const TRANSACTION_TYPES: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitments',
  '3': 'Disbursements',
  '4': 'Expenditures',
  '5': 'Interest Payments',
  '6': 'Loan Repayments',
  '7': 'Reimbursements',
  '8': 'Purchases of Equity',
  '9': 'Sales of Equity',
  '10': 'Credit Guarantees',
  '11': 'Incoming Commitments',
  '12': 'Outgoing Pledges',
  '13': 'Incoming Pledges',
}

// Reverse map: plural display name → IATI code, so transaction-type colours
// resolve through the single source of truth in @/lib/chart-colors and stay
// consistent with every other chart in the app.
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(TRANSACTION_TYPES).map(([code, name]) => [name, code])
)

// Deterministic colour for a data key. Budgets / Planned Disbursements use
// their canonical brand constants; transaction types resolve by IATI code;
// any other label falls back to the shared financial-series resolver.
// Colours no longer depend on series order, so the trailing args are unused
// (kept only for call-site signature compatibility).
function getColorForKey(key: string, _activeKeys?: string[], _index?: number): string {
  if (key === 'Budgets') return BUDGET_COLOR
  if (key === 'Planned Disbursements') return PLANNED_DISBURSEMENT_COLOR
  const code = NAME_TO_CODE[key]
  if (code) return getTransactionTypeColor(code)
  return getFinancialSeriesColor(key)
}

// --- Disaggregation (Finance Type / Aid Type / Donor) ----------------------

type DisaggregateMode = 'none' | 'finance_type' | 'aid_type' | 'donor'

const DISAGGREGATE_OPTIONS: { value: DisaggregateMode; label: string }[] = [
  { value: 'none', label: 'No disaggregation' },
  { value: 'finance_type', label: 'Finance Type' },
  { value: 'aid_type', label: 'Aid Type' },
  { value: 'donor', label: 'Donor' },
]

// Composite series key separator, e.g. "Disbursements — World Bank".
const DISAGG_SEP = ' — '
// Cap segments per transaction type so the chart stays legible; the long
// tail is merged into an "Other" segment.
const MAX_DISAGGREGATE_SEGMENTS = 12

// IATI Finance Type code → name (full OECD DAC codelist).
const FINANCE_TYPE_NAMES: Record<string, string> = Object.fromEntries(
  (financeTypesData as Array<{ code: string; name: string }>).map(f => [String(f.code), f.name])
)

// IATI Aid Type code → name (flatten parent categories + children).
const AID_TYPE_NAMES: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  ;(aidTypesData as Array<{ code: string; name: string; children?: Array<{ code: string; name: string }> }>).forEach(a => {
    m[String(a.code)] = a.name
    ;(a.children || []).forEach(c => { m[String(c.code)] = c.name })
  })
  return m
})()

// Resolve a transaction's disaggregation-dimension label.
function getTxDimLabel(tx: any, mode: DisaggregateMode): string {
  if (mode === 'finance_type') {
    const c = tx.finance_type != null ? String(tx.finance_type) : ''
    return c ? (FINANCE_TYPE_NAMES[c] || `Finance type ${c}`) : 'Unspecified finance type'
  }
  if (mode === 'aid_type') {
    const c = tx.aid_type != null ? String(tx.aid_type) : ''
    return c ? (AID_TYPE_NAMES[c] || `Aid type ${c}`) : 'Unspecified aid type'
  }
  if (mode === 'donor') {
    const n = (tx.provider_org_name || '').trim()
    return n || 'Unattributed'
  }
  return ''
}

// stackId for a series key: composite sub-series of the same transaction type
// share a stack so each year shows one stacked bar per transaction type.
function disaggStackId(key: string, mode: DisaggregateMode): string | undefined {
  if (mode === 'none') return undefined
  if (key === 'Budgets' || key === 'Planned Disbursements') return undefined
  const idx = key.indexOf(DISAGG_SEP)
  return idx > 0 ? key.slice(0, idx) : undefined
}

// Safe SVG id from a series key (gradient defs) — strips whitespace and any
// non-alphanumerics so composite labels (em-dash, spaces) stay valid ids.
const sanitizeId = (k: string): string => k.replace(/[^a-zA-Z0-9]/g, '')

// --- Monochrome ramp for stacked disaggregation sub-series ------------------
// Each transaction type keeps its canonical hue; sub-series are shades of it
// (darkest = largest), echoing the app's "darker = more" ranked palette.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
// t: 0 = darkest (largest segment) … 1 = lightest (smallest segment).
function rampShade(baseHex: string, t: number): string {
  const base = hexToRgb(baseHex)
  const dark = mixRgb(base, [0, 0, 0], 0.35)
  const light = mixRgb(base, [255, 255, 255], 0.6)
  const [r, g, b] = mixRgb(dark, light, t)
  return rgbToHex(r, g, b)
}

// Generate list of available years
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

// `combo` renders Budgets + Planned Disbursements as filled areas and the
// selected transaction types as vertical bars on the same axis.
type ChartType = 'bar' | 'line' | 'area' | 'combo' | 'table'

interface FinancialTotalsBarChartProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
  compact?: boolean
  /** Restrict all three Supabase queries (budgets, planned disbursements,
   *  transactions) to records on this activity. */
  activityId?: string
  /** Restrict the three queries to records involving this org in any role:
   *  budgets / planned disbursements → activities reported by this org;
   *  transactions → provider OR receiver OR reporting-org of the activity. */
  organizationId?: string
  /** Opt-in: when the chart is rendered inside a flex-column parent that has
   *  an explicit height (e.g. the activity / org profile expanded modal), set
   *  this so the chart container uses `flex-1` and fills the available space.
   *  Other callers (analytics dashboard) leave this off and the chart falls
   *  back to a fixed `h-[500px]` so it doesn't collapse. */
  fillHeight?: boolean
}

// Postgrest URL-length cap when expanding `activity_id.in.(uuid,...)` —
// real orgs are unlikely to exceed this, but trim defensively.
const MAX_REPORTED_ACTIVITY_IDS = 1000

interface YearlyData {
  year: number
  displayYear: string
  Budgets: number
  'Planned Disbursements': number
  [key: string]: number | string
}

// Currency formatter for axis labels — delegate to shared helper.
const formatCurrency = formatAxisCurrency

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function FinancialTotalsBarChart({
  dateRange,
  refreshKey,
  compact = false,
  activityId,
  organizationId,
  fillHeight = false,
}: FinancialTotalsBarChartProps) {
  // activityId wins when both are passed — an activity belongs to one org and
  // mixing the filters produces nonsense.
  const effectiveActivityId = activityId
  const effectiveOrgId = activityId ? undefined : organizationId
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{
    budgets: any[]
    plannedDisbursements: any[]
    transactions: any[]
  } | null>(null)
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['3']) // Default to Disbursements
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [disaggregateBy, setDisaggregateBy] = useState<DisaggregateMode>('none')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Calendar type and year selection state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Calculate effective date range based on custom years and selected years
  const effectiveDateRange = useMemo(() => {
    const customYear = customYears.find(cy => cy.id === calendarType)

    if (customYears.length > 0 && selectedYears.length > 0 && calendarType && customYear) {
      const sortedYears = [...selectedYears].sort((a, b) => a - b)
      const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
      const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    if (actualDataRange && customYear) {
      const firstYearRange = getCustomYearRange(customYear, actualDataRange.minYear)
      const lastYearRange = getCustomYearRange(customYear, actualDataRange.maxYear)
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    const now = new Date()
    const from = new Date()
    from.setFullYear(now.getFullYear() - 5)
    return { from, to: now }
  }, [customYears, selectedYears, calendarType, actualDataRange])

  // Fetch custom years on mount
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await fetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          let selectedCalendar: CustomYear | undefined
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err)
      } finally {
        setCustomYearsLoading(false)
      }
    }
    fetchCustomYears()
  }, [])

  // Fetch actual date range from data
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!supabase) return

      try {
        // Resolve org filter into a list of activity ids reported by the org —
        // budgets / PDs only join through `activity_id`, so we pre-fetch the
        // list once and apply it to all three date-range queries below.
        let reportedActivityIds: string[] | null = null
        if (effectiveOrgId) {
          const { data: reportedActivities } = await supabase
            .from('activities')
            .select('id')
            .eq('reporting_org_id', effectiveOrgId)
            .limit(MAX_REPORTED_ACTIVITY_IDS)
          reportedActivityIds = (reportedActivities || []).map((a: { id: string }) => a.id)
        }

        let txQ = supabase
          .from('transactions')
          .select('transaction_date')
          .not('transaction_date', 'is', null)
        if (effectiveActivityId) {
          txQ = txQ.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          const orParts = [
            `provider_org_id.eq.${effectiveOrgId}`,
            `receiver_org_id.eq.${effectiveOrgId}`,
          ]
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            orParts.push(`activity_id.in.(${reportedActivityIds.join(',')})`)
          }
          txQ = txQ.or(orParts.join(','))
        }
        const { data: transactionDates } = await txQ

        let budgetQ = supabase
          .from('activity_budgets')
          .select('period_start, period_end')
          .not('period_start', 'is', null)
        if (effectiveActivityId) {
          budgetQ = budgetQ.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            budgetQ = budgetQ.in('activity_id', reportedActivityIds)
          } else {
            // No reported activities → no budgets for this org. Force-empty.
            budgetQ = budgetQ.eq('activity_id', '00000000-0000-0000-0000-000000000000')
          }
        }
        const { data: budgetDates } = await budgetQ

        let pdQ = supabase
          .from('planned_disbursements')
          .select('period_start, period_end')
          .not('period_start', 'is', null)
        if (effectiveActivityId) {
          pdQ = pdQ.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            pdQ = pdQ.in('activity_id', reportedActivityIds)
          } else {
            pdQ = pdQ.eq('activity_id', '00000000-0000-0000-0000-000000000000')
          }
        }
        const { data: pdDates } = await pdQ

        const allDates: string[] = []
        transactionDates?.forEach((t: { transaction_date: string | null }) => { if (t.transaction_date) allDates.push(t.transaction_date) })
        budgetDates?.forEach((b: { period_start: string | null; period_end: string | null }) => {
          if (b.period_start) allDates.push(b.period_start)
          if (b.period_end) allDates.push(b.period_end)
        })
        pdDates?.forEach((pd: { period_start: string | null; period_end: string | null }) => {
          if (pd.period_start) allDates.push(pd.period_start)
          if (pd.period_end) allDates.push(pd.period_end)
        })

        if (allDates.length > 0) {
          const years = allDates.map(d => new Date(d).getFullYear()).filter(y => !isNaN(y))
          if (years.length > 0) {
            const minYear = Math.min(...years)
            const maxYear = Math.max(...years)
            setActualDataRange({ minYear, maxYear })
            setSelectedYears([minYear, maxYear])
          }
        } else {
          const currentYear = new Date().getFullYear()
          setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
          setSelectedYears([currentYear - 5, currentYear])
        }
      } catch (err) {
        console.error('[FinancialTotalsBarChart] Error fetching date range:', err)
        const currentYear = new Date().getFullYear()
        setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
        setSelectedYears([currentYear - 5, currentYear])
      }
    }

    fetchDateRange()
  }, [effectiveActivityId, effectiveOrgId])

  // Handle year click
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        setSelectedYears([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      setSelectedYears([year])
    }
  }

  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
  }

  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Fetch raw data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) {
          setError('Database connection not available')
          return
        }

        // Resolve org filter into a list of activity ids reported by the org
        // (budgets / PDs only join through activity_id).
        let reportedActivityIds: string[] | null = null
        if (effectiveOrgId) {
          const { data: reportedActivities, error: repErr } = await supabase
            .from('activities')
            .select('id')
            .eq('reporting_org_id', effectiveOrgId)
            .limit(MAX_REPORTED_ACTIVITY_IDS)
          if (repErr) {
            console.error('[FinancialTotalsBarChart] Error resolving reporting-org activities:', repErr)
          }
          reportedActivityIds = (reportedActivities || []).map((a: { id: string }) => a.id)
          if (reportedActivityIds && reportedActivityIds.length === MAX_REPORTED_ACTIVITY_IDS) {
            console.warn('[FinancialTotalsBarChart] reporting-org activity list truncated at', MAX_REPORTED_ACTIVITY_IDS)
          }
        }

        // Build budgets query
        let budgetsQuery = supabase
          .from('activity_budgets')
          .select('period_start, period_end, value, usd_value, currency')
          .not('period_start', 'is', null)
        if (effectiveActivityId) {
          budgetsQuery = budgetsQuery.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            budgetsQuery = budgetsQuery.in('activity_id', reportedActivityIds)
          } else {
            budgetsQuery = budgetsQuery.eq('activity_id', '00000000-0000-0000-0000-000000000000')
          }
        }
        const { data: budgets, error: budgetsError } = await budgetsQuery

        if (budgetsError) {
          console.error('[FinancialTotalsBarChart] Error fetching budgets:', budgetsError)
        }

        // Build planned disbursements query
        let pdQuery = supabase
          .from('planned_disbursements')
          .select('period_start, period_end, amount, usd_amount, currency')
          .not('period_start', 'is', null)
        if (effectiveActivityId) {
          pdQuery = pdQuery.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            pdQuery = pdQuery.in('activity_id', reportedActivityIds)
          } else {
            pdQuery = pdQuery.eq('activity_id', '00000000-0000-0000-0000-000000000000')
          }
        }
        const { data: plannedDisbursements, error: plannedError } = await pdQuery

        if (plannedError) {
          console.error('[FinancialTotalsBarChart] Error fetching planned disbursements:', plannedError)
        }

        // Build transactions query — org filter pulls in any role
        // (provider, receiver, or activity-reporting-org).
        let txQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, finance_type, aid_type, provider_org_name, provider_org_id')
          .eq('status', 'actual')
          .not('transaction_date', 'is', null)
        if (effectiveActivityId) {
          txQuery = txQuery.eq('activity_id', effectiveActivityId)
        } else if (effectiveOrgId) {
          const orParts = [
            `provider_org_id.eq.${effectiveOrgId}`,
            `receiver_org_id.eq.${effectiveOrgId}`,
          ]
          if (reportedActivityIds && reportedActivityIds.length > 0) {
            orParts.push(`activity_id.in.(${reportedActivityIds.join(',')})`)
          }
          txQuery = txQuery.or(orParts.join(','))
        }
        const { data: transactions, error: transactionsError } = await txQuery

        if (transactionsError) {
          console.error('[FinancialTotalsBarChart] Error fetching transactions:', transactionsError)
        }

        setRawData({
          budgets: budgets || [],
          plannedDisbursements: plannedDisbursements || [],
          transactions: transactions || [],
        })
      } catch (err) {
        console.error('[FinancialTotalsBarChart] Unexpected error:', err)
        setError('Failed to load financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey, effectiveActivityId, effectiveOrgId])

  // Process data into yearly chart data
  const chartData = useMemo(() => {
    if (!rawData) return []

    const customYear = customYears.find(cy => cy.id === calendarType)
    const yearlyDataMap = new Map<number, YearlyData>()
    
    // Check if we're using a fiscal year that crosses calendar boundaries
    const useFiscalYear = customYear && crossesCalendarYear(customYear)

    const ensureYearEntry = (year: number) => {
      if (!yearlyDataMap.has(year)) {
        yearlyDataMap.set(year, {
          year,
          displayYear: customYear ? getCustomYearLabel(customYear, year) : `${year}`,
          Budgets: 0,
          'Planned Disbursements': 0,
        })
      }
    }

    // Process budgets
    rawData.budgets.forEach(budget => {
      if (useFiscalYear && customYear && budget.period_start && budget.period_end) {
        // Use fiscal year allocation
        const value = parseFloat(String(budget.usd_value)) || 
                     (budget.currency === 'USD' ? parseFloat(String(budget.value)) || 0 : 0)
        if (value > 0) {
          const fiscalAllocations = allocateAcrossFiscalYears(
            budget.period_start,
            budget.period_end,
            value,
            customYear
          )
          fiscalAllocations.forEach(({ fiscalYear, amount }) => {
            ensureYearEntry(fiscalYear)
            yearlyDataMap.get(fiscalYear)!.Budgets += amount
          })
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitBudgetAcrossYears(budget)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!.Budgets += amount
        })
      }
    })

    // Process planned disbursements
    rawData.plannedDisbursements.forEach(pd => {
      if (useFiscalYear && customYear && pd.period_start) {
        // Use fiscal year allocation
        const value = parseFloat(String(pd.usd_amount)) || 
                     (pd.currency === 'USD' ? parseFloat(String(pd.amount)) || 0 : 0)
        if (value > 0) {
          if (pd.period_end) {
            const fiscalAllocations = allocateAcrossFiscalYears(
              pd.period_start,
              pd.period_end,
              value,
              customYear
            )
            fiscalAllocations.forEach(({ fiscalYear, amount }) => {
              ensureYearEntry(fiscalYear)
              yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] += amount
            })
          } else {
            // Single date - assign to fiscal year
            const date = parseISO(pd.period_start)
            if (!isNaN(date.getTime())) {
              const fiscalYear = getFiscalYearForDate(date, customYear)
              ensureYearEntry(fiscalYear)
              yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] += value
            }
          }
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!['Planned Disbursements'] += amount
        })
      }
    })

    // Process transactions
    // Accumulate a transaction amount into a year. Always tracks the plain
    // transaction-type total (drives the type selector + "available types"),
    // and — when disaggregating — also the composite "<Type> — <Dimension>"
    // sub-series the stacked chart renders.
    const addTx = (yearData: YearlyData, typeName: string, amount: number, tx: any) => {
      if (!yearData[typeName]) yearData[typeName] = 0
      ;(yearData[typeName] as number) += amount
      if (disaggregateBy !== 'none') {
        const key = `${typeName}${DISAGG_SEP}${getTxDimLabel(tx, disaggregateBy)}`
        if (!yearData[key]) yearData[key] = 0
        ;(yearData[key] as number) += amount
      }
    }

    rawData.transactions.forEach(tx => {
      const type = tx.transaction_type
      if (!type) return

      const typeName = TRANSACTION_TYPES[type]
      if (!typeName) return

      if (useFiscalYear && customYear && tx.transaction_date) {
        // Use fiscal year for transaction
        const value = parseFloat(String(tx.value_usd)) ||
                     (tx.currency === 'USD' ? parseFloat(String(tx.value)) || 0 : 0)
        if (value > 0) {
          const date = parseISO(tx.transaction_date)
          if (!isNaN(date.getTime())) {
            const fiscalYear = getFiscalYearForDate(date, customYear)
            ensureYearEntry(fiscalYear)
            addTx(yearlyDataMap.get(fiscalYear)!, typeName, value, tx)
          }
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitTransactionAcrossYears(tx)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          addTx(yearlyDataMap.get(year)!, typeName, amount, tx)
        })
      }
    })

    // Filter to selected year range and sort
    // For fiscal years, we filter by fiscal year number, not calendar date
    let filteredData: YearlyData[]
    
    if (useFiscalYear && customYear && selectedYears.length > 0) {
      // Filter by selected fiscal years
      const minYear = Math.min(...selectedYears)
      const maxYear = Math.max(...selectedYears)
      filteredData = Array.from(yearlyDataMap.values())
        .filter(d => d.year >= minYear && d.year <= maxYear)
        .sort((a, b) => a.year - b.year)
    } else {
      // Filter by calendar date range
      const startYear = effectiveDateRange.from.getFullYear()
      const endYear = effectiveDateRange.to.getFullYear()
      filteredData = Array.from(yearlyDataMap.values())
        .filter(d => d.year >= startYear && d.year <= endYear)
        .sort((a, b) => a.year - b.year)
    }

    // Cap disaggregated sub-series per transaction type — keep the largest
    // MAX_DISAGGREGATE_SEGMENTS and merge the long tail into "<Type> — Other".
    if (disaggregateBy !== 'none' && filteredData.length) {
      Object.values(TRANSACTION_TYPES).forEach(typeName => {
        const prefix = `${typeName}${DISAGG_SEP}`
        const otherKey = `${typeName}${DISAGG_SEP}Other`
        const totals = new Map<string, number>()
        filteredData.forEach(row => {
          Object.keys(row).forEach(k => {
            if (k.startsWith(prefix)) totals.set(k, (totals.get(k) || 0) + (Number(row[k]) || 0))
          })
        })
        const ranked = [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
        if (ranked.length > MAX_DISAGGREGATE_SEGMENTS) {
          const keep = new Set(ranked.slice(0, MAX_DISAGGREGATE_SEGMENTS).map(([k]) => k))
          filteredData.forEach(row => {
            let otherSum = 0
            Object.keys(row).forEach(k => {
              if (k.startsWith(prefix) && !keep.has(k) && k !== otherKey) {
                otherSum += Number(row[k]) || 0
                delete (row as Record<string, unknown>)[k]
              }
            })
            if (otherSum > 0) row[otherKey] = (Number(row[otherKey]) || 0) + otherSum
          })
        }
      })
    }

    return filteredData
  }, [rawData, customYears, calendarType, effectiveDateRange, selectedYears, disaggregateBy])

  // Get available transaction types (those with data)
  const availableTransactionTypes = useMemo(() => {
    if (!chartData.length) return []

    return Object.entries(TRANSACTION_TYPES)
      .filter(([code, name]) => {
        return chartData.some(d => (d[name] as number) > 0)
      })
      .map(([code, name]) => ({ code, name }))
  }, [chartData])

  // Toggle transaction type selection
  const toggleTransactionType = (code: string) => {
    setSelectedTransactionTypes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code)
      }
      return [...prev, code]
    })
  }

  // Build active data keys for the bars. Without disaggregation: Budgets,
  // Planned Disbursements + each selected transaction type. With it: each
  // selected type expands into its composite sub-series, ordered by total
  // descending (the "Other" bucket always sorts last).
  const activeDataKeys = useMemo(() => {
    const keys = ['Budgets', 'Planned Disbursements']
    selectedTransactionTypes.forEach(code => {
      const name = TRANSACTION_TYPES[code]
      if (!name) return
      if (disaggregateBy === 'none') {
        keys.push(name)
        return
      }
      const prefix = `${name}${DISAGG_SEP}`
      const otherKey = `${name}${DISAGG_SEP}Other`
      const totals = new Map<string, number>()
      chartData.forEach(row => {
        Object.keys(row).forEach(k => {
          if (k.startsWith(prefix)) totals.set(k, (totals.get(k) || 0) + (Number(row[k]) || 0))
        })
      })
      const ordered = [...totals.entries()]
        .filter(([, v]) => v > 0)
        .sort((a, b) => {
          if (a[0] === otherKey) return 1
          if (b[0] === otherKey) return -1
          return b[1] - a[1]
        })
        .map(([k]) => k)
      keys.push(...ordered)
    })
    return keys
  }, [selectedTransactionTypes, disaggregateBy, chartData])

  // Build color map for active keys. Budgets / Planned Disbursements + plain
  // transaction types keep their canonical hues; disaggregated sub-series are
  // a darkest→lightest ramp of their transaction type's hue ("Other" = grey).
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    map['Budgets'] = BUDGET_COLOR
    map['Planned Disbursements'] = PLANNED_DISBURSEMENT_COLOR
    if (disaggregateBy === 'none') {
      activeDataKeys.forEach((key, index) => {
        if (!map[key]) map[key] = getColorForKey(key, activeDataKeys, index)
      })
      return map
    }
    selectedTransactionTypes.forEach(code => {
      const name = TRANSACTION_TYPES[code]
      if (!name) return
      const prefix = `${name}${DISAGG_SEP}`
      const otherKey = `${name}${DISAGG_SEP}Other`
      const base = getColorForKey(name)
      const comps = activeDataKeys.filter(k => k.startsWith(prefix))
      const nonOther = comps.filter(k => k !== otherKey)
      nonOther.forEach((k, idx) => {
        // Single sub-series → keep the type's exact hue; otherwise spread a
        // darkest→lightest ramp across the sub-series.
        map[k] = nonOther.length <= 1 ? base : rampShade(base, idx / (nonOther.length - 1))
      })
      if (comps.includes(otherKey)) map[otherKey] = OTHERS_COLOR
    })
    return map
  }, [activeDataKeys, disaggregateBy, selectedTransactionTypes])

  // Export to CSV
  const handleExportCSV = () => {
    if (!chartData.length) return

    const headers = ['Year', ...activeDataKeys]
    const rows = chartData.map(d => {
      return [
        d.displayYear,
        ...activeDataKeys.map(key => (d[key] as number)?.toFixed(2) || '0.00')
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `financial-totals-${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Custom tooltip
  const isExpanded = useChartExpansion()
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground">{label}</p>
            {customYears.find(cy => cy.id === calendarType)?.name && (
              <p className="text-helper text-muted-foreground mt-0.5">{customYears.find(cy => cy.id === calendarType)!.name}</p>
            )}
          </div>
          <div className="p-3">
          <table className="w-full text-body">
            <tbody>
              {payload.map((entry: any, index: number) => (
                <tr key={index} className={(entry.name || '').includes('Planned Disbursements') ? 'border-b' : ''}>
                  <td className="py-1 pr-3 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    {(() => {
                      const codeMap: Record<string, string> = { 'Incoming Funds': '1', 'Outgoing Commitments': '2', 'Commitments': '2', 'Disbursements': '3', 'Expenditures': '4', 'Credit Guarantee': '10', 'Incoming Commitments': '11', 'Disbursement': '3' }
                      const code = codeMap[entry.name]
                      return code ? <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">{code}</code> : null
                    })()}
                    <span className="text-foreground">{entry.name}</span>
                  </td>
                  <td className="py-1 text-right font-semibold text-foreground">
                    {formatTooltipCurrency(entry.value, isExpanded)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const seriesKey = entry.dataKey || entry.value
          const isHidden = hiddenSeries.has(seriesKey)
          return (
            <li
              key={`item-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => toggleSeries(seriesKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleSeries(seriesKey)
                }
              }}
              title={isHidden ? 'Click to show' : 'Click to hide'}
              className={cn(
                'flex items-center gap-2 cursor-pointer select-none transition-opacity',
                isHidden ? 'opacity-40' : 'opacity-100'
              )}
            >
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className={cn('text-body text-foreground', isHidden && 'line-through')}>
                {entry.value}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Render the appropriate chart type
  const renderChart = (height: number, isCompact: boolean) => {
    const margin = isCompact
      ? { top: 10, right: 20, left: 20, bottom: 30 }
      : isExpanded
        // In the expanded modal the legend lives outside the SVG, so we
        // shrink the chart's internal margins. ~32px below leaves the X-axis
        // labels lifted slightly off the chart's bottom edge.
        ? { top: 4, right: 30, left: 20, bottom: 32 }
        : { top: 20, right: 30, left: 20, bottom: 60 }

    const commonProps = {
      data: chartData,
      margin,
    }

    const xAxisProps = {
      dataKey: "displayYear",
      stroke: "#64748B",
      fontSize: isCompact ? 11 : 12,
      tickLine: false,
    }

    const yAxisProps = {
      tickFormatter: formatCurrency,
      stroke: "#64748B",
      fontSize: isCompact ? 10 : 12,
    }

    if (chartType === 'table') {
      return (
        <div className="overflow-auto" style={{ maxHeight: height }}>
          <table className="w-full text-body">
            <thead className="bg-surface-muted sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-foreground border-b">Year</th>
                {activeDataKeys.map(key => (
                  <th key={key} className="text-right px-4 py-3 font-medium text-foreground border-b whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: colorMap[key] }}
                      />
                      {key}
                    </div>
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-foreground border-b">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => {
                const rowTotal = activeDataKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0)
                return (
                  <tr key={row.displayYear} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.displayYear}
                    </td>
                    {activeDataKeys.map(key => (
                      <td key={key} className="text-right px-4 py-2.5 text-foreground tabular-nums">
                        {formatCurrencyFull(Number(row[key]) || 0)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 text-foreground font-semibold tabular-nums">
                      {formatCurrencyFull(rowTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted">
              <tr>
                <td className="px-4 py-3 font-semibold text-foreground border-t-2 border-border">Total</td>
                {activeDataKeys.map(key => {
                  const columnTotal = chartData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
                  return (
                    <td key={key} className="text-right px-4 py-3 font-semibold text-foreground border-t-2 border-border tabular-nums">
                      {formatCurrencyFull(columnTotal)}
                    </td>
                  )
                })}
                <td className="text-right px-4 py-3 font-bold text-foreground border-t-2 border-border tabular-nums">
                  {formatCurrencyFull(
                    chartData.reduce((grandTotal, row) => 
                      grandTotal + activeDataKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0), 0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={isExpanded ? "100%" : height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {!isCompact && !isExpanded && <Legend content={renderLegend} />}
            {activeDataKeys.map(key => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={colorMap[key]}
                strokeWidth={2}
                dot={{ fill: colorMap[key], r: 4 }}
                activeDot={{ r: 6 }}
                hide={hiddenSeries.has(key)}
                isAnimationActive={!isExpanded}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={isExpanded ? "100%" : height}>
          <AreaChart {...commonProps}>
            <defs>
              {activeDataKeys.map(key => (
                <linearGradient key={`gradient-${key}`} id={`color-${sanitizeId(key)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorMap[key]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colorMap[key]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {!isCompact && !isExpanded && <Legend content={renderLegend} />}
            {activeDataKeys.map(key => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stackId={disaggStackId(key, disaggregateBy)}
                stroke={colorMap[key]}
                strokeWidth={2}
                fill={`url(#color-${sanitizeId(key)})`}
                fillOpacity={0.6}
                hide={hiddenSeries.has(key)}
                isAnimationActive={!isExpanded}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'combo') {
      // Areas for planned figures (Budgets + Planned Disbursements), bars
      // for everything else (the active transaction types). Same `colorMap`
      // and `hiddenSeries` toggle behaviour as the other modes.
      const areaKeys = activeDataKeys.filter((k) => k === 'Budgets' || k === 'Planned Disbursements')
      const barKeys = activeDataKeys.filter((k) => k !== 'Budgets' && k !== 'Planned Disbursements')
      return (
        <ResponsiveContainer width="100%" height={isExpanded ? "100%" : height}>
          <ComposedChart {...commonProps} barGap={0} barCategoryGap="20%">
            <defs>
              {areaKeys.map((key) => (
                <linearGradient
                  key={`combo-gradient-${key}`}
                  id={`combo-area-${sanitizeId(key)}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={colorMap[key]} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={colorMap[key]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {!isCompact && !isExpanded && <Legend content={renderLegend} />}
            {areaKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={colorMap[key]}
                strokeWidth={2}
                fill={`url(#combo-area-${sanitizeId(key)})`}
                fillOpacity={1}
                hide={hiddenSeries.has(key)}
                isAnimationActive={!isExpanded}
              />
            ))}
            {barKeys.map((key) => {
              const stackId = disaggStackId(key, disaggregateBy)
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId={stackId}
                  fill={colorMap[key]}
                  radius={stackId ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  hide={hiddenSeries.has(key)}
                  isAnimationActive={!isExpanded}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    // Default: Bar chart
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart {...commonProps} barGap={0} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {!isCompact && !isExpanded && <Legend content={renderLegend} />}
          {activeDataKeys.map(key => {
            const stackId = disaggStackId(key, disaggregateBy)
            return (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                stackId={stackId}
                fill={colorMap[key]}
                radius={stackId ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                hide={hiddenSeries.has(key)}
                isAnimationActive={!isExpanded}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Compact mode
  if (compact) {
    if (loading || customYearsLoading) {
      return <ChartLoadingPlaceholder />
    }

    if (error || chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">{error || 'No data available'}</p>
        </div>
      )
    }

    // Use 100% height to fill the container
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 30 }} barGap={0} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis dataKey="displayYear" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            {activeDataKeys.map(key => {
              const stackId = disaggStackId(key, disaggregateBy)
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId={stackId}
                  fill={colorMap[key]}
                  radius={stackId ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Full view. Only blank to a placeholder on the very first load; once we
  // have data, a refresh (e.g. refreshKey bump) keeps the existing chart and
  // controls mounted so the expanded modal never appears to "reload".
  if ((loading || customYearsLoading) && !rawData) {
    return (
      <ChartLoadingPlaceholder />
    )
  }
  const isRefreshing = loading && !!rawData

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  // The flex-fill layout (h-full + flex-1 chart) only works when the parent
  // gives us an explicit height. The activity / org profile passes
  // `fillHeight` because their modal is a flex column with h-[85vh]; the
  // analytics dashboard's expanded Dialog has an auto-height parent, so
  // omitting `fillHeight` keeps the chart at a safe fixed h-[500px] there.
  const fillsCard = isExpanded && fillHeight
  return (
    <div className={cn(fillsCard ? "flex flex-col h-full pt-2" : "space-y-4")}>
      {/* Controls Row */}
      <div className={cn("flex items-start gap-2 flex-wrap shrink-0", fillsCard && "mb-3")}>
        {/* Calendar & Year Selectors */}
        {customYears.length > 0 && (
          <>
            {/* Calendar Type Selector */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {sortCustomYearsCalendarFirst(customYears).map(cy => (
                    <DropdownMenuItem
                      key={cy.id}
                      className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                      onClick={() => setCalendarType(cy.id)}
                    >
                      <span className="flex items-center gap-2">
                        {cy.shortName && (
                          <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            {cy.shortName.trim()}
                          </span>
                        )}
                        {cy.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Year Range Selector */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 border rounded-lg p-1 bg-card">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      title={effectiveDateRange?.from && effectiveDateRange?.to
                        ? `${format(effectiveDateRange.from, 'MMM d, yyyy')} – ${format(effectiveDateRange.to, 'MMM d, yyyy')}`
                        : undefined}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {selectedYears.length === 0
                        ? 'Select years'
                        : selectedYears.length === 1
                          ? getYearLabel(selectedYears[0])
                          : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-3 w-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-helper font-medium text-foreground">Select Year Range</span>
                      <button
                        onClick={selectDataRange}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                        title={actualDataRange ? `Select years with data: ${getYearLabel(actualDataRange.minYear)} - ${getYearLabel(actualDataRange.maxYear)}` : 'Select years with data'}
                      >
                        Data Range
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {AVAILABLE_YEARS.map((year) => {
                        const isStartOrEnd = selectedYears.length > 0 &&
                          (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                        const inRange = isYearInRange(year)

                        return (
                          <button
                            key={year}
                            onClick={(e) => handleYearClick(year, e.shiftKey)}
                            className={`
                              px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                              ${isStartOrEnd
                                ? 'bg-muted text-foreground'
                                : inRange
                                  ? 'bg-primary/20 text-primary'
                                  : 'text-muted-foreground hover:bg-muted'
                              }
                            `}
                          >
                            {getYearLabel(year)}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Click start year, then click end year
                    </p>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Disaggregate-by Dropdown — splits each selected transaction type
              into stacked sub-series by finance type / aid type / donor. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <LayersIcon className="mr-2 h-4 w-4" />
                {disaggregateBy === 'none'
                  ? 'Disaggregate'
                  : `By ${DISAGGREGATE_OPTIONS.find(o => o.value === disaggregateBy)?.label}`}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DISAGGREGATE_OPTIONS.map(o => (
                <DropdownMenuItem
                  key={o.value}
                  className={disaggregateBy === o.value ? 'bg-muted font-medium' : ''}
                  onClick={() => setDisaggregateBy(o.value)}
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Transaction Types Dropdown - stays open for multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Transaction Types ({selectedTransactionTypes.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
              <div className="space-y-1">
                {availableTransactionTypes.map(({ code, name }) => {
                  const isSelected = selectedTransactionTypes.includes(code)
                  const typeName = TRANSACTION_TYPES[code]
                  const displayColor = isSelected && typeName
                    ? (colorMap[typeName] || getColorForKey(typeName))
                    : BRAND_PALETTE.paleSlate
                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleTransactionType(code)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTransactionType(code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">{code}</code>
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: displayColor }}
                      />
                      <span className="text-body">{name}</span>
                    </div>
                  )
                })}
                {availableTransactionTypes.length === 0 && (
                  <div className="px-2 py-3 text-body text-muted-foreground text-center">
                    No transaction data available
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('bar')}
              className={cn("h-8 w-8", chartType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('line')}
              className={cn("h-8 w-8", chartType === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Line Chart"
              aria-label="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('area')}
              className={cn("h-8 w-8", chartType === 'area' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Area Chart"
              aria-label="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('combo')}
              className={cn("h-8 w-8", chartType === 'combo' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Areas (budgets + planned) + bars (transactions)"
              aria-label="Areas + bars"
            >
              <LayersIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('table')}
              className={cn("h-8 w-8", chartType === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Export Button */}
          <div className="flex items-center rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCSV}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart — when filling the card, use absolute positioning so the
          ResponsiveContainer always sees an explicit pixel height. flex-1 on
          its own doesn't reliably propagate through to Recharts. */}
      <div className={cn(fillsCard ? "flex-1 min-h-0 relative" : "h-[500px]", isRefreshing && "opacity-50 pointer-events-none transition-opacity")}>
        {chartData.length > 0 ? (
          fillsCard ? (
            <div className="absolute inset-0">
              {renderChart(500, false)}
            </div>
          ) : (
            renderChart(500, false)
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No financial data available</p>
              <p className="text-helper mt-2">Add budgets, planned disbursements, or transactions to see this chart</p>
            </div>
          </div>
        )}
      </div>

      {/* External legend (expanded mode only). Rendered outside the chart so
          the SVG's bars + X-axis fill the chart container all the way to the
          bottom — Recharts' built-in <Legend> reserves space inside the SVG
          which leaves dead-space below the X-axis. */}
      {isExpanded && chartData.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-4 mt-2 shrink-0">
          {activeDataKeys.map((key) => {
            const isHidden = hiddenSeries.has(key)
            return (
              <li
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => toggleSeries(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleSeries(key)
                  }
                }}
                title={isHidden ? 'Click to show' : 'Click to hide'}
                className={cn(
                  'flex items-center gap-2 cursor-pointer select-none transition-opacity',
                  isHidden ? 'opacity-40' : 'opacity-100'
                )}
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: colorMap[key] }}
                />
                <span className={cn('text-body text-foreground', isHidden && 'line-through')}>
                  {key}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Explanatory text — expanded view only. Inline cards stay compact;
          the explanation is for users who've opened the modal to focus. */}
      {isExpanded && (
        <p className={cn("text-body text-muted-foreground leading-relaxed shrink-0", fillsCard && "mt-16")}>
          Each year pairs the activity's planned commitments — <strong>approved budgets</strong> and <strong>scheduled planned disbursements</strong> — against the actual money that moved as recorded <strong>transactions</strong> (commitments, disbursements, expenditures). Comparing the year-by-year heights surfaces when planned amounts matched delivery and when they diverged: tall budget bars with short disbursement bars mean funds were approved but not yet released, while the reverse points to spending that outpaced plan. Together this is the quickest way to gauge whether the activity is delivering its budget on schedule and which years saw the biggest slippage.
        </p>
      )}
    </div>
  )
}
