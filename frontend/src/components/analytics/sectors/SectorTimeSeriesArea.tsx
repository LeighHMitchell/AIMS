"use client"

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartDataPoint, formatCurrency, formatTooltipCurrency, getYearTotal } from './sectorTimeSeriesQueries'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { generateSectorColorMap } from './sectorColorMap'

interface SectorTimeSeriesAreaProps {
  data: ChartDataPoint[]
  sectorNames: string[]
  sectorCodes?: Record<string, string>
  dataType: 'planned' | 'actual'
}

export function SectorTimeSeriesArea({
  data,
  sectorNames,
  sectorCodes = {},
  dataType
}: SectorTimeSeriesAreaProps) {
  // Generate consistent colors for sectors
  const colorMap = useMemo(() => generateSectorColorMap(sectorNames), [sectorNames])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => {
        const val = typeof entry.value === 'number' ? entry.value : 0
        return sum + val
      }, 0)

      // Filter out zero/null values and sort by value descending
      const filteredPayload = payload
        .filter((entry: any) => entry.value && entry.value > 0)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))

      if (filteredPayload.length === 0) return null

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-w-md text-sm">
          <div className="bg-surface-muted px-4 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900">Year: {label}</p>
            <p className="text-slate-600">
              Total: <span className="font-bold text-slate-900">{formatTooltipCurrency(total)}</span>
            </p>
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full">
              <tbody>
                {filteredPayload.map((entry: any, index: number) => {
                  const code = sectorCodes[entry.name] || ''
                  return (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-700">
                            {code && (
                              <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-xs mr-1.5">
                                {code}
                              </code>
                            )}
                            {entry.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                        {formatTooltipCurrency(entry.value)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom legend renderer for pill-style legend
  const renderLegend = (props: any) => {
    const { payload } = props
    
    return (
      <div className="flex flex-wrap gap-2 justify-center px-4 mt-2 mb-2">
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
            style={{ backgroundColor: `${entry.color}20` }}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-700 max-w-[150px] truncate">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available for the selected filters</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={500}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            {sectorNames.map((sector) => (
              <linearGradient
                key={sector}
                id={`gradient-${sector.replace(/[^a-zA-Z0-9]/g, '-')}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={colorMap[sector]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colorMap[sector]} stopOpacity={0.3} />
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          
          <XAxis
            dataKey="year"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          
          <YAxis
            tickFormatter={formatCurrency}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{
              value: 'Amount (USD mn)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            content={renderLegend}
            wrapperStyle={{ paddingTop: '20px' }}
          />

          {/* Render areas in reverse order so first items appear on top */}
          {[...sectorNames].reverse().map((sector) => (
            <Area
              key={sector}
              type="monotone"
              dataKey={sector}
              name={sector}
              stackId="1"
              stroke={colorMap[sector]}
              fill={`url(#gradient-${sector.replace(/[^a-zA-Z0-9]/g, '-')})`}
              strokeWidth={1}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

