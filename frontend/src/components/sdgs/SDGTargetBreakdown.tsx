'use client'

import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/chart-utils'
import { TOOLTIP_CLASSES } from '@/lib/chart-utils'

interface TargetData {
  targetId: string
  targetText: string
  activityCount: number
  commitments: number
  disbursements: number
  totalValue: number
}

interface SDGTargetBreakdownProps {
  targets: TargetData[]
  sdgColor: string
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

export function SDGTargetBreakdown({ targets, sdgColor, compact = false }: SDGTargetBreakdownProps) {
  const [showAll, setShowAll] = useState(false)

  const fundedTargets = targets.filter(t => t.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue)
  const unfundedTargets = targets.filter(t => t.totalValue === 0 && t.targetId !== 'general')

  const chartData = fundedTargets.map(t => ({
    name: t.targetId,
    commitments: t.commitments,
    disbursements: t.disbursements,
  }))

  const displayTargets = showAll ? fundedTargets : fundedTargets.slice(0, compact ? 5 : 10)

  return (
    <div className="space-y-6">
      {/* Chart */}
      {chartData.length > 0 && (
        <div className={compact ? "h-48" : "h-72"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => formatCurrency(v)} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={40} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={TOOLTIP_CLASSES}>
                        <p className="font-medium text-xs text-slate-900 mb-1">Target {payload[0].payload.name}</p>
                        {payload.map((entry: any, i: number) => (
                          <p key={i} className="text-xs text-slate-600">
                            {entry.name}: {formatCurrencyShort(entry.value)}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="commitments" name="Commitments" fill={sdgColor} radius={[0, 4, 4, 0]} />
              <Bar dataKey="disbursements" name="Disbursements" fill={`${sdgColor}99`} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Target Cards */}
      <div className="space-y-2">
        {displayTargets.map(target => {
          const disbursedPercent = target.commitments > 0 ? (target.disbursements / target.commitments) * 100 : 0
          return (
            <div key={target.targetId} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: sdgColor }}
                    >
                      {target.targetId}
                    </span>
                    <span className="text-xs text-slate-500">{target.activityCount} activit{target.activityCount === 1 ? 'y' : 'ies'}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{target.targetText}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrencyShort(target.totalValue)}</p>
                  <p className="text-xs text-slate-500">{formatCurrencyShort(target.disbursements)} disbursed</p>
                </div>
              </div>
              {target.commitments > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(disbursedPercent, 100)}%`,
                      backgroundColor: sdgColor,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {fundedTargets.length > (compact ? 5 : 10) && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            {showAll ? 'Show less' : `Show all ${fundedTargets.length} funded targets`}
          </button>
        )}
      </div>

      {/* Unfunded Targets */}
      {unfundedTargets.length > 0 && !compact && (
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Unfunded Targets</p>
          <div className="flex flex-wrap gap-2">
            {unfundedTargets.map(target => (
              <span
                key={target.targetId}
                className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-400"
                title={target.targetText}
              >
                {target.targetId}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
