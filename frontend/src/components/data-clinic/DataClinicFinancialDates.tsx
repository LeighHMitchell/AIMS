"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrganizationTypeName } from "@/data/iati-organization-types"

interface OrgFinancialDateRange {
  orgType: string
  orgTypeName: string
  earliestYear: number
  latestYear: number
  activityCount: number
}

export function DataClinicFinancialDates() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeData, setRangeData] = useState<OrgFinancialDateRange[]>([])

  useEffect(() => {
    fetchFinancialDates()
  }, [])

  const fetchFinancialDates = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all transactions with their organization info
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select(`
          transaction_date,
          activities!inner(
            participating_orgs
          )
        `)
        .not('transaction_date', 'is', null)

      if (fetchError) {
        console.error('[FinancialDates] Error fetching transactions:', fetchError)
        setError('Failed to fetch transaction data')
        return
      }

      if (!transactions || transactions.length === 0) {
        setRangeData([])
        return
      }

      // Map to track earliest and latest transaction years per org type
      const orgTypeMap = new Map<string, { earliest: number; latest: number; count: number }>()

      transactions.forEach((transaction: any) => {
        const activity = transaction.activities
        const participatingOrgs = activity?.participating_orgs || []

        // Extract organization types from participating_orgs
        participatingOrgs.forEach((org: any) => {
          if (org.type) {
            const year = new Date(transaction.transaction_date).getFullYear()

            if (!orgTypeMap.has(org.type)) {
              orgTypeMap.set(org.type, { earliest: year, latest: year, count: 1 })
            } else {
              const existing = orgTypeMap.get(org.type)!
              existing.earliest = Math.min(existing.earliest, year)
              existing.latest = Math.max(existing.latest, year)
              existing.count++
            }
          }
        })
      })

      // Convert to array
      const rangeArray: OrgFinancialDateRange[] = Array.from(orgTypeMap.entries())
        .map(([orgType, data]) => ({
          orgType,
          orgTypeName: getOrganizationTypeName(orgType),
          earliestYear: data.earliest,
          latestYear: data.latest,
          activityCount: data.count
        }))
        .sort((a, b) => a.orgTypeName.localeCompare(b.orgTypeName))

      setRangeData(rangeArray)

    } catch (err) {
      console.error('[FinancialDates] Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
          <CardDescription>
            Transaction date ranges for each organization type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rangeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No transaction data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate the overall min and max years for the scale
  const allYears = rangeData.flatMap(d => [d.earliestYear, d.latestYear])
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)
  const yearRange = maxYear - minYear + 1

  // Calculate pixel width per year
  const chartWidth = 1200
  const leftPadding = 250
  const rightPadding = 50
  const availableWidth = chartWidth - leftPadding - rightPadding
  const pixelsPerYear = availableWidth / yearRange

  const rowHeight = 50
  const chartHeight = rangeData.length * rowHeight + 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Activity Timeline by Organization Type
        </CardTitle>
        <CardDescription>
          Range of transaction years for each organization type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="border border-slate-200 rounded-lg bg-white">
            {/* Year axis labels at top */}
            <g>
              {Array.from({ length: yearRange }, (_, i) => {
                const year = minYear + i
                const x = leftPadding + (i * pixelsPerYear)
                return (
                  <g key={year}>
                    <line
                      x1={x}
                      y1={40}
                      x2={x}
                      y2={chartHeight - 20}
                      stroke="#e2e8f0"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={x}
                      y={30}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#64748b"
                    >
                      {year}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Organization type rows */}
            {rangeData.map((data, index) => {
              const y = 60 + (index * rowHeight)
              const startX = leftPadding + ((data.earliestYear - minYear) * pixelsPerYear)
              const endX = leftPadding + ((data.latestYear - minYear) * pixelsPerYear)
              const barWidth = Math.max(endX - startX, 3) // Minimum width of 3px

              return (
                <g key={data.orgType}>
                  {/* Organization type label */}
                  <text
                    x={10}
                    y={y + 15}
                    fontSize={13}
                    fill="#334155"
                    fontWeight="500"
                  >
                    {data.orgTypeName}
                  </text>

                  {/* Range bar */}
                  <g className="hover:opacity-80 transition-opacity cursor-pointer">
                    <rect
                      x={startX}
                      y={y}
                      width={barWidth}
                      height={30}
                      fill="#3b82f6"
                      rx={4}
                      opacity={0.8}
                    />

                    {/* Start year marker */}
                    <circle
                      cx={startX}
                      cy={y + 15}
                      r={5}
                      fill="#1e40af"
                    />

                    {/* End year marker */}
                    <circle
                      cx={endX}
                      cy={y + 15}
                      r={5}
                      fill="#1e40af"
                    />

                    {/* Year labels on the bar if there's space */}
                    {barWidth > 80 && (
                      <>
                        <text
                          x={startX + 10}
                          y={y + 20}
                          fontSize={11}
                          fill="white"
                          fontWeight="600"
                        >
                          {data.earliestYear}
                        </text>
                        <text
                          x={endX - 10}
                          y={y + 20}
                          fontSize={11}
                          fill="white"
                          fontWeight="600"
                          textAnchor="end"
                        >
                          {data.latestYear}
                        </text>
                      </>
                    )}

                    {/* Tooltip trigger area */}
                    <title>
                      {data.orgTypeName}
                      {'\n'}First transaction: {data.earliestYear}
                      {'\n'}Last transaction: {data.latestYear}
                      {'\n'}Transactions: {data.activityCount}
                    </title>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 bg-blue-500 rounded opacity-80"></div>
            <span>Transaction period range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-900 rounded-full"></div>
            <span>Start/End year markers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
