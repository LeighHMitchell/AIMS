"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { supabase } from '@/lib/supabase'
import { BarChart3, PieChart, Table as TableIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { Button } from '@/components/ui/button'
import { ChartToolbarRow } from '@/components/ui/chart-toolbar-row'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface HumanitarianShareChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ShareData) => void
  compact?: boolean
}

interface ShareData {
  humanitarian: number
  development: number
  total: number
  humanitarianPercent: number
  developmentPercent: number
}

type ViewMode = 'chart' | 'bar' | 'table'

export function HumanitarianShareChart({ dateRange, refreshKey, onDataChange, compact = false }: HumanitarianShareChartProps) {
  const isExpanded = useChartExpansion()
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('chart')

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Query transactions - use value_usd for USD-converted amounts
      const { data: transactions, error: queryError } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, is_humanitarian, transaction_type, status, description')
        .in('transaction_type', ['2', '3', '4']) // Commitments, Disbursements, Expenditures
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())

      if (queryError) {
        console.error('[HumanitarianShareChart] Query error:', queryError)
        return
      }

      let humanitarian = 0
      let development = 0

      // Humanitarian classification criteria (same as HumanitarianChart)
      const humanitarianAidTypes = ['01', '02', '03']
      const humanitarianKeywords = ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis']

      transactions?.forEach((t: any) => {
        // Use value_usd if available, otherwise fall back to value (assuming USD if no conversion)
        let value = parseFloat(t.value_usd) || 0
        if (!value && t.currency === 'USD' && t.value) {
          value = parseFloat(t.value) || 0
        }
        if (isNaN(value) || value === 0) return

        const isHumanitarian = t.is_humanitarian
        const aidType = t.aid_type
        const description = t.description?.toLowerCase() || ''

        // Check if humanitarian
        if (isHumanitarian || 
            humanitarianAidTypes.includes(aidType) ||
            humanitarianKeywords.some(keyword => description.includes(keyword))) {
          humanitarian += value
        } else {
          development += value
        }
      })

      const total = humanitarian + development
      const humanitarianPercent = total > 0 ? Math.round((humanitarian / total) * 100) : 0
      const developmentPercent = total > 0 ? Math.round((development / total) * 100) : 0

      const shareData: ShareData = {
        humanitarian,
        development,
        total,
        humanitarianPercent,
        developmentPercent
      }

      setData(shareData)
      onDataChange?.(shareData)
    } catch (error) {
      console.error('[HumanitarianShareChart] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number): string => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      
      // Format in billions or millions
      if (value >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(2)} bn`
      } else if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)} M`
      } else if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)} K`
      }
      return `$${value.toFixed(2)}`
    } catch (error) {
      console.error('[HumanitarianShareChart] Error formatting currency:', error)
      return '$0'
    }
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (!data || data.total === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    const ringR = 64
    const ringC = 2 * Math.PI * ringR
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="relative mb-3">
          {/* Larger donut ring; the humanitarian share is drawn in red. */}
          <svg width="180" height="180" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="16" />
            <circle
              cx="80"
              cy="80"
              r={ringR}
              fill="none"
              stroke="#dc2625"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${ringC * (data.humanitarianPercent / 100)} ${ringC}`}
              transform="rotate(-90 80 80)"
            />
            <text x="80" y="76" textAnchor="middle" fontSize="30" fontWeight="700" fill="#dc2625">
              {data.humanitarianPercent}%
            </text>
            <text x="80" y="100" textAnchor="middle" fontSize="11" fill="#64748B">
              Humanitarian
            </text>
          </svg>
        </div>
        <div className="text-helper text-muted-foreground text-center">
          <span className="text-destructive font-medium">{formatCurrency(data.humanitarian)}</span>
          {' / '}
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
        <p className="text-muted-foreground">No aid data available for the selected period</p>
      </div>
    )
  }

  // Calculate bar heights (as percentages)
  const developmentHeight = data.developmentPercent
  const humanitarianHeight = data.humanitarianPercent

  // Bar chart data
  const barChartData = [
    { name: 'Development', value: data.development, percent: data.developmentPercent, color: '#4c5568' },
    { name: 'Humanitarian', value: data.humanitarian, percent: data.humanitarianPercent, color: '#dc2625' }
  ]

  const exportRows = [
    { Category: 'Development cooperation', 'Amount (USD)': data.development, Share: `${data.developmentPercent}%` },
    { Category: 'Humanitarian assistance', 'Amount (USD)': data.humanitarian, Share: `${data.humanitarianPercent}%` },
    { Category: 'Total', 'Amount (USD)': data.total, Share: '100%' },
  ]

  const ringR = 70
  const ringC = 2 * Math.PI * ringR
  const renderChartView = () => (
    // Centered + width-capped so the modal doesn't sprawl across the full width.
    <div className="flex items-center justify-center gap-8 md:gap-16 py-6 max-w-2xl mx-auto">
      {/* Circle Indicator — humanitarian share drawn in red. */}
      <div className="relative flex-shrink-0">
        <svg width="170" height="170" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="18" />
          <circle
            cx="80"
            cy="80"
            r={ringR}
            fill="none"
            stroke="#dc2625"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${ringC * (data.humanitarianPercent / 100)} ${ringC}`}
            transform="rotate(-90 80 80)"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-destructive">
            {data.humanitarianPercent}
            <span className="text-2xl">%</span>
          </span>
        </div>
      </div>

      {/* Stacked Bar with Labels */}
      <div className="flex items-center gap-6">
        {/* Stacked Bar */}
        <div className="relative h-64 w-16 rounded-lg overflow-hidden flex flex-col">
          {/* Development (top/larger portion) */}
          <div
            className="w-full transition-all duration-500"
            style={{
              height: `${developmentHeight}%`,
              backgroundColor: '#4c5568' // Dark teal
            }}
          />
          {/* Humanitarian (bottom/smaller portion) — red */}
          <div
            className="w-full transition-all duration-500"
            style={{
              height: `${humanitarianHeight}%`,
              backgroundColor: '#dc2625'
            }}
          />
        </div>

        {/* Labels with connector lines */}
        <div className="flex flex-col justify-between h-64 py-4">
          {/* Development Label */}
          <div className="flex items-start gap-3">
            <svg width="40" height="24" className="flex-shrink-0 mt-1">
              <path
                d="M0 12 Q10 12, 20 6 T40 6"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
            </svg>
            <div>
              <p className="font-semibold text-foreground">Development cooperation</p>
              <p className="text-muted-foreground">
                {formatCurrency(data.development)} USD ({data.developmentPercent}%)
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Humanitarian Label */}
          <div className="flex items-start gap-3">
            <svg width="40" height="24" className="flex-shrink-0 mt-1">
              <path
                d="M0 12 Q10 12, 20 18 T40 18"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
            </svg>
            <div>
              <p className="font-semibold text-destructive">Humanitarian assistance</p>
              <p className="text-muted-foreground">
                {formatCurrency(data.humanitarian)} USD ({data.humanitarianPercent}%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const datum = payload[0]?.payload
      if (!datum) return null
      return (
        <ChartTooltipCard
          title={datum.name}
          subtitle="Share of total aid"
          rows={[
            { label: 'Value', value: formatTooltipCurrency(datum.value, isExpanded), color: datum.color },
            { label: 'Share', value: `${datum.percent}%` },
          ]}
        />
      )
    }
    return null
  }

  const renderBarView = () => (
    <div className="py-6 max-w-3xl mx-auto">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatAxisCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#64748b', fontSize: 12 }}
            width={120}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {barChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  const renderTableView = () => (
    <div className="py-6 max-w-3xl mx-auto">
      <table className="w-full text-body">
        <thead className="bg-surface-muted">
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-foreground">Category</th>
            <th className="text-right py-3 px-4 font-medium text-foreground">Amount (USD)</th>
            <th className="text-right py-3 px-4 font-medium text-foreground">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-3 px-4 text-foreground">Development cooperation</td>
            <td className="text-right py-3 px-4 text-muted-foreground">{formatCurrency(data.development)}</td>
            <td className="text-right py-3 px-4 text-muted-foreground">{data.developmentPercent}%</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 px-4 text-destructive font-medium">Humanitarian assistance</td>
            <td className="text-right py-3 px-4 text-muted-foreground">{formatCurrency(data.humanitarian)}</td>
            <td className="text-right py-3 px-4 text-destructive font-medium">{data.humanitarianPercent}%</td>
          </tr>
          <tr className="bg-muted">
            <td className="py-3 px-4 font-semibold text-foreground">Total</td>
            <td className="text-right py-3 px-4 font-semibold text-foreground">{formatCurrency(data.total)}</td>
            <td className="text-right py-3 px-4 font-semibold text-foreground">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <ChartToolbarRow
        filters={
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('chart')}
              className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Pie Chart"
              aria-label="Pie Chart"
            >
              <PieChart className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('bar')}
              className={cn("h-8 w-8", viewMode === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('table')}
              className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        }
        csv={{ rows: exportRows, title: 'Share of Humanitarian Aid' }}
      />
      {viewMode === 'chart' && renderChartView()}
      {viewMode === 'bar' && renderBarView()}
      {viewMode === 'table' && renderTableView()}

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart shows the proportion of total aid that is classified as humanitarian versus development cooperation. The percentage reflects the share of commitments, disbursements, and expenditures flagged as humanitarian within the selected date range. Use the toggle to switch between the visual indicator, bar chart, and table views.
      </p>
    </>
  )
}






