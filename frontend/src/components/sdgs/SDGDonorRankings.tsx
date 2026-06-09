'use client'

import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { formatCurrencyShort, formatAxisCurrency } from '@/lib/format'
import { exportChartToCSV } from '@/lib/chart-export'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
    exportChartToCSV(exportData, 'SDG Development Partner Rankings')
  }

  if (donors.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-muted-foreground text-helper">
        No development partner data available
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
                className={`text-helper px-2.5 py-1 rounded-md transition-colors ${
                  metric === m
                    ? 'bg-foreground text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                {m === 'disbursed' ? 'Disbursed' : m === 'committed' ? 'Committed' : 'Activities'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="text-helper h-7">
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
              tickFormatter={(v) => metric === 'activities' ? v.toString() : formatAxisCurrency(v)}
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
                      <p className="font-medium text-helper text-foreground mb-1">{data.fullName}</p>
                      <p className="text-helper text-muted-foreground">
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
        <Table className="border-0">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead className="text-right">Activities</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Disbursed</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDonors.map((donor, i) => (
              <TableRow key={donor.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium text-foreground">{donor.name}</span>
                  {donor.acronym && <span className="text-muted-foreground ml-1">({donor.acronym})</span>}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{donor.activityCount}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrencyShort(donor.totalCommitted)}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{formatCurrencyShort(donor.totalDisbursed)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalDisbursed > 0 ? ((donor.totalDisbursed / totalDisbursed) * 100).toFixed(1) : '0.0'}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
