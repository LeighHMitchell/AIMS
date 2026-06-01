"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, Download, TrendingUp, LineChart as LineChartIcon, BarChart3, Layers, Table as TableIcon } from 'lucide-react'
import { SectorTimeSeriesFilters as FilterState, TimeSeriesChartType, TimeSeriesDataType } from '@/types/sector-analytics'
import { useSectorTimeSeries } from './sectorTimeSeriesQueries'
import { SectorTimeSeriesFilters } from './SectorTimeSeriesFilters'
import { SectorTimeSeriesArea } from './SectorTimeSeriesArea'
import { SectorTimeSeriesLine } from './SectorTimeSeriesLine'
import { SectorTimeSeriesBar } from './SectorTimeSeriesBar'
import { SectorTimeSeriesTable } from './SectorTimeSeriesTable'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'

export function SectorTimeSeriesPanel({ compact }: { compact?: boolean } = {}) {
  const isExpanded = useChartExpansion()
  // When rendered inside a CompactChartCard, the card supplies the chrome +
  // title and controls/filters appear only on expand, so the card stays
  // minimal. Standalone (e.g. the Sector Analytics page) keeps full chrome.
  const insideCard = compact !== undefined
  const showControls = !insideCard || isExpanded
  // State for toggles
  const [dataType, setDataType] = useState<TimeSeriesDataType>('actual')
  const [chartType, setChartType] = useState<TimeSeriesChartType>('area')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  
  // Track if this is the initial load vs a data type change
  const [hasInitialData, setHasInitialData] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dataType: 'actual',
    groupByLevel: '1',
    sectors: [],
    yearRange: undefined,
    organizationId: undefined
  })

  // Ref for chart export

  // Fetch data using the hook
  const {
    data,
    chartData,
    sectorNames,
    sectorCodes,
    years,
    totals,
    dataQuality,
    loading,
    error,
    refetch
  } = useSectorTimeSeries({
    ...filters,
    dataType
  })

  // Gregorian years present in the time-series data — used to default the year
  // picker to the full span of years that have data.
  const dataYears = useMemo(
    () => years.map(Number).filter(n => Number.isFinite(n)),
    [years],
  )
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Track when we have initial data
  React.useEffect(() => {
    if (!loading && chartData.length > 0) {
      setHasInitialData(true)
    }
  }, [loading, chartData])

  // Handle data type toggle
  const handleDataTypeChange = (type: TimeSeriesDataType) => {
    setDataType(type)
    setFilters(prev => ({ ...prev, dataType: type }))
  }
  
  // Only show skeleton on initial load, not on data type changes
  const showSkeleton = loading && !hasInitialData

  // Handle CSV export
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }

    // Build CSV content
    const headers = ['Year', ...sectorNames, 'Total']
    const rows = data.map(item => {
      const sectorValues = sectorNames.map(name => item.sectors[name] || 0)
      const total = sectorValues.reduce((sum, val) => sum + val, 0)
      return [item.year, ...sectorValues.map(v => v.toFixed(2)), total.toFixed(2)]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sector-disbursements-${dataType}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  return (
    <Card className={insideCard ? "border-0 shadow-none bg-transparent" : ""}>
      <CardHeader className={insideCard && !showControls ? "p-0" : undefined}>
        <div className="flex flex-col gap-4">
          {/* Title — omitted inside a card; CompactChartCard supplies it. */}
          {!insideCard && (
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Sector Disbursements Over Time
            </CardTitle>
            <CardDescription className="text-body text-muted-foreground mt-0.5">
              Track planned and actual disbursements by sector across years
            </CardDescription>
          </div>
          )}

          {showControls && (<>
          {/* Top-Level Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {isExpanded && (
              <YearRangeChip
                selectedYears={selectedYears}
                onYearsChange={setSelectedYears}
                actualDataRange={actualDataRange}
              />
            )}
            {/* Data Type Toggle - Planned vs Actual */}
            <ChartViewToggle
              ariaLabel="Data type"
              variant="text"
              value={dataType}
              onValueChange={(value) => handleDataTypeChange(value)}
              options={[
                { value: 'planned', label: 'Planned Disbursements' },
                { value: 'actual', label: 'Actual Disbursements' },
              ]}
            />

            {/* Chart Type Toggle */}
            <div className="flex items-center gap-2">
              <ChartViewToggle
                ariaLabel="Chart type"
                variant="icon"
                className="flex-wrap"
                value={chartType}
                onValueChange={setChartType}
                options={[
                  { value: 'area', label: 'Area', icon: TrendingUp },
                  { value: 'line', label: 'Line', icon: LineChartIcon },
                  { value: 'bar', label: 'Bar', icon: BarChart3 },
                  { value: 'stacked-bar', label: 'Stacked Bar', icon: Layers },
                  { value: 'table', label: 'Table', icon: TableIcon },
                ]}
              />

              {/* Export Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                className="h-9 w-9"
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters - only render after initial load to avoid Radix Select loop */}
          {!loading && (
            <SectorTimeSeriesFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableSectors={sectorNames}
            />
          )}
          </>)}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {loading && (
          <ChartLoadingPlaceholder />
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center h-[400px] bg-destructive/10 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
              <p className="text-destructive font-medium">Failed to load data</p>
              <p className="text-body text-destructive mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refetch}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Data quality: how much of the spend comes from transaction-level sectors (actual)
            vs imputed from the activity-level split. Helps users trust cross-activity comparisons. */}
        {!loading && !error && dataQuality && (dataQuality.actualUsd + dataQuality.imputedUsd) > 0 && (() => {
          const total = dataQuality.actualUsd + dataQuality.imputedUsd
          const pctActual = Math.round((dataQuality.actualUsd / total) * 100)
          return (
            <div
              className="mb-3 text-helper text-muted-foreground"
              title="Actual = derived from transaction-level sectors. Imputed = the activity-level sector % applied to spend where a transaction carries no sector of its own."
            >
              Data quality: <span className="font-medium text-foreground">{pctActual}% actual</span>
              {pctActual < 100 ? <> · {100 - pctActual}% imputed</> : null}
              {dataQuality.unallocatedUsd > 0 ? <> · some spend uncategorised</> : null}
            </div>
          )
        })()}

        {/* Data Visualization */}
        {!loading && !error && (
          <div data-chart-container className="bg-white">
            {chartType === 'area' && (
              <SectorTimeSeriesArea
                data={chartData}
                sectorNames={sectorNames}
                sectorCodes={sectorCodes}
                dataType={dataType}
              />
            )}

            {chartType === 'line' && (
              <SectorTimeSeriesLine
                data={chartData}
                sectorNames={sectorNames}
                sectorCodes={sectorCodes}
                dataType={dataType}
              />
            )}

            {chartType === 'bar' && (
              <SectorTimeSeriesBar
                data={chartData}
                sectorNames={sectorNames}
                sectorCodes={sectorCodes}
                dataType={dataType}
                stacked={false}
              />
            )}

            {chartType === 'stacked-bar' && (
              <SectorTimeSeriesBar
                data={chartData}
                sectorNames={sectorNames}
                sectorCodes={sectorCodes}
                dataType={dataType}
                stacked={true}
              />
            )}

            {chartType === 'table' && (
              <SectorTimeSeriesTable
                data={data}
                sectorNames={sectorNames}
                years={years}
                totals={totals}
                dataType={dataType}
              />
            )}
          </div>
        )}

      </CardContent>
    </Card>
  )
}

