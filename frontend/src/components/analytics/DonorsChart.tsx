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
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'

interface DonorsChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    country?: string
    sector?: string
  }
  refreshKey: number
}

interface DonorData {
  name: string
  value: number
  shortName: string
}

export function DonorsChart({ dateRange, filters, refreshKey }: DonorsChartProps) {
  const [data, setData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('[DonorsChart] Starting data fetch...')
      
      // First get organizations to map IDs to names
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
      
      const orgMap = new Map(orgs?.map((o: any) => [o.id, o.name]) || [])
      console.log('[DonorsChart] Organization count:', orgMap.size)
      
      // Get disbursements grouped by donor
      let query = supabase
        .from('transactions')
        .select('provider_org_id, value')
        .eq('transaction_type', '3') // Disbursement
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
        .not('provider_org_id', 'is', null)
      
      // Apply filters would go here
      
      const { data: transactions, error } = await query
      
      if (error) {
        console.error('[DonorsChart] Query error:', error)
        return
      }
      
      console.log('[DonorsChart] Transactions found:', transactions?.length || 0)
      
      // Aggregate by donor
      const donorTotals = new Map<string, number>()
      
      transactions?.forEach((t: any) => {
        const current = donorTotals.get(t.provider_org_id) || 0
        const value = parseFloat(t.value) || 0
        if (!isNaN(value)) {
          donorTotals.set(t.provider_org_id, current + value)
        }
      })
      
      console.log('[DonorsChart] Unique donors:', donorTotals.size)
      
      // Convert to array and sort by value
      const sortedDonors = Array.from(donorTotals.entries())
        .map(([id, value]) => {
          const orgName = orgMap.get(id) as string || 'Unknown Donor'
          return {
            id,
            name: orgName,
            shortName: orgName.split(' ').slice(0, 2).join(' '),
            value: isNaN(value) || !isFinite(value) ? 0 : value
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10
      
      console.log('[DonorsChart] Top donors:', sortedDonors.map(d => ({ name: d.shortName, value: d.value })))
      setData(sortedDonors)
    } catch (error) {
      console.error('[DonorsChart] Error fetching donor data:', error)
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
      console.error('[DonorsChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Generate shades of slate for bars
  const barColors = [
    '#334155', // slate-700
    '#475569', // slate-600
    '#64748b', // slate-500
    '#94a3b8', // slate-400
    '#cbd5e1', // slate-300
    '#e2e8f0', // slate-200
    '#334155', // repeat
    '#475569',
    '#64748b',
    '#94a3b8'
  ]

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No donor disbursement data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={data}
        layout="horizontal"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#e2e8f0" 
          horizontal={false}
        />
        <XAxis 
          type="number"
          tickFormatter={formatCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          type="category"
          dataKey="shortName"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          width={90}
        />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
} 