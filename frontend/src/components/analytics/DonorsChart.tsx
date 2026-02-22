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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, DollarSign, Wallet, Calendar } from 'lucide-react'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

type ViewMode = 'budgets' | 'disbursements' | 'planned'

interface DonorsChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: DonorData[]) => void
}

interface DonorData {
  name: string
  value: number
  shortName: string
}

export function DonorsChart({ dateRange, refreshKey, onDataChange }: DonorsChartProps) {
  const [data, setData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('disbursements')

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey, viewMode])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('[DonorsChart] Starting data fetch for view:', viewMode)

      // First get organizations to map IDs to names
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')

      const orgMap = new Map(orgs?.map((o: any) => [o.id, o.name]) || [])
      console.log('[DonorsChart] Organization count:', orgMap.size)

      const donorTotals = new Map<string, number>()

      if (viewMode === 'budgets') {
        // Query budgets
        const { data: budgets, error } = await supabase
          .from('budgets')
          .select('activity_id, value_usd')
          .gte('period_start', dateRange.from.toISOString())
          .lte('period_end', dateRange.to.toISOString())

        if (error) {
          console.error('[DonorsChart] Budgets query error:', error)
          setLoading(false)
          return
        }

        // Get activity IDs to find funding orgs
        const activityIds = [...new Set(budgets?.map(b => b.activity_id) || [])]

        if (activityIds.length > 0) {
          const { data: participatingOrgs } = await supabase
            .from('participating_organizations')
            .select('activity_id, organization_id, role')
            .in('activity_id', activityIds)
            .eq('role', '1') // Funding role

          // Map activity to funding orgs
          const activityToOrgs = new Map<string, string[]>()
          participatingOrgs?.forEach(po => {
            if (!activityToOrgs.has(po.activity_id)) {
              activityToOrgs.set(po.activity_id, [])
            }
            activityToOrgs.get(po.activity_id)!.push(po.organization_id)
          })

          // Aggregate budgets by funding org
          budgets?.forEach((budget: any) => {
            const fundingOrgs = activityToOrgs.get(budget.activity_id) || []
            const budgetValue = parseFloat(budget.value_usd) || 0

            if (fundingOrgs.length > 0 && !isNaN(budgetValue)) {
              // Split budget equally among funding orgs
              const valuePerOrg = budgetValue / fundingOrgs.length
              fundingOrgs.forEach(orgId => {
                const current = donorTotals.get(orgId) || 0
                donorTotals.set(orgId, current + valuePerOrg)
              })
            }
          })
        }
      } else if (viewMode === 'disbursements') {
        // Query actual disbursements
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('provider_org_id, value_usd')
          .eq('transaction_type', '3') // Disbursement
          .gte('transaction_date', dateRange.from.toISOString())
          .lte('transaction_date', dateRange.to.toISOString())
          .not('provider_org_id', 'is', null)

        if (error) {
          console.error('[DonorsChart] Disbursements query error:', error)
          setLoading(false)
          return
        }

        transactions?.forEach((t: any) => {
          const current = donorTotals.get(t.provider_org_id) || 0
          const value = parseFloat(t.value_usd) || 0
          if (!isNaN(value)) {
            donorTotals.set(t.provider_org_id, current + value)
          }
        })
      } else if (viewMode === 'planned') {
        // Query planned disbursements
        const { data: plannedDisbursements, error } = await supabase
          .from('planned_disbursements')
          .select('activity_id, value_usd, period_start, period_end')
          .gte('period_start', dateRange.from.toISOString())
          .lte('period_end', dateRange.to.toISOString())

        if (error) {
          console.error('[DonorsChart] Planned disbursements query error:', error)
          setLoading(false)
          return
        }

        // Get activity IDs to find funding orgs
        const activityIds = [...new Set(plannedDisbursements?.map(pd => pd.activity_id) || [])]

        if (activityIds.length > 0) {
          const { data: participatingOrgs } = await supabase
            .from('participating_organizations')
            .select('activity_id, organization_id, role')
            .in('activity_id', activityIds)
            .eq('role', '1') // Funding role

          // Map activity to funding orgs
          const activityToOrgs = new Map<string, string[]>()
          participatingOrgs?.forEach(po => {
            if (!activityToOrgs.has(po.activity_id)) {
              activityToOrgs.set(po.activity_id, [])
            }
            activityToOrgs.get(po.activity_id)!.push(po.organization_id)
          })

          // Aggregate planned disbursements by funding org
          plannedDisbursements?.forEach((pd: any) => {
            const fundingOrgs = activityToOrgs.get(pd.activity_id) || []
            const plannedValue = parseFloat(pd.value_usd) || 0

            if (fundingOrgs.length > 0 && !isNaN(plannedValue)) {
              // Split planned disbursement equally among funding orgs
              const valuePerOrg = plannedValue / fundingOrgs.length
              fundingOrgs.forEach(orgId => {
                const current = donorTotals.get(orgId) || 0
                donorTotals.set(orgId, current + valuePerOrg)
              })
            }
          })
        }
      }

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
      onDataChange?.(sortedDonors)
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
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  const getViewLabel = () => {
    switch (viewMode) {
      case 'budgets':
        return 'budget data'
      case 'disbursements':
        return 'disbursement data'
      case 'planned':
        return 'planned disbursement data'
    }
  }

  const getViewIcon = () => {
    switch (viewMode) {
      case 'budgets':
        return <Wallet className="h-4 w-4" />
      case 'disbursements':
        return <DollarSign className="h-4 w-4" />
      case 'planned':
        return <Calendar className="h-4 w-4" />
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        {/* View Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getViewIcon()}
            <span>Viewing by:</span>
          </div>
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budgets">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>Total Budgets</span>
                </div>
              </SelectItem>
              <SelectItem value="disbursements">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Disbursements</span>
                </div>
              </SelectItem>
              <SelectItem value="planned">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Total Planned Disbursements</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No donor {getViewLabel()} available</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your date range or filters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getViewIcon()}
          <span>Viewing by:</span>
        </div>
        <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="budgets">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>Total Budgets</span>
              </div>
            </SelectItem>
            <SelectItem value="disbursements">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Disbursements</span>
              </div>
            </SelectItem>
            <SelectItem value="planned">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Total Planned Disbursements</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          content={({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-surface-muted px-3 py-2 border-b border-border">
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                  </div>
                  <div className="p-2">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-4 text-foreground font-medium">Amount</td>
                          <td className="py-1 text-right font-semibold text-foreground">{formatCurrency(payload[0].value)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
            return null
          }}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
} 