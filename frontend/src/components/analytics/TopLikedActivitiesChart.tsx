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
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types'
import { apiFetch } from '@/lib/api-fetch';

// Color palette
const COLORS = {
  primaryScarlet: '#DC2625', // Downvotes
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',      // Score bars
  coolSteel: '#7b95a7',      // Upvotes
  platinum: '#f1f4f8',
}

type ViewMode = 'score' | 'pyramid'

interface TopVotedActivitiesChartProps {
  refreshKey: number
  onDataChange?: (data: ActivityData[]) => void
  compact?: boolean
}

interface ActivityData {
  id: string
  iatiIdentifier: string | null
  title: string
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

  useEffect(() => {
    fetchData()
  }, [refreshKey, orgType])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '10' })
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
    const maxTitleLength = compact ? 35 : 80
    return data.map(activity => ({
      ...activity,
      displayTitle: activity.title.length > maxTitleLength
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
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-sm">
            {/* Activity title */}
            <p className="font-semibold text-slate-900 text-sm mb-1">{item.title}</p>

            {/* Reporting org name and acronym on same line */}
            <p className="text-xs text-slate-500 mb-2 pb-2 border-b border-slate-100">{orgDisplay}</p>

            {/* Vote statistics table */}
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 text-slate-500">Upvotes</td>
                  <td className="py-0.5 text-right font-medium" style={{ color: COLORS.coolSteel }}>
                    +{item.upvoteCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500">Downvotes</td>
                  <td className="py-0.5 text-right font-medium" style={{ color: COLORS.primaryScarlet }}>
                    -{item.downvoteCount}
                  </td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="py-0.5 pt-1 text-slate-600 font-medium">Net Score</td>
                  <td className="py-0.5 pt-1 text-right font-semibold" style={{ color: item.voteScore >= 0 ? COLORS.coolSteel : COLORS.primaryScarlet }}>
                    {item.voteScore > 0 ? '+' : ''}{item.voteScore}
                  </td>
                </tr>
              </tbody>
            </table>
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
    return <Skeleton className="h-full w-full" />
  }

  // Check if we have no data - but only show simple empty state in compact mode
  // In expanded mode, we'll show the empty state below the filters
  const hasNoData = !chartData || chartData.length === 0

  if (hasNoData && compact) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-500">
        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm">No voted activities yet</p>
        <p className="text-xs text-slate-400 mt-1">Activities will appear here when users vote on them</p>
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
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
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
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
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
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
            <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm">No voted activities yet</p>
            <p className="text-xs text-slate-400 mt-1">Activities will appear here when users vote on them</p>
          </div>
        ) : (
          viewMode === 'score' ? renderScoreChart() : renderPyramidChart()
        )}
      </div>

      {/* Legend - show below chart for pyramid view when expanded and has data */}
      {!compact && viewMode === 'pyramid' && !hasNoData && (
        <div className="flex items-center justify-center gap-6 text-xs mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.primaryScarlet }} />
            <span className="text-slate-600">Downvotes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.coolSteel }} />
            <span className="text-slate-600">Upvotes</span>
          </div>
        </div>
      )}

      {/* Explanatory text - only show when expanded and has data, no card wrapper */}
      {!compact && !hasNoData && (
        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          This chart displays the top 10 activities ranked by community voting. Users can upvote activities
          they find valuable or impactful, and downvote those they consider less effective. The <strong className="text-slate-600">Net Score</strong> view
          shows the overall sentiment (upvotes minus downvotes), helping identify activities with the strongest
          community support. The <strong className="text-slate-600">Pyramid</strong> view separates upvotes and downvotes, revealing activities
          that may be controversial (high votes on both sides) versus those with clear consensus. This crowdsourced
          feedback mechanism helps aid practitioners and analysts identify which interventions are perceived as
          most effective, enabling better resource allocation decisions and knowledge sharing across the development community.
        </p>
      )}
    </div>
  )
}
