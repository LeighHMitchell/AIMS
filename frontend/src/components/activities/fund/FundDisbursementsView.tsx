"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Layers, MapPin, PieChart as PieChartIcon, Calendar } from "lucide-react"
import Link from "next/link"

interface ChildActivity {
  id: string
  title: string
  status: string
  committed: number
  disbursed: number
  planned: number
  sectors: string[]
  regions: string[]
  fundSideAmount: number
  childSideAmount: number
  byYear: Record<string, { committed: number; disbursed: number }>
}

interface SectorBreakdown {
  name: string
  committed: number
  disbursed: number
  activityCount: number
}

interface RegionBreakdown {
  name: string
  committed: number
  disbursed: number
  activityCount: number
}

interface DisbursementsData {
  children: ChildActivity[]
  bySector: SectorBreakdown[]
  byRegion: RegionBreakdown[]
  byYear: { year: string; committed: number; disbursed: number }[]
  totals: { committed: number; disbursed: number; planned: number }
}

interface FundDisbursementsViewProps {
  activityId: string
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

type ViewMode = 'children' | 'sector' | 'region'

export function FundDisbursementsView({ activityId }: FundDisbursementsViewProps) {
  const [data, setData] = useState<DisbursementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('children')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/activities/${activityId}/fund-disbursements`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load disbursements')
          return
        }
        setData(await res.json())
      } catch (e: any) {
        setError(e.message || 'Failed to load disbursements')
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

  if (!data || data.children.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No child activities linked yet</p>
        <p className="text-sm mt-1">Link child activities using parent/child relationships in the Linked Activities tab, then record disbursement transactions.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    'Pipeline/identification': 'bg-muted text-foreground',
    'Implementation': 'bg-blue-100 text-blue-700',
    'Completion': 'bg-green-100 text-green-700',
    'Post-completion': 'bg-purple-100 text-purple-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'Suspended': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {data.children.length} child activit{data.children.length !== 1 ? 'ies' : 'y'}
          </Badge>
          {data.totals.committed > 0 && (
            <Badge variant="outline" className="text-xs">
              Committed: {formatUSD(data.totals.committed)}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Disbursed: {formatUSD(data.totals.disbursed)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'children' ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode('children')}
            className="rounded-none gap-1"
          >
            <Layers className="h-3.5 w-3.5" />
            Activities
          </Button>
          <Button
            variant={viewMode === 'sector' ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode('sector')}
            className="rounded-none gap-1"
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            Sectors
          </Button>
          <Button
            variant={viewMode === 'region' ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode('region')}
            className="rounded-none gap-1"
          >
            <MapPin className="h-3.5 w-3.5" />
            Regions
          </Button>
        </div>
      </div>

      {/* Year chart */}
      {data.byYear.length > 1 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byYear}>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatUSD(v)} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="committed" fill="#5f7f7a" name="Committed" />
              <Bar dataKey="disbursed" fill="#3C6255" name="Disbursed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table based on view mode */}
      <div className="border rounded-lg overflow-hidden">
        {viewMode === 'children' && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="font-semibold">Activity</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Committed</TableHead>
                <TableHead className="text-right font-semibold">Disbursed</TableHead>
                {data.totals.planned > 0 && <TableHead className="text-right font-semibold">Planned</TableHead>}
                <TableHead className="font-semibold">Sectors</TableHead>
                <TableHead className="font-semibold">Regions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.children.map(child => (
                <TableRow key={child.id}>
                  <TableCell>
                    <Link href={`/activities/${child.id}`} className="text-blue-600 hover:underline font-medium">
                      {child.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[child.status] || ''}`}>
                      {child.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {child.committed > 0 ? `$${child.committed.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {child.disbursed > 0 ? `$${child.disbursed.toLocaleString()}` : '-'}
                  </TableCell>
                  {data.totals.planned > 0 && (
                    <TableCell className="text-right text-muted-foreground">
                      {child.planned > 0 ? `$${child.planned.toLocaleString()}` : '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {child.sectors.join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {child.regions.join(', ') || '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-semibold">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell className="text-right">${data.totals.committed.toLocaleString()}</TableCell>
                <TableCell className="text-right">${data.totals.disbursed.toLocaleString()}</TableCell>
                {data.totals.planned > 0 && (
                  <TableCell className="text-right">${data.totals.planned.toLocaleString()}</TableCell>
                )}
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}

        {viewMode === 'sector' && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="font-semibold">Sector</TableHead>
                <TableHead className="text-right font-semibold">Committed</TableHead>
                <TableHead className="text-right font-semibold">Disbursed</TableHead>
                <TableHead className="text-right font-semibold">Activities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.bySector.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.committed > 0 ? `$${Math.round(s.committed).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right font-medium">{s.disbursed > 0 ? `$${Math.round(s.disbursed).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right">{s.activityCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {viewMode === 'region' && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="font-semibold">Region / Country</TableHead>
                <TableHead className="text-right font-semibold">Committed</TableHead>
                <TableHead className="text-right font-semibold">Disbursed</TableHead>
                <TableHead className="text-right font-semibold">Activities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byRegion.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.committed > 0 ? `$${Math.round(r.committed).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right font-medium">{r.disbursed > 0 ? `$${Math.round(r.disbursed).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right">{r.activityCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
