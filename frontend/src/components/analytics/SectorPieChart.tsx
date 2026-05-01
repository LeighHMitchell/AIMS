"use client"

import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { CHART_RANKED_PALETTE } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'

interface SectorPieChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: SectorData[]) => void
}

interface SectorData {
  name: string
  value: number
  percentage: number
}

// Shared monochromatic slate ramp — keeps this chart visually consistent
// with the Top 10 Partners chart and other ranked breakdowns on the dashboard.
const COLORS = CHART_RANKED_PALETTE

export function SectorPieChart({ dateRange, refreshKey, onDataChange }: SectorPieChartProps) {
  const isExpanded = useChartExpansion()
  const [data, setData] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get activities with their sectors and transactions
      const { data: activities } = await supabase
        .from('activities')
        .select(`
          id,
          activity_sectors (
            sector_code,
            sector_name,
            percentage
          ),
          transactions:transactions!transactions_activity_id_fkey1!inner (
            value,
            transaction_type,
            status,
            transaction_date
          )
        `)
        .eq('publication_status', 'published')
        .eq('transactions.transaction_type', '3') // Disbursements
        .eq('transactions.status', 'actual')
        .gte('transactions.transaction_date', dateRange.from.toISOString())
        .lte('transactions.transaction_date', dateRange.to.toISOString())
      
      // Aggregate by sector
      const sectorTotals = new Map<string, number>()
      
      activities?.forEach((activity: any) => {
        const transactions = activity.transactions || []
        const sectors = activity.activity_sectors || []
        
        // Calculate total transaction value for this activity
        const activityTotal = transactions.reduce((sum: number, t: any) => {
          const value = parseFloat(t.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)
        
        // Distribute among sectors based on percentage
        if (sectors.length > 0) {
          sectors.forEach((sector: any) => {
            const percentage = parseFloat(sector.percentage || '100') || 100
            if (!isNaN(percentage) && isFinite(percentage) && !isNaN(activityTotal)) {
              const sectorAmount = activityTotal * (percentage / 100)
              if (!isNaN(sectorAmount) && isFinite(sectorAmount)) {
                const current = sectorTotals.get(sector.sector_name) || 0
                sectorTotals.set(sector.sector_name, current + sectorAmount)
              }
            }
          })
        } else {
          // If no sectors, put in "Unspecified"
          const current = sectorTotals.get('Unspecified') || 0
          sectorTotals.set('Unspecified', current + activityTotal)
        }
      })
      
      // Convert to array and calculate percentages
      const total = Array.from(sectorTotals.values()).reduce((sum, val) => {
        const value = parseFloat(val as any) || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
      
      const sectorData = Array.from(sectorTotals.entries())
        .map(([name, value]) => {
          const percentage = total > 0 && !isNaN(value) && !isNaN(total) 
            ? (value / total) * 100 
            : 0
          return {
            name,
            value,
            percentage: isNaN(percentage) ? 0 : percentage
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 7) // Limit to 7 sectors as requested
      
      // If there are more than 7 sectors, group the rest as "Others"
      if (sectorTotals.size > 7) {
        const othersValue = Array.from(sectorTotals.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(7)
          .reduce((sum, [, value]) => {
            const val = parseFloat(value as any) || 0
            return sum + (isNaN(val) ? 0 : val)
          }, 0)
        
        if (othersValue > 0 && total > 0) {
          const othersPercentage = (othersValue / total) * 100
          sectorData.push({
            name: 'Others',
            value: othersValue,
            percentage: isNaN(othersPercentage) || !isFinite(othersPercentage) ? 0 : othersPercentage
          })
        }
      }
      
      // Final safety check: ensure no NaN or Infinity values in the data
      const safeData = sectorData.map(item => ({
        ...item,
        value: isNaN(item.value) || !isFinite(item.value) ? 0 : item.value,
        percentage: isNaN(item.percentage) || !isFinite(item.percentage) ? 0 : item.percentage
      }))

      setData(safeData)
      onDataChange?.(safeData)
    } catch (error) {
      console.error('Error fetching sector data:', error)
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
      console.error('[SectorPieChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props
    
    // Guard against invalid percentage values
    const safePercentage = isNaN(percentage) || !isFinite(percentage) ? 0 : percentage
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    if (safePercentage < 5) return null // Don't show label for small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="#fff" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-helper font-medium"
      >
        {`${Math.round(safePercentage)}%`}
      </text>
    )
  }

  // Tooltip styled to match the Financial Totals chart (light card, header
  // strip, table body) so hover UI is consistent across the dashboard.
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0]
    const sectorName = item.name
    const value = item.value
    const percentage = item.payload?.percentage
    const swatch = item.payload?.fill || item.color
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
        <div className="bg-surface-muted px-3 py-2 border-b border-border">
          <p className="font-semibold text-foreground">{sectorName}</p>
        </div>
        <div className="p-3">
          <table className="w-full text-body">
            <tbody>
              <tr>
                <td className="py-1 pr-3 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: swatch }}
                  />
                  <span className="text-foreground">Disbursements</span>
                </td>
                <td className="py-1 text-right font-semibold text-foreground">
                  {formatTooltipCurrency(value, isExpanded)}
                </td>
              </tr>
              {typeof percentage === 'number' && !isNaN(percentage) && (
                <tr>
                  <td className="py-1 pr-3 text-muted-foreground">Share of total</td>
                  <td className="py-1 text-right font-semibold text-foreground">
                    {percentage.toFixed(1)}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground">No sector data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              color: '#64748b'
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed mt-4">
        This pie chart shows the distribution of disbursement spending across DAC sectors. Each slice represents a sector weighted by actual disbursement value, with the top seven sectors shown individually and smaller sectors grouped under Others. Hover over any slice to see the exact amount in USD.
      </p>
    </div>
  )
} 