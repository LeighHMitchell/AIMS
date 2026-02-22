"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { BarChart3, PieChart as PieChartIcon, Calendar } from "lucide-react"

interface Donor {
  name: string
  orgId: string | null
  pledged: number
  committed: number
  received: number
  total: number
  byYear: Record<string, { pledged: number; committed: number; received: number }>
  transactions: any[]
}

interface ContributionsData {
  donors: Donor[]
  years: string[]
  totals: { pledged: number; committed: number; received: number; total: number }
  transactionCount: number
}

interface FundContributionsViewProps {
  activityId: string
}

const COLORS = ['#3C6255', '#5f7f7a', '#8BA89E', '#B5CFC6', '#D4E8E0', '#2D4A44', '#1A3530', '#4A7068', '#6B9B90', '#9CC4B8']

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function FundContributionsView({ activityId }: FundContributionsViewProps) {
  const [data, setData] = useState<ContributionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')
  const [showYearPivot, setShowYearPivot] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/activities/${activityId}/fund-contributions`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load contributions')
          return
        }
        setData(await res.json())
      } catch (e: any) {
        setError(e.message || 'Failed to load contributions')
      } finally {
        setLoading(false)
      }
    }
    if (activityId) load()
  }, [activityId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-muted-foreground"><p>{error}</p></div>
  }

  if (!data || data.donors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No contributions recorded yet</p>
        <p className="text-sm mt-1">Add incoming transactions (Incoming Funds, Incoming Commitments, or Incoming Pledges) to see contributions here.</p>
      </div>
    )
  }

  const chartData = data.donors.map(d => ({
    name: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
    fullName: d.name,
    pledged: d.pledged,
    committed: d.committed,
    received: d.received,
    total: d.total,
  }))

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {data.donors.length} donor{data.donors.length !== 1 ? 's' : ''} &middot; {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showYearPivot ? "default" : "outline"}
            size="sm"
            onClick={() => setShowYearPivot(!showYearPivot)}
            className="gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            By Year
          </Button>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={chartType === 'bar' ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType('bar')}
              className="rounded-none"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={chartType === 'pie' ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType('pie')}
              className="rounded-none"
            >
              <PieChartIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tickFormatter={(v) => formatUSD(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              {data.totals.pledged > 0 && <Bar dataKey="pledged" fill="#B5CFC6" stackId="a" name="Pledged" />}
              {data.totals.committed > 0 && <Bar dataKey="committed" fill="#5f7f7a" stackId="a" name="Committed" />}
              <Bar dataKey="received" fill="#3C6255" stackId="a" name="Received" />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="total"
                nameKey="fullName"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold">Donor</TableHead>
              {!showYearPivot ? (
                <>
                  {data.totals.pledged > 0 && <TableHead className="text-right font-semibold">Pledged</TableHead>}
                  <TableHead className="text-right font-semibold">Committed</TableHead>
                  <TableHead className="text-right font-semibold">Received</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </>
              ) : (
                data.years.map(y => (
                  <TableHead key={y} className="text-right font-semibold">{y}</TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.donors.map((donor, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{donor.name}</TableCell>
                {!showYearPivot ? (
                  <>
                    {data.totals.pledged > 0 && (
                      <TableCell className="text-right text-muted-foreground">
                        {donor.pledged > 0 ? `$${donor.pledged.toLocaleString()}` : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {donor.committed > 0 ? `$${donor.committed.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {donor.received > 0 ? `$${donor.received.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${donor.total.toLocaleString()}
                    </TableCell>
                  </>
                ) : (
                  data.years.map(y => {
                    const yearData = donor.byYear[y]
                    const yearTotal = yearData ? yearData.pledged + yearData.committed + yearData.received : 0
                    return (
                      <TableCell key={y} className="text-right">
                        {yearTotal > 0 ? `$${yearTotal.toLocaleString()}` : '-'}
                      </TableCell>
                    )
                  })
                )}
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted font-semibold">
              <TableCell>Total</TableCell>
              {!showYearPivot ? (
                <>
                  {data.totals.pledged > 0 && (
                    <TableCell className="text-right">${data.totals.pledged.toLocaleString()}</TableCell>
                  )}
                  <TableCell className="text-right">${data.totals.committed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${data.totals.received.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${data.totals.total.toLocaleString()}</TableCell>
                </>
              ) : (
                data.years.map(y => {
                  const yearTotal = data.donors.reduce((sum, d) => {
                    const yd = d.byYear[y]
                    return sum + (yd ? yd.pledged + yd.committed + yd.received : 0)
                  }, 0)
                  return (
                    <TableCell key={y} className="text-right">
                      {yearTotal > 0 ? `$${yearTotal.toLocaleString()}` : '-'}
                    </TableCell>
                  )
                })
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
