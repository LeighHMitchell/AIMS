'use client'

import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { exportChartToCSV } from '@/lib/chart-export'

interface DonorData {
  id: string
  name: string
  acronym: string | null
  logo: string | null
  orgType: string | null
  totalCommitted: number
  totalDisbursed: number
  activityCount: number
}

interface SDGDonorRankingsProps {
  donors: DonorData[]
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

export function SDGDonorRankings({ donors, sdgColor, compact = false }: SDGDonorRankingsProps) {
  const [metric, setMetric] = useState<'disbursed' | 'committed' | 'activities'>('disbursed')

  const sortedDonors = [...donors].sort((a, b) => {
    if (metric === 'disbursed') return b.totalDisbursed - a.totalDisbursed
    if (metric === 'committed') return b.totalCommitted - a.totalCommitted
    return b.activityCount - a.activityCount
  })

  const chartDonors = sortedDonors.slice(0, compact ? 5 : 10)

  const chartData = chartDonors.map(d => ({
    name: d.acronym || d.name.substring(0, 20),
    value: metric === 'disbursed' ? d.totalDisbursed : metric === 'committed' ? d.totalCommitted : d.activityCount,
    fullName: d.name,
  }))

  const totalDisbursed = donors.reduce((sum, d) => sum + d.totalDisbursed, 0)

  const handleExport = () => {
    const exportData = sortedDonors.map((d, i) => ({
      Rank: i + 1,
      Organization: d.name,
      Acronym: d.acronym || '',
      Activities: d.activityCount,
      'Total Committed': d.totalCommitted,
      'Total Disbursed': d.totalDisbursed,
      '% of Total': totalDisbursed > 0 ? ((d.totalDisbursed / totalDisbursed) * 100).toFixed(1) + '%' : '0%',
    }))
    exportChartToCSV(exportData, 'SDG Donor Rankings')
  }

  if (donors.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
        No donor data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Metric Toggle */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['disbursed', 'committed', 'activities'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  metric === m
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m === 'disbursed' ? 'Disbursed' : m === 'committed' ? 'Committed' : 'Activities'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="text-xs h-7">
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      )}

      {/* Chart */}
      <div className={compact ? "h-48" : "h-64"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => metric === 'activities' ? v.toString() : formatCurrencyShort(v)}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              width={80}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className={TOOLTIP_CLASSES}>
                      <p className="font-medium text-xs text-slate-900 mb-1">{data.fullName}</p>
                      <p className="text-xs text-slate-600">
                        {metric === 'activities' ? `${data.value} activities` : formatCurrencyShort(data.value)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" fill={sdgColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked Table */}
      {!compact && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500 font-medium">#</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">Organization</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Activities</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Committed</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Disbursed</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedDonors.map((donor, i) => (
                <tr key={donor.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2 text-slate-400">{i + 1}</td>
                  <td className="py-2 px-2">
                    <span className="font-medium text-slate-900">{donor.name}</span>
                    {donor.acronym && <span className="text-slate-400 ml-1">({donor.acronym})</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600">{donor.activityCount}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{formatCurrencyShort(donor.totalCommitted)}</td>
                  <td className="py-2 px-2 text-right font-medium text-slate-900">{formatCurrencyShort(donor.totalDisbursed)}</td>
                  <td className="py-2 px-2 text-right text-slate-500">
                    {totalDisbursed > 0 ? ((donor.totalDisbursed / totalDisbursed) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
