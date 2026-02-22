"use client"

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingText } from '@/components/ui/loading-text'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
// Inline currency formatter to avoid initialization issues
const formatCurrencyAbbreviated = (value: number): string => {
  const isNegative = value < 0
  const absValue = Math.abs(value)

  let formatted = ''
  if (absValue >= 1000000000) {
    formatted = `$${(absValue / 1000000000).toFixed(1)}b`
  } else if (absValue >= 1000000) {
    formatted = `$${(absValue / 1000000).toFixed(1)}m`
  } else if (absValue >= 1000) {
    formatted = `$${(absValue / 1000).toFixed(1)}k`
  } else {
    formatted = `$${absValue.toFixed(0)}`
  }

  return isNegative ? `-${formatted}` : formatted
}

interface FundingSourceBreakdownProps {
  dateRange?: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey?: number
}

const COLORS = ['DATA_COLORS.actual', '#64748B', 'DATA_COLORS.disbursements', 'DATA_COLORS.expenditures', '#EF4444', 'DATA_COLORS.commitments', '#EC4899', '#14B8A6']

export function FundingSourceBreakdown({
  dateRange,
  filters,
  refreshKey
}: FundingSourceBreakdownProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fundingSourceData, setFundingSourceData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch transactions with provider organization info
        let transactionsQuery = supabase
          .from('transactions')
          .select(`
            value,
            provider_org_id,
            organizations:provider_org_id (
              id,
              name
            )
          `)
          .in('transaction_type', ['1', '2', '3', '11', '12']) // Incoming Funds, Commitments, Disbursements
          .eq('status', 'actual')
          .not('provider_org_id', 'is', null)

        // Apply date range filter
        if (dateRange) {
          transactionsQuery = transactionsQuery
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery

        if (transactionsError) {
          console.error('[FundingSourceBreakdown] Error fetching transactions:', transactionsError)
          setError('Failed to fetch funding source data')
          return
        }

        // Group by provider organization
        const sourceMap = new Map<string, { name: string; value: number }>()

        transactions?.forEach((transaction: any) => {
          const orgId = transaction.provider_org_id
          const orgName = transaction.organizations?.name || 'Unknown Organization'
          const value = parseFloat(String(transaction.value)) || 0

          if (!sourceMap.has(orgId)) {
            sourceMap.set(orgId, {
              name: orgName,
              value: 0
            })
          }

          sourceMap.get(orgId)!.value += Math.abs(value)
        })

        // Convert to array and sort by value descending
        const sortedSources = Array.from(sourceMap.values())
          .sort((a, b) => b.value - a.value)
          .filter(source => source.value > 0)

        // If more than 8 sources, group the rest as "Others"
        let finalSources = sortedSources
        if (sortedSources.length > 8) {
          const top7 = sortedSources.slice(0, 7)
          const others = sortedSources.slice(7)
          const othersValue = others.reduce((sum, source) => sum + source.value, 0)

          if (othersValue > 0) {
            finalSources = [
              ...top7,
              { name: 'Others', value: othersValue }
            ]
          }
        }

        setFundingSourceData(finalSources)
      } catch (err) {
        console.error('[FundingSourceBreakdown] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, filters, refreshKey])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  // Use the module-level currency formatter for tooltips
  const formatTooltipValue = formatCurrencyAbbreviated

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0]
      // Get color from payload fill (set by Cell component) or find from data
      let color = entry.payload?.fill || entry.color
      if (!color || typeof color !== 'string') {
        const dataIndex = fundingSourceData.findIndex(item => item.name === entry.name)
        color = dataIndex >= 0 ? COLORS[dataIndex % COLORS.length] : '#64748B'
        // Handle case where COLORS entry might be a string variable name
        if (typeof color === 'string' && !color.startsWith('#')) {
          color = '#64748B'
        }
      }
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground text-sm">{entry.name}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border last:border-b-0">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-foreground font-medium">Amount</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-foreground">
                    {formatTooltipValue(entry.value)}
                  </td>
                </tr>
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Funding Source Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of funding by donor/provider across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Funding Source Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of funding by donor/provider across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Funding Source Breakdown
        </CardTitle>
        <CardDescription>
          Distribution of funding by donor/provider across all activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fundingSourceData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={fundingSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748B', strokeWidth: 1 }}
                >
                  {fundingSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <p className="font-semibold text-foreground text-sm">Detailed Breakdown</p>
              <div className="space-y-2">
                {fundingSourceData.map((source, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-foreground">{source.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(source.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {((source.value / fundingSourceData.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No funding source data available</p>
              <p className="text-xs mt-2">Add participating organizations or transactions to see funding breakdown</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
