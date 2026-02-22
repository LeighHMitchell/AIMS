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
  Cell
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { LoadingText } from '@/components/ui/loading-text'
import { differenceInDays } from 'date-fns'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface TimelinessChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
}

interface TimelinessData {
  donor: string
  onTimePercentage: number
  averageDelay: number
  totalTransactions: number
}

export function TimelinessChart({ dateRange, filters, refreshKey }: TimelinessChartProps) {
  const [data, setData] = useState<TimelinessData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
      
      const orgMap = new Map(orgs?.map((o: any) => [o.id, o.name]) || [])
      
      // Get transactions with their activities
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          provider_org_id,
          transaction_date,
          value,
          activities!inner (
            planned_end_date,
            actual_end_date
          )
        `)
        .eq('transaction_type', '3') // Disbursements
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
        .not('provider_org_id', 'is', null)
      
      // Calculate timeliness by donor
      const donorStats = new Map<string, { onTime: number, total: number, totalDelay: number }>()
      
      transactions?.forEach((t: any) => {
        const donorId = t.provider_org_id
        const activity = t.activities
        
        if (!donorStats.has(donorId)) {
          donorStats.set(donorId, { onTime: 0, total: 0, totalDelay: 0 })
        }
        
        const stats = donorStats.get(donorId)!
        stats.total++
        
        // Check if transaction was on time
        const targetDate = activity.actual_end_date || activity.planned_end_date
        if (targetDate && t.transaction_date) {
          const delay = differenceInDays(new Date(t.transaction_date), new Date(targetDate))
          
          if (delay <= 0) {
            stats.onTime++
          } else {
            stats.totalDelay += delay
          }
        }
      })
      
      // Convert to array format with extensive validation
      const timelinessData: TimelinessData[] = Array.from(donorStats.entries())
        .map(([donorId, stats]) => {
          const donorName = orgMap.get(donorId) || 'Unknown Donor'
          
          // Extensive validation for onTimePercentage
          let onTimePercentage = 0
          if (stats.total > 0 && Number.isFinite(stats.onTime) && Number.isFinite(stats.total)) {
            const percentage = (stats.onTime / stats.total) * 100
            if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 100) {
              onTimePercentage = Math.round(percentage)
            }
          }
          
          // Extensive validation for averageDelay
          let averageDelay = 0
          const lateTransactions = stats.total - stats.onTime
          if (lateTransactions > 0 && Number.isFinite(stats.totalDelay) && Number.isFinite(lateTransactions)) {
            const delay = stats.totalDelay / lateTransactions
            if (Number.isFinite(delay) && delay >= 0) {
              averageDelay = Math.round(delay)
            }
          }
          
          // Ensure all values are safe for Recharts
          const safeData = {
            donor: String(donorName).split(' ').slice(0, 2).join(' '), // Shorten name
            onTimePercentage: Number.isFinite(onTimePercentage) ? Math.max(0, Math.min(100, onTimePercentage)) : 0,
            averageDelay: Number.isFinite(averageDelay) ? Math.max(0, averageDelay) : 0,
            totalTransactions: Number.isFinite(stats.total) ? Math.max(0, stats.total) : 0
          }
          
          return safeData
        })
        .filter(d => d.totalTransactions >= 5 && Number.isFinite(d.onTimePercentage)) // Only show donors with valid data
        .sort((a, b) => b.onTimePercentage - a.onTimePercentage)
        .slice(0, 10) // Top 10
      
      // Final validation before setting data
      const validData = timelinessData.filter(item => {
        const isValid = Number.isFinite(item.onTimePercentage) && 
                       Number.isFinite(item.averageDelay) && 
                       Number.isFinite(item.totalTransactions) &&
                       item.onTimePercentage >= 0 && 
                       item.onTimePercentage <= 100 &&
                       item.averageDelay >= 0 &&
                       item.totalTransactions > 0
        
        if (!isValid) {
          console.warn('[TimelinessChart] Filtering out invalid data:', item)
        }
        
        return isValid
      })
      
      setData(validData)
    } catch (error) {
      console.error('Error fetching timeliness data:', error)
      setData([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  // Color based on performance
  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return '#475569' // slate-600
    if (percentage >= 60) return '#64748b' // slate-500
    if (percentage >= 40) return '#94a3b8' // slate-400
    return '#cbd5e1' // slate-300
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  // Don't render if data is empty or invalid
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-slate-500">
        <p>No timeliness data available for the selected period</p>
      </div>
    )
  }

  try {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_STRUCTURE_COLORS.grid}
            horizontal={false}
          />
          <XAxis 
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${Number.isFinite(value) ? value : 0}%`}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            type="category"
            dataKey="donor"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
            width={90}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload as TimelinessData
                return (
                  <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
                    <p className="font-medium">{data.donor}</p>
                    <p className="text-sm">On-time: {Number.isFinite(data.onTimePercentage) ? data.onTimePercentage : 0}%</p>
                    <p className="text-sm">Avg delay: {Number.isFinite(data.averageDelay) ? data.averageDelay : 0} days</p>
                    <p className="text-sm">Total: {Number.isFinite(data.totalTransactions) ? data.totalTransactions : 0} transactions</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="onTimePercentage" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.onTimePercentage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  } catch (error) {
    console.error('[TimelinessChart] Render error:', error)
    return (
      <div className="flex items-center justify-center h-[400px] text-red-500">
        <p>Error rendering timeliness chart</p>
      </div>
    )
  }
} 