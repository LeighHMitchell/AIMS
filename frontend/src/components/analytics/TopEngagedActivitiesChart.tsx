"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { InlineToolbarButtons, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { Eye, MessageSquare, Bookmark, Users } from 'lucide-react'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types'
import { apiFetch } from '@/lib/api-fetch'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

export type EngagementMetric = 'views' | 'comments' | 'bookmarks' | 'partners'

// Per-metric labels + empty-state copy. Title/description live on the card.
const METRIC_META: Record<EngagementMetric, { label: string; icon: React.ComponentType<{ className?: string }>; emptyText: string }> = {
  views: { label: 'Views', icon: Eye, emptyText: 'No activity views recorded yet' },
  comments: { label: 'Comments', icon: MessageSquare, emptyText: 'No activity comments yet' },
  bookmarks: { label: 'Bookmarks', icon: Bookmark, emptyText: 'No bookmarked activities yet' },
  partners: { label: 'Partners', icon: Users, emptyText: 'No participating organisations recorded yet' },
}

// IATI organisation types as multi-select options (code badge + name).
const ORG_TYPE_OPTIONS: MultiSelectOption[] = IATI_ORGANIZATION_TYPES.map((t) => ({
  value: t.code,
  label: t.name,
  subtitle: t.code,
}))

// Single-series ranking bar — shared Blue Slate.
const BAR_COLOR = '#4c5568'

interface ActivityEngagement {
  id: string
  iatiIdentifier: string | null
  title: string
  acronym: string | null
  count: number
  status: string
  reportingOrgName: string
  reportingOrgAcronym: string | null
}

interface TopEngagedActivitiesChartProps {
  metric: EngagementMetric
  refreshKey: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

export function TopEngagedActivitiesChart({
  metric,
  refreshKey,
  onDataChange,
  compact = true,
}: TopEngagedActivitiesChartProps) {
  const meta = METRIC_META[metric]
  const [data, setData] = useState<ActivityEngagement[]>([])
  const [loading, setLoading] = useState(true)
  const tableMode = useChartCardTableMode()
  const [orgTypes, setOrgTypes] = useState<string[]>([])
  const [includeDrafts, setIncludeDrafts] = useState(false)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, orgTypes, metric, includeDrafts])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ metric, limit: '10' })
      if (orgTypes.length > 0) params.append('orgTypes', orgTypes.join(','))
      if (includeDrafts) params.append('includeDrafts', 'true')
      const response = await apiFetch(`/api/analytics/top-engaged-activities?${params.toString()}`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }
      const rows: ActivityEngagement[] = result.data || []
      setData(rows)
      // Export/table rows — clean, human-readable column names.
      onDataChange?.(
        rows.map(r => ({
          Activity: r.acronym ? `${r.title} (${r.acronym})` : r.title,
          'IATI Identifier': r.iatiIdentifier || '',
          Organisation: r.reportingOrgAcronym ? `${r.reportingOrgName} (${r.reportingOrgAcronym})` : r.reportingOrgName,
          [meta.label]: r.count,
        })),
      )
    } catch (error) {
      console.error('[TopEngagedActivitiesChart] Error:', error)
      setData([])
      onDataChange?.([])
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    const maxTitleLength = compact ? 16 : 28
    return data.map(a => ({
      ...a,
      displayTitle: a.acronym
        ? a.acronym
        : a.title.length > maxTitleLength
          ? a.title.substring(0, maxTitleLength) + '...'
          : a.title,
    }))
  }, [data, compact])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const item = payload[0].payload as ActivityEngagement
    const orgDisplay = item.reportingOrgAcronym
      ? `${item.reportingOrgName} (${item.reportingOrgAcronym})`
      : item.reportingOrgName
    return (
      <ChartTooltipCard
        title={item.acronym ? `${item.title} (${item.acronym})` : item.title}
        subtitle={orgDisplay}
        maxWidth={340}
        rows={[{ label: meta.label, value: item.count.toLocaleString(), color: BAR_COLOR }]}
      />
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  const hasNoData = !chartData || chartData.length === 0
  const Icon = meta.icon

  if (hasNoData && compact) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
        <Icon className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-body">{meta.emptyText}</p>
      </div>
    )
  }

  const chartHeight = compact ? '100%' : 500

  return (
    <div className="h-full w-full flex flex-col" style={!compact ? { minHeight: 600 } : undefined}>
      {/* Expanded controls row — org-type multi-select (left), table/CSV toolbar
          (right, pushed with ml-auto). */}
      {!compact && (
        <div className="flex items-center gap-3 mb-4">
          <MultiSelect
            options={ORG_TYPE_OPTIONS}
            selected={orgTypes}
            onChange={setOrgTypes}
            placeholder="All organisation types"
            selectedLabel="organisation types"
            searchable
            showSelectAll
            onClear={() => setOrgTypes([])}
            className="min-w-[220px]"
            renderOption={(opt) => (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {opt.subtitle}
                </span>
                <span>{opt.label}</span>
              </div>
            )}
          />
          <div className="ml-auto flex items-center gap-2">
            {/* Include drafts (unpublished) in the ranking, or published only. */}
            <ChartViewToggle
              ariaLabel="Include drafts"
              variant="text"
              value={includeDrafts ? 'all' : 'published'}
              onValueChange={(v) => setIncludeDrafts(v === 'all')}
              options={[
                { value: 'published', label: 'Published' },
                { value: 'all', label: 'Incl. drafts' },
              ]}
            />
            <InlineToolbarButtons />
          </div>
        </div>
      )}

      {!tableMode && (
        <div className="flex-1">
          {hasNoData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
              <Icon className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-body">{meta.emptyText}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: compact ? 10 : 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#64748b' }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="displayTitle"
                  width={compact ? 120 : 200}
                  tick={{ fontSize: compact ? 9 : 11, fill: '#64748b' }}
                  interval={0}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                <Bar dataKey="count" name={meta.label} fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!compact && !hasNoData && (
        <p className="mt-4 text-body text-muted-foreground leading-relaxed">
          This chart ranks the top 10 activities by {meta.label.toLowerCase()}. Use the organisation-type filter to
          focus on a particular kind of publisher, and switch to table view for the exact figures.
        </p>
      )}
    </div>
  )
}
