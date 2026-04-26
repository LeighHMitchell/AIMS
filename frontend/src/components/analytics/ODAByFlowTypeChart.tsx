"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { BarChart3, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface ODAByFlowTypeChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: FlowData[]) => void
}

interface FlowData {
  code: string
  label: string
  category: string
  totalValue: number
}

export function ODAByFlowTypeChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange
}: ODAByFlowTypeChartProps) {
  const [data, setData] = useState<FlowData[]>([])
  const [loading, setLoading] = useState(true)
  const [includeNonODA, setIncludeNonODA] = useState(false)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, includeNonODA])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        includeNonODA: includeNonODA.toString()
      })
      
      if (filters?.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters?.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      const response = await apiFetch(`/api/analytics/top-10/oda-by-flow-type?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      const flows = result.flows || []
      setData(flows)
      onDataChange?.(flows)
    } catch (error) {
      console.error('[ODAByFlowTypeChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '$0'
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(safeValue)
    } catch (error) {
      console.error('[ODAByFlowTypeChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Generate colors by category
  const getColorForCategory = (category: string, index: number): string => {
    const colors: Record<string, string[]> = {
      'ODA': ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'], // Blue shades
      'OOF': ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d'], // Amber shades
      'Other': ['#64748b', '#94a3b8', '#cbd5e1'], // Slate shades
      'Unknown': ['#6b7280']
    };

    const categoryColors = colors[category] || colors['Unknown'];
    return categoryColors[index % categoryColors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const datum = payload[0]?.payload
      const color = payload[0]?.color || payload[0]?.payload?.fill
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground">{label}</p>
            {datum?.category && (
              <p className="text-helper text-muted-foreground mt-0.5">{datum.category}</p>
            )}
          </div>
          <div className="p-3">
            <table className="w-full text-body">
              <tbody>
                <tr>
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-foreground">Total Value</span>
                    </div>
                  </td>
                  <td className="py-1 text-right font-semibold text-foreground">
                    {formatCurrency(Number(payload[0].value) || 0)}
                  </td>
                </tr>
                {datum?.code && (
                  <tr>
                    <td className="py-1 pr-3 text-muted-foreground">Code</td>
                    <td className="py-1 text-right font-mono text-foreground">
                      {datum.code}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No flow type data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toggle for non-ODA flows */}
      <div className="flex items-center space-x-2 pb-2">
        <Switch
          id="include-non-oda"
          checked={includeNonODA}
          onCheckedChange={setIncludeNonODA}
        />
        <Label htmlFor="include-non-oda" className="text-body font-medium cursor-pointer">
          Include Non-ODA Flows (OOF, Private, etc.)
        </Label>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis 
            dataKey="label"
            angle={-45}
            textAnchor="end"
            height={120}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Legend />
          <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColorForCategory(entry.category, index)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-body">
        {data.length > 0 && (
          <>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-900">
                {formatCurrency(data.filter(f => f.category === 'ODA').reduce((sum, f) => sum + f.totalValue, 0))}
              </div>
              <div className="text-blue-600 text-helper">Total ODA</div>
            </div>
            {includeNonODA && (
              <>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="font-semibold text-amber-900">
                    {formatCurrency(data.filter(f => f.category === 'OOF').reduce((sum, f) => sum + f.totalValue, 0))}
                  </div>
                  <div className="text-amber-600 text-helper">Total OOF</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold text-foreground">
                    {formatCurrency(data.filter(f => f.category === 'Other').reduce((sum, f) => sum + f.totalValue, 0))}
                  </div>
                  <div className="text-muted-foreground text-helper">Total Other</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart breaks down Official Development Assistance by IATI flow type classification, showing how aid is categorised across grants, loans, equity, and other instruments. Toggle the non-ODA switch to include Other Official Flows and private flows for a broader picture. The summary cards below the chart show aggregate totals by category.
      </p>
    </div>
  )
}















