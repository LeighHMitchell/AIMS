"use client"

import React, { useState, useEffect } from 'react'
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
import { ChevronUp, ChevronDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface TopVotedActivitiesChartProps {
  refreshKey: number
  onDataChange?: (data: ActivityData[]) => void
}

interface ActivityData {
  id: string
  title: string
  voteScore: number
  upvoteCount: number
  downvoteCount: number
  status: string
  reportingOrg: string
}

export function TopLikedActivitiesChart({ refreshKey, onDataChange }: TopVotedActivitiesChartProps) {
  const [data, setData] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/top-liked-activities?limit=10')
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

  // Prepare chart data with truncated titles
  const chartData = data.map(activity => ({
    ...activity,
    displayTitle: activity.title.length > 35
      ? activity.title.substring(0, 35) + '...'
      : activity.title
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
          <p className="font-semibold text-slate-900 text-sm mb-1">{item.title}</p>
          <div className="flex items-center gap-3 text-sm text-slate-600 mb-1">
            <div className="flex items-center gap-1">
              <ChevronUp className="h-4 w-4 text-primary" />
              <span>{item.upvoteCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <ChevronDown className="h-4 w-4 text-red-500" />
              <span>{item.downvoteCount}</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span className={item.voteScore >= 0 ? 'text-primary' : 'text-red-500'}>
                Score: {item.voteScore > 0 ? '+' : ''}{item.voteScore}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{item.reportingOrg}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return <Skeleton className="h-full w-full" />
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-500">
        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm">No voted activities yet</p>
        <p className="text-xs text-slate-400 mt-1">Activities will appear here when users vote on them</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            fontSize={10}
            tick={{ fill: '#64748b' }}
            allowDecimals={false}
            domain={['auto', 'auto']}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
          <YAxis
            type="category"
            dataKey="displayTitle"
            width={120}
            tick={{ fontSize: 9, fill: '#64748b' }}
            interval={0}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="voteScore"
          >
            {chartData.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={item.voteScore < 0 ? '#ef4444' : index === 0 ? '#0369a1' : index < 3 ? '#0284c7' : '#38bdf8'}
                radius={item.voteScore < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
