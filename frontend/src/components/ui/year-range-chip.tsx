"use client"

import React, { useEffect, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CustomYear,
  getCustomYearLabel,
  getCustomYearRange,
  pickDefaultCalendarYearId,
  sortCustomYearsCalendarFirst,
} from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch'

// Default available years: 2010 → current year + 10
const DEFAULT_AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

export interface YearRangeChipProps {
  /**
   * The 1- or 2-element selected year range.
   * 1 element = single year selected.
   * 2 elements = [startYear, endYear] (order doesn't matter).
   */
  selectedYears: number[]
  onYearsChange: (years: number[]) => void

  /**
   * Optional: list of years to render in the picker grid.
   * Defaults to 2010 → current year + 10.
   */
  availableYears?: number[]

  /**
   * Optional: actual data range to surface as the "Data" quick-select.
   */
  actualDataRange?: { minYear: number; maxYear: number } | null

  /**
   * Optional initial date range to derive default selectedYears from
   * (only used on first paint when selectedYears is empty).
   */
  initialDateRange?: { from?: Date | null; to?: Date | null } | null

  /**
   * Optional: pre-fetched custom years list and selected calendar id.
   * If omitted, the component fetches /api/custom-years on mount and
   * uses the system default.
   */
  customYears?: CustomYear[]
  calendarType?: string
  onCalendarTypeChange?: (id: string) => void

  /**
   * Optional: keep the parent informed of the effective date range
   * (start of first selected year → end of last selected year).
   */
  onDateRangeChange?: (range: { from: Date; to: Date } | null) => void

  className?: string
  buttonClassName?: string
  /** When true, hides the calendar-type dropdown even if multiple custom years are loaded. */
  hideCalendarSelector?: boolean
  /** When true, clicking a year selects exactly that one year (no start→end range). */
  singleYear?: boolean
}

/**
 * Standard "Gregorian Calendar Year" date chip used across analytics charts.
 *
 * Renders a small dropdown button with a calendar icon and the currently
 * selected year range (e.g. "2018 – 2024"). Clicking opens a year-grid
 * where the user clicks a start year then an end year. Two quick-actions
 * ("All" and "Data") are available at the top.
 *
 * The chip keeps its own local list of custom-year calendars when one is
 * not supplied — most callers can drop it in without any state plumbing.
 */
