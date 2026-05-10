"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CustomYear,
  getCustomYearRange,
  getCustomYearLabel,
  sortCustomYearsCalendarFirst,
} from '@/types/custom-years'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api-fetch'
import { cn } from '@/lib/utils'

const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i,
)

export interface CalendarYearState {
  customYears: CustomYear[]
  customYearsLoading: boolean
  calendarType: string
  setCalendarType: (id: string) => void
  selectedYears: number[]
  setSelectedYears: (years: number[]) => void
  actualDataRange: { minYear: number; maxYear: number } | null
  effectiveDateRange: { from: Date; to: Date } | null
  getYearLabel: (year: number) => string
}

/**
 * Hook that owns the calendar / year-range filter state for a chart.
 *
 * `dataDates` should be the dates that drive the chart so the picker's
 * "Data Range" shortcut can snap to the actual span of the data. Pass an
 * empty array if the chart doesn't yet have data.
 */
export function useCalendarYearSelector(dataDates: Date[]): CalendarYearState {
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/custom-years')
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (cancelled || !result) return
        const years: CustomYear[] = result.data || []
        setCustomYears(years)
        let selected: CustomYear | undefined
        if (result.defaultId) selected = years.find((cy) => cy.id === result.defaultId)
        if (!selected && years.length > 0) selected = years[0]
        if (selected) setCalendarType(selected.id)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCustomYearsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const actualDataRange = useMemo(() => {
    if (!dataDates.length) return null
    const yrs = dataDates
      .map((d) => d.getFullYear())
      .filter((y) => Number.isFinite(y))
    if (yrs.length === 0) return null
    return { minYear: Math.min(...yrs), maxYear: Math.max(...yrs) }
  }, [dataDates])

  // Default the selected range to the actual data range the first time we
  // see one. Subsequent user interactions stick.
  useEffect(() => {
    if (selectedYears.length === 0 && actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualDataRange?.minYear, actualDataRange?.maxYear])

  const effectiveDateRange = useMemo<{ from: Date; to: Date } | null>(() => {
    const customYear = customYears.find((cy) => cy.id === calendarType)
    if (customYears.length > 0 && selectedYears.length > 0 && customYear) {
      const sorted = [...selectedYears].sort((a, b) => a - b)
      const first = getCustomYearRange(customYear, sorted[0])
      const last = getCustomYearRange(customYear, sorted[sorted.length - 1])
      return { from: first.start, to: last.end }
    }
    if (actualDataRange && customYear) {
      const first = getCustomYearRange(customYear, actualDataRange.minYear)
      const last = getCustomYearRange(customYear, actualDataRange.maxYear)
      return { from: first.start, to: last.end }
    }
    return null
  }, [customYears, calendarType, selectedYears, actualDataRange])

  const getYearLabel = (year: number) => {
    const customYear = customYears.find((cy) => cy.id === calendarType)
    if (customYear) return getCustomYearLabel(customYear, year)
    return String(year)
  }

  return {
    customYears,
    customYearsLoading,
    calendarType,
    setCalendarType,
    selectedYears,
    setSelectedYears,
    actualDataRange,
    effectiveDateRange,
    getYearLabel,
  }
}

/** Calendar Type + Year Range pickers — render together inside an
 *  expanded-chart toolbar. Returns null while custom-year config is loading
 *  or if none are configured. */
export function CalendarYearSelector(state: CalendarYearState) {
  const {
    customYears,
    customYearsLoading,
    calendarType,
    setCalendarType,
    selectedYears,
    setSelectedYears,
    actualDataRange,
    effectiveDateRange,
    getYearLabel,
  } = state

  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      setSelectedYears([Math.min(selectedYears[0], year), Math.max(selectedYears[0], year)])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) setSelectedYears([])
      else setSelectedYears([Math.min(selectedYears[0], year), Math.max(selectedYears[0], year)])
    } else {
      setSelectedYears([year])
    }
  }
  const selectDataRange = () => {
    if (actualDataRange) setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
  }
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    return year > Math.min(...selectedYears) && year < Math.max(...selectedYears)
  }

  if (customYearsLoading || customYears.length === 0) return null

  return (
    <>
      <div className="flex gap-1 border rounded-lg p-1 bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              {customYears.find((cy) => cy.id === calendarType)?.name || 'Select calendar'}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {sortCustomYearsCalendarFirst(customYears).map((cy) => (
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

      <div className="flex gap-1 border rounded-lg p-1 bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              title={
                effectiveDateRange?.from && effectiveDateRange?.to
                  ? `${format(effectiveDateRange.from, 'MMM d, yyyy')} – ${format(effectiveDateRange.to, 'MMM d, yyyy')}`
                  : undefined
              }
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
                title={
                  actualDataRange
                    ? `Select years with data: ${getYearLabel(actualDataRange.minYear)} - ${getYearLabel(actualDataRange.maxYear)}`
                    : 'Select years with data'
                }
              >
                Data Range
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {AVAILABLE_YEARS.map((year) => {
                const isStartOrEnd =
                  selectedYears.length > 0 &&
                  (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                const inRange = isYearInRange(year)
                return (
                  <button
                    key={year}
                    onClick={(e) => handleYearClick(year, e.shiftKey)}
                    className={cn(
                      'px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap',
                      isStartOrEnd
                        ? 'bg-muted text-foreground'
                        : inRange
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:bg-muted',
                    )}
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
    </>
  )
}
