"use client"

import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { useChartExpansion } from '@/lib/chart-expansion-context'

/**
 * Activity timeliness — counts of published activities by how their actual end
 * date compares to plan (early / on time / late / very late / in progress /
 * missing). Horizontal bar; pushes a per-activity list to the parent card for
 * the table view + CSV. Presentational data comes from /api/analytics/activity-timeliness.
 */

interface BucketRow { bucket: string; count: number; order: number }
interface ActivityRow {
  id: string
  title: string
  plannedEnd: string | null
  actualEnd: string | null
  delayDays: number | null
  bucket: string
  href: string
}

interface Props {
  refreshKey?: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

// Semantic colour per bucket: early=blue, on-time=green, late=amber,
// very-late=red, in-progress=slate, missing=light grey.
const BUCKET_COLOR: Record<string, string> = {
  'Finished early': '#006ba2',
  'On time (±30 days)': '#16a34a',
  'Finished late (≤6 months)': '#f59e0b',
  'Finished very late (>6 months)': '#dc2626',
  'In progress / no end recorded': '#64748b',
  'Missing planned end date': '#cbd5e1',
}

export function ActivityTimelinessChart({ refreshKey = 0, onDataChange, compact = false }: Props) {
  const isExpanded = useChartExpansion()
  const [buckets, setBuckets] = useState<BucketRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch('/api/analytics/activity-timeliness')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { buckets: BucketRow[]; activities: ActivityRow[] }) => {
        if (cancelled) return
        setBuckets(json.buckets || [])
        onDataChange?.(
          (json.activities || []).map((a) => ({
            Activity: a.title,
            'Planned End': a.plannedEnd ? a.plannedEnd.slice(0, 10) : '',
            'Actual End': a.actualEnd ? a.actualEnd.slice(0, 10) : '',
            'Delay (days)': a.delayDays ?? '',
            Status: a.bucket,
            'Activity URL': new URL(a.href, window.location.origin).toString(),
          }))
        )
      })
      .catch(() => !cancelled && setBuckets([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // onDataChange is a stable setter from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  if (loading) {
    return <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">Loading…</div>
  }
  if (buckets.length === 0 || buckets.every((b) => b.count === 0)) {
    return <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">No data available</div>
  }

  const height = isExpanded ? 380 : 260

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={buckets}
        layout="vertical"
        margin={{ top: 8, right: 24, bottom: 8, left: compact ? 8 : 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis
          type="category"
          dataKey="bucket"
          width={compact ? 120 : 210}
          tick={{ fontSize: 11, fill: '#334155' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as BucketRow
            return (
              <div className="rounded-md border border-border bg-white px-3 py-2 shadow-sm text-body">
                <div className="font-medium text-foreground">{d.bucket}</div>
                <div className="text-muted-foreground">{d.count.toLocaleString()} activities</div>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[0, 2, 2, 0]} isAnimationActive={!isExpanded}>
          {buckets.map((b, i) => (
            <Cell key={i} fill={BUCKET_COLOR[b.bucket] ?? '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
