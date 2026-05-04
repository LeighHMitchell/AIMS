"use client"

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartDataPoint, formatTooltipCurrency } from './sectorTimeSeriesQueries'
import { formatAxisCurrency } from '@/lib/format'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { generateSectorColorMap } from './sectorColorMap'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

interface SectorTimeSeriesLineProps {
  data: ChartDataPoint[]
  sectorNames: string[]
  sectorCodes?: Record<string, string>
  dataType: 'planned' | 'actual'
}

export function SectorTimeSeriesLine({
  data,
  sectorNames,
  sectorCodes = {},
  dataType
}: SectorTimeSeriesLineProps) {
  // Generate consistent colors for sectors
  const colorMap = useMemo(() => generateSectorColorMap(sectorNames), [sectorNames])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => {
        const val = typeof entry.value === 'number' ? entry.value : 0
        return sum + val
      }, 0)

      const filteredPayload = payload
        .filter((entry: any) => entry.value && entry.value > 0)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))

      if (filteredPayload.length === 0) return null

      const subtitle = (
        <span>
          Total: <span className="font-bold text-foreground">{formatTooltipCurrency(total)}</span>
        </span>
      )
      const rows = filteredPayload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(entry.value),
        color: entry.color || entry.stroke,
        code: sectorCodes[entry.name] || undefined,
      }))
      return (
        <ChartTooltipCard
          title={`Year: ${label}`}
          subtitle={subtitle}
          rows={rows}
          maxWidth={460}
        />
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
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground max-w-[150px] truncate">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No data available for the selected filters</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          
          <XAxis
            dataKey="year"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          
          <YAxis
            tickFormatter={formatAxisCurrency}
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

          {sectorNames.map((sector) => (
            <Line
              key={sector}
              type="monotone"
              dataKey={sector}
              name={sector}
              stroke={colorMap[sector]}
              strokeWidth={2}
              dot={{ r: 4, fill: colorMap[sector], strokeWidth: 0 }}
              activeDot={{ r: 6, fill: colorMap[sector], strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

