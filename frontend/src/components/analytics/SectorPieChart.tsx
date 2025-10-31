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
import { Skeleton } from '@/components/ui/skeleton'

interface SectorPieChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    country?: string
    donor?: string
  }
  refreshKey: number
}

interface SectorData {
  name: string
  value: number
  percentage: number
}

// Sector colors - limited palette of slate shades
const COLORS = [
  '#334155', // slate-700
  '#475569', // slate-600
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#cbd5e1', // slate-300
  '#e2e8f0', // slate-200
  '#f1f5f9'  // slate-100
]

export function SectorPieChart({ dateRange, filters, refreshKey }: SectorPieChartProps) {
  const [data, setData] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get activities with their sectors and transactions
      let query = supabase
        .from('activities')
        .select(`
          id,
          locations,
          activity_sectors (
            sector_code,
            sector_name,
            percentage
          ),
          transactions!inner (
            value,
            transaction_type,
            status,
            transaction_date,
            provider_org_id
          )
        `)
        .eq('publication_status', 'published')
        .eq('transactions.transaction_type', '3') // Disbursements
        .eq('transactions.status', 'actual')
        .gte('transactions.transaction_date', dateRange.from.toISOString())
        .lte('transactions.transaction_date', dateRange.to.toISOString())
      
      // Apply country filter if specified
      if (filters.country && filters.country !== 'all') {
        query = query.contains('locations', [{ country_code: filters.country }])
      }
      
      // Apply donor filter if specified
      if (filters.donor && filters.donor !== 'all') {
        query = query.eq('transactions.provider_org_id', filters.donor)
      }
      
      const { data: activities } = await query
      
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
        className="text-xs font-medium"
      >
        {`${Math.round(safePercentage)}%`}
      </text>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[300px] w-full bg-slate-100" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-slate-600">No sector data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
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
        <Tooltip 
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          labelStyle={{ color: '#94a3b8' }}
        />
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
  )
} 