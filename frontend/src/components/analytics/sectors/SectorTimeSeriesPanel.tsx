"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Download, FileImage, TrendingUp, LineChart as LineChartIcon, BarChart3, Layers, Table as TableIcon } from 'lucide-react'
import { SectorTimeSeriesFilters as FilterState, TimeSeriesChartType, TimeSeriesDataType } from '@/types/sector-analytics'
import { useSectorTimeSeries } from './sectorTimeSeriesQueries'
import { SectorTimeSeriesFilters } from './SectorTimeSeriesFilters'
import { SectorTimeSeriesArea } from './SectorTimeSeriesArea'
import { SectorTimeSeriesLine } from './SectorTimeSeriesLine'
import { SectorTimeSeriesBar } from './SectorTimeSeriesBar'
import { SectorTimeSeriesTable } from './SectorTimeSeriesTable'
import { toast } from 'sonner'

export function SectorTimeSeriesPanel() {
  // State for toggles
  const [dataType, setDataType] = useState<TimeSeriesDataType>('actual')
  const [chartType, setChartType] = useState<TimeSeriesChartType>('area')
  
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
  const chartRef = useRef<HTMLDivElement>(null)

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

  // Handle JPG export
  const handleExportJPG = async () => {
    const chartContainer = chartRef.current
    if (!chartContainer) {
      toast.error('Chart not found')
      return
    }

    try {
      const loadingToast = toast.loading('Generating image...')
      
      // Dynamic import html2canvas
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartContainer.scrollWidth,
        height: chartContainer.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('[data-chart-container]') as HTMLElement
          if (clonedContainer) {
            clonedContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
            clonedContainer.style.width = chartContainer.scrollWidth + 'px'
            clonedContainer.style.overflow = 'visible'
          }
        }
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `sector-disbursements-${dataType}-${chartType}-${new Date().toISOString().split('T')[0]}.jpg`
          link.click()
          URL.revokeObjectURL(url)
          toast.dismiss(loadingToast)
          toast.success('Chart exported successfully')
        } else {
          toast.dismiss(loadingToast)
          toast.error('Failed to generate image')
        }
      }, 'image/jpeg', 0.95)
    } catch (err) {
      console.error('Error exporting chart:', err)
      toast.error('Failed to export chart')
    }
  }

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
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5" />
              Sector Disbursements Over Time
            </CardTitle>
            <CardDescription className="mt-1">
              Track planned and actual disbursements by sector across years
            </CardDescription>
          </div>

          {/* Top-Level Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Data Type Toggle - Planned vs Actual */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={dataType === 'planned' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleDataTypeChange('planned')}
                className="h-8"
              >
                Planned Disbursements
              </Button>
              <Button
                variant={dataType === 'actual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleDataTypeChange('actual')}
                className="h-8"
              >
                Actual Disbursements
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-lg p-1 bg-white flex-wrap">
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className="h-8"
                  title="Area"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="h-8"
                  title="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className="h-8"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'stacked-bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('stacked-bar')}
                  className="h-8"
                  title="Stacked Bar"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('table')}
                  className="h-8"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-2"
                  title="Download as CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJPG}
                  className="h-8 px-2"
                  disabled={chartType === 'table'}
                  title="Export as JPG"
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              </div>
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
          <div className="space-y-4">
            <Skeleton className="h-[500px] w-full" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center h-[400px] bg-red-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
              <p className="text-red-700 font-medium">Failed to load data</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
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
          <div ref={chartRef} data-chart-container className="bg-white">
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

