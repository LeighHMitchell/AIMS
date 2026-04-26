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
  Cell,
  ReferenceLine,
} from 'recharts'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { TrendingUp, ThumbsDown, ThumbsUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

// Color palette
const COLORS = {
  primaryScarlet: '#DC2625', // Downvotes
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',      // Score bars
  coolSteel: '#7b95a7',      // Upvotes
  platinum: '#f1f4f8',
}

type ViewMode = 'score' | 'pyramid'
type SortMode = 'score' | 'downvotes'

interface TopVotedActivitiesChartProps {
  refreshKey: number
  onDataChange?: (data: ActivityData[]) => void
  compact?: boolean
}

interface ActivityData {
  id: string
  iatiIdentifier: string | null
  title: string
  acronym: string | null
  voteScore: number
  upvoteCount: number
  downvoteCount: number
  status: string
  reportingOrg: string
  reportingOrgName: string
  reportingOrgAcronym: string | null
}

export function TopLikedActivitiesChart({ refreshKey, onDataChange, compact = true }: TopVotedActivitiesChartProps) {
  const [data, setData] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('pyramid')
  const [orgType, setOrgType] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('score')

  useEffect(() => {
    fetchData()
  }, [refreshKey, orgType, sortMode])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '10', sort: sortMode })
      if (orgType && orgType !== 'all') {
        params.append('orgType', orgType)
      }
      const response = await apiFetch(`/api/analytics/top-liked-activities?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }

      setData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (error) {
      console.error('[TopVotedActivitiesChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data with truncated titles - memoized for performance
  const chartData = useMemo(() => {
    const maxTitleLength = compact ? 16 : 28
    return data.map(activity => ({
      ...activity,
      displayTitle: activity.acronym
        ? activity.acronym
        : activity.title.length > maxTitleLength
          ? activity.title.substring(0, maxTitleLength) + '...'
          : activity.title,
      // For pyramid view: negative downvotes go left, positive upvotes go right
      negativeDownvotes: -activity.downvoteCount
    }))
  }, [data, compact])

  // Shared tooltip renderer - memoized
  const renderTooltipContent = useMemo(() => {
    return ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0].payload
        const orgDisplay = item.reportingOrgAcronym
          ? `${item.reportingOrgName} (${item.reportingOrgAcronym})`
          : item.reportingOrgName
        return (
          <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden max-w-sm">
            <div className="bg-surface-muted px-3 py-2 border-b border-border">
              <p className="font-semibold text-foreground text-body">
                {item.title}{item.acronym ? ` (${item.acronym})` : ''}
              </p>
              <p className="text-helper text-muted-foreground mt-0.5">{orgDisplay}</p>
            </div>
            <div className="p-2">
              <table className="w-full text-helper">
                <tbody>
                  <tr>
                    <td className="py-0.5 text-muted-foreground">Upvotes</td>
                    <td className="py-0.5 text-right font-medium" style={{ color: COLORS.coolSteel }}>
                      +{item.upvoteCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-muted-foreground">Downvotes</td>
                    <td className="py-0.5 text-right font-medium" style={{ color: COLORS.primaryScarlet }}>
                      -{item.downvoteCount}
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-0.5 pt-1 text-muted-foreground font-medium">Net Score</td>
                    <td className="py-0.5 pt-1 text-right font-semibold" style={{ color: item.voteScore >= 0 ? COLORS.coolSteel : COLORS.primaryScarlet }}>
                      {item.voteScore > 0 ? '+' : ''}{item.voteScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      return null
    }
  }, [])

  // Calculate domain for pyramid chart (symmetric around 0) - memoized
  const pyramidDomain = useMemo(() => {
    const maxVotes = Math.max(
      ...data.map(d => Math.max(d.upvoteCount, d.downvoteCount)),
      1 // Ensure at least 1 to avoid empty domain
    )
    return [-maxVotes - 1, maxVotes + 1] as [number, number]
  }, [data])

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  // Check if we have no data - but only show simple empty state in compact mode
  // In expanded mode, we'll show the empty state below the filters
  const hasNoData = !chartData || chartData.length === 0

  if (hasNoData && compact) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-body">No voted activities yet</p>
        <p className="text-helper text-muted-foreground mt-1">Activities will appear here when users vote on them</p>
      </div>
    )
  }

  // Dynamic height based on compact mode
  const chartHeight = compact ? '100%' : 500

  // Score view - net score horizontal bar chart
  const renderScoreChart = () => (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: compact ? 10 : 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          type="number"
          fontSize={compact ? 10 : 12}
          tick={{ fill: '#64748b' }}
          allowDecimals={false}
          domain={['auto', 'auto']}
        />
        <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
        <YAxis
          type="category"
          dataKey="displayTitle"
          width={compact ? 120 : 200}
          tick={{ fontSize: compact ? 9 : 11, fill: '#64748b' }}
          interval={0}
        />
        <Tooltip content={renderTooltipContent} />
        <Bar dataKey="voteScore" radius={[0, 4, 4, 0]}>
          {chartData.map((item, index) => (
            <Cell
              key={`cell-${index}`}
              fill={item.voteScore < 0 ? COLORS.primaryScarlet : COLORS.blueSlate}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  // Pyramid view - downvotes left, upvotes right on the same row
  // Using stackId="stack" puts both bars on the same row
  // stackOffset="sign" ensures negative values go left, positive go right
  const renderPyramidChart = () => (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: compact ? 10 : 20, bottom: 5 }}
        stackOffset="sign"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          type="number"
          fontSize={compact ? 10 : 12}
          tick={{ fill: '#64748b' }}
          allowDecimals={false}
          domain={pyramidDomain}
          tickFormatter={(value) => Math.abs(value).toString()}
        />
        <ReferenceLine x={0} stroke={COLORS.blueSlate} strokeWidth={2} />
        <YAxis
          type="category"
          dataKey="displayTitle"
          width={compact ? 120 : 200}
          tick={{ fontSize: compact ? 9 : 11, fill: '#64748b' }}
          interval={0}
        />
        <Tooltip content={renderTooltipContent} />
        {/* Downvotes bar (red #DC2625) - extends left from center */}
        <Bar
          dataKey="negativeDownvotes"
          name="Downvotes"
          stackId="stack"
          fill="#DC2625"
        />
        {/* Upvotes bar (steel blue #7b95a7) - extends right from center */}
        <Bar
          dataKey="upvoteCount"
          name="Upvotes"
          stackId="stack"
          fill="#7b95a7"
        />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="h-full w-full flex flex-col" style={!compact ? { minHeight: 600 } : undefined}>
      {/* Filters and view toggle buttons - only show when expanded */}
      {!compact && (
        <div className="flex items-center justify-end gap-3 mb-4">
          {/* Sort mode toggle: Most Voted vs Most Downvoted */}
          <div className="flex">
            <Button
              variant={sortMode === 'score' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortMode('score')}
              className="h-8 rounded-r-none"
              title="Most voted (highest net score first)"
            >
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              Most Voted
            </Button>
            <Button
              variant={sortMode === 'downvotes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortMode('downvotes')}
              className="h-8 rounded-l-none"
              title="Most downvoted (highest downvote count first)"
            >
              <ThumbsDown className="h-4 w-4 mr-1.5" />
              Most Downvoted
            </Button>
          </div>

          {/* Organization Type Filter */}
          <Select value={orgType} onValueChange={setOrgType}>
            <SelectTrigger className="w-auto min-w-[200px] h-9">
              <SelectValue placeholder="All Organization Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organization Types</SelectItem>
              {IATI_ORGANIZATION_TYPES.map((type) => (
                <SelectItem key={type.code} value={type.code}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {type.code}
                    </span>
                    <span>{type.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle buttons */}
          <div className="flex">
            <Button
              variant={viewMode === 'score' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('score')}
              className="h-8 rounded-r-none"
              title="Net Score"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'pyramid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('pyramid')}
              className="h-8 rounded-l-none"
              title="Pyramid"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="8" height="3" rx="0.5" />
                <rect x="14" y="6" width="8" height="3" rx="0.5" />
                <rect x="4" y="11" width="6" height="3" rx="0.5" />
                <rect x="14" y="11" width="6" height="3" rx="0.5" />
                <rect x="6" y="16" width="4" height="3" rx="0.5" />
                <rect x="14" y="16" width="4" height="3" rx="0.5" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Chart or Empty State */}
      <div className="flex-1">
        {hasNoData ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
            <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-body">{sortMode === 'downvotes' ? 'No downvoted activities yet' : 'No voted activities yet'}</p>
            <p className="text-helper text-muted-foreground mt-1">Activities will appear here when users vote on them</p>
          </div>
        ) : (
          viewMode === 'score' ? renderScoreChart() : renderPyramidChart()
        )}
      </div>

      {/* Legend - show below chart for pyramid view when expanded and has data */}
      {!compact && viewMode === 'pyramid' && !hasNoData && (
        <div className="flex items-center justify-center gap-6 text-helper mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.primaryScarlet }} />
            <span className="text-muted-foreground">Downvotes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.coolSteel }} />
            <span className="text-muted-foreground">Upvotes</span>
          </div>
        </div>
      )}

      {/* Explanatory text */}
      {!compact && !hasNoData && (
        <p className="mt-4 text-body text-muted-foreground leading-relaxed">
          This chart displays the top 10 activities ranked by community voting. The Net Score view shows overall sentiment (upvotes minus downvotes), while the Pyramid view separates upvotes and downvotes to reveal controversial activities versus those with clear consensus.
          Use this to identify which interventions the community considers most effective and to inform resource allocation decisions.
        </p>
      )}
    </div>
  )
}
