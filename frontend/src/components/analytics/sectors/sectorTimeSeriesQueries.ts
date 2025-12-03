/**
 * Sector Time Series Queries
 * Data fetching hooks and utilities for sector time series visualization
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  SectorTimeSeriesResponse, 
  SectorTimeSeriesData,
  SectorTimeSeriesFilters 
} from '@/types/sector-analytics'

/**
 * Transformed data point for Recharts
 * Each point has a year and a value for each sector
 */
export interface ChartDataPoint {
  year: string
  [sectorName: string]: number | string
}

/**
 * Transform API response data to Recharts-compatible format
 */
export function transformToChartData(
  data: SectorTimeSeriesData[],
  sectorNames: string[]
): ChartDataPoint[] {
  return data.map(item => {
    const point: ChartDataPoint = { year: item.year }
    
    // Add all sectors, defaulting to 0 if not present
    sectorNames.forEach(sector => {
      point[sector] = item.sectors[sector] || 0
    })
    
    return point
  })
}

/**
 * Hook state
 */
interface UseSectorTimeSeriesState {
  data: SectorTimeSeriesData[]
  chartData: ChartDataPoint[]
  sectorNames: string[]
  sectorCodes: Record<string, string>
  years: string[]
  totals: Record<string, number>
  loading: boolean
  error: string | null
}

/**
 * Hook return type
 */
interface UseSectorTimeSeriesReturn extends UseSectorTimeSeriesState {
  refetch: () => void
}

/**
 * Custom hook for fetching sector time series data
 */
export function useSectorTimeSeries(
  filters: SectorTimeSeriesFilters
): UseSectorTimeSeriesReturn {
  const [state, setState] = useState<UseSectorTimeSeriesState>({
    data: [],
    chartData: [],
    sectorNames: [],
    sectorCodes: {},
    years: [],
    totals: {},
    loading: true,
    error: null
  })

  // Extract primitive values to use as stable dependencies
  const dataType = filters.dataType
  const groupByLevel = filters.groupByLevel
  const organizationId = filters.organizationId
  const yearFrom = filters.yearRange?.from
  const yearTo = filters.yearRange?.to
  const sectorsKey = filters.sectors?.join(',') || ''

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Build query params
      const params = new URLSearchParams()
      params.append('dataType', dataType)
      params.append('groupByLevel', groupByLevel)
      
      if (organizationId && organizationId !== 'all') {
        params.append('organizationId', organizationId)
      }
      
      if (yearFrom) {
        params.append('yearFrom', yearFrom.toString())
      }
      
      if (yearTo) {
        params.append('yearTo', yearTo.toString())
      }
      
      if (sectorsKey) {
        params.append('sectors', sectorsKey)
      }

      const response = await fetch(`/api/analytics/sectors-time-series?${params}`)
      const result: SectorTimeSeriesResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sector time series data')
      }

      // Transform data for charts
      const chartData = transformToChartData(result.data, result.sectorNames)

      setState({
        data: result.data,
        chartData,
        sectorNames: result.sectorNames,
        sectorCodes: result.sectorCodes || {},
        years: result.years,
        totals: result.totals,
        loading: false,
        error: null
      })
    } catch (err) {
      console.error('[useSectorTimeSeries] Error:', err)
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data'
      }))
    }
  }, [dataType, groupByLevel, organizationId, yearFrom, yearTo, sectorsKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    refetch: fetchData
  }
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

/**
 * Format currency for tooltip (millions with 2 decimal places)
 */
export function formatTooltipCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '$0.00m'
  }
  const millions = value / 1_000_000
  return `$${millions.toFixed(2)}m`
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

/**
 * Get total value for a year from chart data
 */
export function getYearTotal(dataPoint: ChartDataPoint, sectorNames: string[]): number {
  return sectorNames.reduce((sum, sector) => {
    const value = dataPoint[sector]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

/**
 * Generate year range options for filters
 */
export function generateYearOptions(startYear: number = 2010): Array<{ value: string; label: string }> {
  const currentYear = new Date().getFullYear()
  const years: Array<{ value: string; label: string }> = []
  
  for (let year = currentYear + 5; year >= startYear; year--) {
    years.push({ value: year.toString(), label: year.toString() })
  }
  
  return years
}

