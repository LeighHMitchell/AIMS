'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TOOLTIP_CLASSES } from '@/lib/chart-utils'

interface SubSectorItem {
  code: string
  name: string
  level: string
  activityCount: number
  commitments: number
  disbursements: number
  totalValue: number
}

interface SubSectorBreakdownProps {
  subSectors: SubSectorItem[]
  themeColor: string
  compact?: boolean
}

function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

export function SubSectorBreakdown({ subSectors, themeColor, compact = false }: SubSectorBreakdownProps) {
  const [expanded, setExpanded] = useState(!compact)

  const maxValue = Math.max(...subSectors.map(s => s.totalValue), 1)

  const chartData = subSectors
    .filter(s => s.totalValue > 0)
    .slice(0, compact ? 5 : 8)
    .map(s => ({
      name: s.code,
      value: s.totalValue,
      fullName: s.name,
      activityCount: s.activityCount,
    }))

  return (
    <div>
      {/* Top sub-sectors bar chart */}
      {chartData.length > 0 ? (
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
                tickFormatter={(v) => formatCurrencyShort(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                width={compact ? 35 : 45}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0]?.payload
                    return (
                      <div className={TOOLTIP_CLASSES}>
                        <p className="font-medium text-xs text-slate-900">{d?.name}: {d?.fullName}</p>
                        <p className="text-xs text-slate-600">{formatCurrencyShort(d?.value)}</p>
                        <p className="text-xs text-slate-600">{d?.activityCount} activities</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" fill={themeColor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center text-slate-400 text-xs">No sub-sector data</div>
      )}

      {/* Expandable card list */}
      {!compact && subSectors.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mb-2"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            All Sub-Sectors ({subSectors.length})
          </button>

          {expanded && (
            <div className="space-y-2">
              {subSectors.map(s => {
                const progressPct = maxValue > 0 ? (s.totalValue / maxValue) * 100 : 0

                return (
                  <Link
                    key={s.code}
                    href={`/sectors/${s.code}`}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <code
                      className="text-xs font-mono font-bold px-2 py-1 rounded text-white flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      {s.code}
                    </code>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${progressPct}%`, backgroundColor: themeColor }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{s.activityCount} activities</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrencyShort(s.totalValue)}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrencyShort(s.commitments)} / {formatCurrencyShort(s.disbursements)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
