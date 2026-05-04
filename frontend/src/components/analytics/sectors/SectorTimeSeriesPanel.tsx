"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export function SectorTimeSeriesPanel() {
  const isExpanded = useChartExpansion()
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
    loading, 
    error,
    refetch 
  } = useSectorTimeSeries({
    ...filters,
    dataType
  })

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
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <CardTitle className="text-base font-medium text-foreground">
              Sector Disbursements Over Time
            </CardTitle>
            <CardDescription className="text-helper text-muted-foreground mt-0.5">
              Track planned and actual disbursements by sector across years
            </CardDescription>
          </div>

          {/* Top-Level Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {isExpanded && (
              <YearRangeChip
                selectedYears={selectedYears}
                onYearsChange={setSelectedYears}
              />
            )}
            {/* Data Type Toggle - Planned vs Actual */}
            <div className="flex gap-1 rounded-lg p-1 bg-muted">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDataTypeChange('planned')}
                className={cn("h-8", dataType === 'planned' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
              >
                Planned Disbursements
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDataTypeChange('actual')}
                className={cn("h-8", dataType === 'actual' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
              >
                Actual Disbursements
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-lg p-1 bg-muted flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType('area')}
                  className={cn("h-8", chartType === 'area' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
                  title="Area"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType('line')}
                  className={cn("h-8", chartType === 'line' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
                  title="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className={cn("h-8", chartType === 'bar' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType('stacked-bar')}
                  className={cn("h-8", chartType === 'stacked-bar' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
                  title="Stacked Bar"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType('table')}
                  className={cn("h-8", chartType === 'table' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

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

