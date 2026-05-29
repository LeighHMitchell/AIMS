"use client"

import React, { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { METRIC_LABEL, metricColor, type Metric } from '../shared/metric-options'
import type { SectorSlice } from './types'

interface BarViewProps {
  slices: SectorSlice[]
  height: number
  // Selected financial metrics — one grouped bar per metric per sector.
  metrics: Metric[]
}

interface SectorBarDatum {
  sector: string
  fullName: string
  code: string
  groupCode: string
  groupName: string
  activityCount: number
  // One numeric field per selected metric key (e.g. tx_3, budgets) + the
  // index/meta fields above. Required by Nivo's BarDatum constraint.
  [key: string]: string | number
}

function TitleWithCode({ code, name }: { code: string; name: string }) {
  if (!code) return <>{name}</>
  return (
    <>
      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground mr-2 align-middle">
        {code}
      </code>
      <span className="align-middle">{name}</span>
    </>
  )
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function BarView({ slices, height, metrics }: BarViewProps) {
  const isExpanded = useChartExpansion()

  const data = useMemo<SectorBarDatum[]>(() => {
    // Nivo renders the first datum at the bottom of a horizontal chart; reverse
    // so the largest sector ends up on top. Each datum carries one numeric
    // field per selected metric so Nivo can draw grouped bars.
    return slices
      .filter(s => s.value > 0)
      .map(s => {
        const datum: SectorBarDatum = {
          sector: s.name,
          fullName: s.name,
          code: s.code,
          groupCode: s.groupCode,
          groupName: s.groupName,
          activityCount: s.activityCount,
        }
        for (const m of metrics) datum[m] = s.metrics[m] || 0
        return datum
      })
      .reverse()
  }, [slices, metrics])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  return (
    // Match the SunburstView pattern: a single sized container (no internal
    // overflow scroll) so Nivo's built-in tooltip — which measures its own
    // content to position itself — is never clipped or zeroed out. All bars
    // fit the height; at sub-sector level they get thinner, like the other
    // views. [&_svg]:max-w-none unsets the global svg max-width:100%.
    <div className="w-full [&_svg]:max-w-none" style={{ height, width: '100%' }}>
      <ResponsiveBar
        data={data}
        keys={metrics}
        indexBy="sector"
        layout="horizontal"
        groupMode="grouped"
        margin={{ top: 8, right: 24, bottom: 40, left: 180 }}
        padding={0.25}
        innerPadding={metrics.length > 1 ? 1 : 0}
        colors={({ id }) => metricColor(id as Metric)}
        enableGridX
        enableGridY={false}
        axisBottom={{
          tickSize: 4,
          tickPadding: 6,
          format: (v: any) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(Number(v) || 0),
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (v: any) => truncate(String(v), 24),
        }}
        enableLabel={false}
        theme={{
          axis: {
            ticks: { text: { fontSize: 11, fill: '#64748b' } },
            legend: { text: { fontSize: 12, fill: '#475569' } },
          },
          grid: { line: { stroke: '#e2e8f0', strokeDasharray: '2 2' } },
        }}
        tooltip={({ data: d }) => {
          const datum = d as SectorBarDatum
          const rows = metrics.map(m => ({
            label: METRIC_LABEL[m],
            value: formatTooltipCurrency(Number(datum[m]) || 0, isExpanded),
            color: metricColor(m),
          }))
          rows.push({
            label: 'Activities',
            value: (datum.activityCount ?? 0).toLocaleString(),
            color: '#94a3b8',
          })
          return (
            <ChartTooltipCard
              title={<TitleWithCode code={datum.code} name={datum.fullName} />}
              rows={rows}
            />
          )
        }}
        animate={false}
        ariaLabel="Aid disbursements by sector"
      />
    </div>
  )
}