export function YearRangeChip({
  selectedYears,
  onYearsChange,
  availableYears = DEFAULT_AVAILABLE_YEARS,
  actualDataRange = null,
  initialDateRange = null,
  customYears: providedCustomYears,
  calendarType: providedCalendarType,
  onCalendarTypeChange,
  onDateRangeChange,
  className,
  buttonClassName,
  hideCalendarSelector,
  singleYear = false,
}: YearRangeChipProps) {
  const [internalCustomYears, setInternalCustomYears] = useState<CustomYear[]>([])
  const [internalCalendarType, setInternalCalendarType] = useState<string>('')

  const customYears = providedCustomYears ?? internalCustomYears
  const calendarType = providedCalendarType ?? internalCalendarType
  const setCalendarType = onCalendarTypeChange ?? setInternalCalendarType

  // Fetch custom years on mount unless caller supplies them
  useEffect(() => {
    if (providedCustomYears) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await apiFetch('/api/custom-years')
        if (!res.ok) return
        const result = await res.json()
        const years = (result.data || []) as CustomYear[]
        if (cancelled) return
        setInternalCustomYears(years)
        // Default to the Gregorian Calendar Year regardless of the DB default.
        const defaultId = pickDefaultCalendarYearId(years, result.defaultId)
        if (defaultId) setInternalCalendarType(defaultId)
      } catch {
        /* swallow */
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [providedCustomYears])

  // Default selectedYears when empty. Prefer the actual data range (so the
  // chip opens on the full span of years that have data); fall back to the
  // supplied initialDateRange for callers that don't pass a data range.
  useEffect(() => {
    if (selectedYears.length > 0) return
    // Single-year mode defaults to the most recent year; range mode spans the
    // full data range.
    if (actualDataRange) {
      onYearsChange(singleYear ? [actualDataRange.maxYear] : [actualDataRange.minYear, actualDataRange.maxYear])
      return
    }
    if (initialDateRange?.from && initialDateRange?.to) {
      const fromYear = initialDateRange.from.getFullYear()
      const toYear = initialDateRange.to.getFullYear()
      if (!Number.isNaN(fromYear) && !Number.isNaN(toYear)) {
        onYearsChange(singleYear ? [toYear] : [fromYear, toYear])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualDataRange?.minYear, actualDataRange?.maxYear, initialDateRange?.from, initialDateRange?.to, singleYear])

  // Notify parent of effective date range
  useEffect(() => {
    if (!onDateRangeChange) return
    if (selectedYears.length === 0) {
      onDateRangeChange(null)
      return
    }
    const customYear = customYears.find(cy => cy.id === calendarType)
    const minY = Math.min(...selectedYears)
    const maxY = Math.max(...selectedYears)
    if (customYear) {
      const startRange = getCustomYearRange(customYear, minY)
      const endRange = getCustomYearRange(customYear, maxY)
      onDateRangeChange({ from: startRange.start, to: endRange.end })
    } else {
      onDateRangeChange({
        from: new Date(minY, 0, 1),
        to: new Date(maxY, 11, 31, 23, 59, 59, 999),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYears, calendarType, customYears])

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) return getCustomYearLabel(customYear, year)
    return `${year}`
  }

  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (singleYear) {
      // Single-year mode: clicking a year selects exactly that year.
      onYearsChange([year])
      return
    }
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      onYearsChange([start, end])
    } else if (selectedYears.length === 0) {
      onYearsChange([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        onYearsChange([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        onYearsChange([start, end])
      }
    } else {
      onYearsChange([year])
    }
  }

  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  const selectAllYears = () => {
    onYearsChange([availableYears[0], availableYears[availableYears.length - 1]])
  }

  const selectDataRange = () => {
    if (actualDataRange) {
      onYearsChange([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      const currentYear = new Date().getFullYear()
      onYearsChange([currentYear - 10, currentYear + 3])
    }
  }

  // Effective date range used for the title= tooltip
  const effectiveDateRange: { from: Date; to: Date } | null = (() => {
    if (selectedYears.length === 0) return null
    const customYear = customYears.find(cy => cy.id === calendarType)
    const minY = Math.min(...selectedYears)
    const maxY = Math.max(...selectedYears)
    if (customYear) {
      const startRange = getCustomYearRange(customYear, minY)
      const endRange = getCustomYearRange(customYear, maxY)
      return { from: startRange.start, to: endRange.end }
    }
    return {
      from: new Date(minY, 0, 1),
      to: new Date(maxY, 11, 31, 23, 59, 59, 999),
    }
  })()

  const triggerLabel =
    selectedYears.length === 0
      ? 'Select years'
      : selectedYears.length === 1
        ? getYearLabel(selectedYears[0])
        : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`

  return (
    <div className={`flex items-start gap-2 ${className ?? ''}`}>
      {!hideCalendarSelector && customYears.length > 1 && (
        <div className="flex gap-1 border rounded-lg p-1 bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                <svg
                  className="h-4 w-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sortCustomYearsCalendarFirst(customYears).map(cy => (
                <button
                  key={cy.id}
                  onClick={() => setCalendarType(cy.id)}
                  className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted ${
                    calendarType === cy.id ? 'bg-muted font-medium' : ''
                  }`}
                >
                  {cy.shortName && (
                    <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {cy.shortName.trim()}
                    </span>
                  )}
                  {cy.name}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex gap-1 border rounded-lg p-1 bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1 ${buttonClassName ?? ''}`}
              title={
                effectiveDateRange?.from && effectiveDateRange?.to
                  ? `${format(effectiveDateRange.from, 'MMM d, yyyy')} – ${format(
                      effectiveDateRange.to,
                      'MMM d, yyyy'
                    )}`
                  : undefined
              }
            >
              <CalendarIcon className="h-4 w-4" />
              {triggerLabel}
              <svg
                className="h-4 w-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-3 w-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-helper font-medium text-foreground">
                {singleYear ? 'Select Year' : 'Select Year Range'}
              </span>
              {!singleYear && (
              <div className="flex gap-1">
                <button
                  onClick={selectAllYears}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                  title="Select all available years"
                >
                  All
                </button>
                <button
                  onClick={selectDataRange}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                  title={
                    actualDataRange
                      ? `Select only years with data: ${getYearLabel(
                          actualDataRange.minYear
                        )} - ${getYearLabel(actualDataRange.maxYear)}`
                      : 'Select years with data'
                  }
                >
                  Data
                </button>
              </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {availableYears.map(year => {
                const isStartOrEnd =
                  selectedYears.length > 0 &&
                  (year === Math.min(...selectedYears) ||
                    year === Math.max(...selectedYears))
                const inRange = isYearInRange(year)
                return (
                  <button
                    key={year}
                    onClick={e => handleYearClick(year, e.shiftKey)}
                    className={`px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      isStartOrEnd
                        ? 'bg-muted text-foreground'
                        : inRange
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={singleYear ? 'Click to select this year' : 'Click to select start, then click another to select end'}
                  >
                    {getYearLabel(year)}
                  </button>
                )
              })}
            </div>
            {!singleYear && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Click start year, then click end year
            </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
