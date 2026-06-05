"use client"

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { CustomYear, getCustomYearRange, pickDefaultCalendarYearId } from '@/types/custom-years'

/**
 * Shared calendar + year-range state for dashboard charts. Owns the selected
 * year span and the calendar type (Gregorian or a custom fiscal year), fetches
 * the custom-year definitions, and derives the ISO `dateFrom`/`dateTo` window to
 * send to an analytics endpoint — so a chart's calendar/date picker actually
 * filters its data. Spread `yearRangeProps` into <YearRangeChip />.
 */
export function useChartYearRange() {
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')

  // Fetch custom years on mount; default to the Gregorian calendar year.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch('/api/custom-years')
        if (!res.ok) return
        const result = await res.json()
        const years = (result.data || []) as CustomYear[]
        if (cancelled) return
        setCustomYears(years)
        const defaultId = pickDefaultCalendarYearId(years, result.defaultId)
        if (defaultId) setCalendarType(defaultId)
      } catch {
        /* fall back to Gregorian calendar-year bounds */
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Default the selection to the last five calendar years (once).
  useEffect(() => {
    if (selectedYears.length === 0) {
      const now = new Date().getFullYear()
      setSelectedYears([now - 4, now])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive the date window from the selected years, honouring the calendar type
  // (a custom fiscal year shifts the window by its start month/day).
  const { dateFrom, dateTo, customYearId } = useMemo(() => {
    if (selectedYears.length === 0) {
      return { dateFrom: undefined as string | undefined, dateTo: undefined as string | undefined, customYearId: undefined as string | undefined }
    }
    const sorted = [...selectedYears].sort((a, b) => a - b)
    const minY = sorted[0]
    const maxY = sorted[sorted.length - 1]
    const cy = customYears.find(c => c.id === calendarType)
    if (cy) {
      return {
        dateFrom: getCustomYearRange(cy, minY).start.toISOString(),
        dateTo: getCustomYearRange(cy, maxY).end.toISOString(),
        customYearId: calendarType || undefined,
      }
    }
    return {
      dateFrom: new Date(minY, 0, 1).toISOString(),
      dateTo: new Date(maxY, 11, 31, 23, 59, 59).toISOString(),
      customYearId: undefined,
    }
  }, [selectedYears, customYears, calendarType])

  return {
    selectedYears,
    setSelectedYears,
    customYears,
    calendarType,
    setCalendarType,
    dateFrom,
    dateTo,
    customYearId,
    /** Spread straight into <YearRangeChip {...yearRangeProps} />. */
    yearRangeProps: {
      selectedYears,
      onYearsChange: setSelectedYears,
      customYears,
      calendarType,
      onCalendarTypeChange: setCalendarType,
    },
  }
}
