'use client'

import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { formatCurrencyShort, formatAxisCurrency } from '@/lib/format'

interface SignificanceItem {
  significance: number
  label: string
  count: number
  totalValue: number
}

interface SignificanceDistributionProps {
  distribution: SignificanceItem[]
  themeColor: string
  compact?: boolean
}

export function SignificanceDistribution({ distribution, themeColor, compact = false }: SignificanceDistributionProps) {
  const [expanded, setExpanded] = useState(!compact)

  const totalCount = distribution.reduce((sum, d) => sum + d.count, 0)
  const totalValue = distribution.reduce((sum, d) => sum + d.totalValue, 0)

  // Color gradient from light to dark
  const getColorForSignificance = (sig: number) => {
    const opacity = 0.3 + (sig / 4) * 0.7
    return `${themeColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  }

  const chartData = distribution.map(d => ({
    ...d,
    name: `Sig ${d.significance}`,
    color: getColorForSignificance(d.significance),
  }))

  return (
    <div>
      {/* Horizontal bar chart */}
      {distribution.length > 0 ? (
        <div className={compact ? 'h-36' : 'h-56'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                tickFormatter={formatAxisCurrency}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                width={compact ? 60 : 120}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0]?.payload
                    return (
                      <div className={TOOLTIP_CLASSES}>
                        <p className="font-medium text-helper text-foreground">{d?.label}</p>
                        <p className="text-helper text-muted-foreground">{d?.count} activities</p>
                        <p className="text-helper text-muted-foreground">{formatCurrencyShort(d?.totalValue)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center text-muted-foreground text-helper">No significance data</div>
      )}

      {/* Expandable details list */}
      {!compact && distribution.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-helper font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Significance Breakdown
          </button>

          {expanded && (
            <div className="space-y-2">
              {distribution.map(d => {
                const pctCount = totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : '0'
                const pctValue = totalValue > 0 ? ((d.totalValue / totalValue) * 100).toFixed(1) : '0'

                return (
                  <div key={d.significance} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: getColorForSignificance(d.significance) }}
                    >
                      {d.significance}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-foreground">{d.label}</p>
                      <p className="text-helper text-muted-foreground">{d.count} activities ({pctCount}%)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-semibold text-foreground">{formatCurrencyShort(d.totalValue)}</p>
                      <p className="text-helper text-muted-foreground">{pctValue}% of total</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
