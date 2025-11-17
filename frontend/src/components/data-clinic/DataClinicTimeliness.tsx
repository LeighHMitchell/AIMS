"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { supabase } from "@/lib/supabase"

interface TimelinessData {
  year: number
  planned_start: number
  actual_start: number
  planned_end: number
  actual_end: number
}

interface FutureEndDateData {
  year: number
  count: number
  isFuture: boolean
}

interface FinalisationWithActualEndData {
  year: number
  count: number
}

interface ClosedWithPlannedEndData {
  year: number
  count: number
}

export function DataClinicTimeliness() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<TimelinessData[]>([])
  const [futureEndDateData, setFutureEndDateData] = useState<FutureEndDateData[]>([])
  const [finalisationWithActualEndData, setFinalisationWithActualEndData] = useState<FinalisationWithActualEndData[]>([])
  const [closedWithPlannedEndData, setClosedWithPlannedEndData] = useState<ClosedWithPlannedEndData[]>([])

  useEffect(() => {
    fetchTimelinessData()
  }, [])

  const fetchTimelinessData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all activities with their date fields and status
      const { data: activities, error: fetchError } = await supabase
        .from('activities')
        .select(`
          planned_start_date,
          actual_start_date,
          planned_end_date,
          actual_end_date,
          activity_status
        `)

      if (fetchError) {
        console.error('[Timeliness] Error fetching activities:', fetchError)
        setError(`Failed to fetch activity data: ${fetchError.message}`)
        setLoading(false)
        return
      }

      if (!activities || activities.length === 0) {
        setChartData([])
        setFutureEndDateData([])
        setFinalisationWithActualEndData([])
        setClosedWithPlannedEndData([])
        setLoading(false)
        return
      }

      processActivitiesData(activities)
      setLoading(false)

    } catch (err: any) {
      console.error('[Timeliness] Unexpected error:', err)
      setError(`An unexpected error occurred: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const processActivitiesData = (activities: any[]) => {
    // Aggregate data by year
    const yearMap = new Map<number, TimelinessData>()

    activities.forEach((activity: any) => {
        // Process planned_start_date
        if (activity.planned_start_date) {
          const year = new Date(activity.planned_start_date).getFullYear()
          if (!yearMap.has(year)) {
            yearMap.set(year, { year, planned_start: 0, actual_start: 0, planned_end: 0, actual_end: 0 })
          }
          yearMap.get(year)!.planned_start++
        }

        // Process actual_start_date
        if (activity.actual_start_date) {
          const year = new Date(activity.actual_start_date).getFullYear()
          if (!yearMap.has(year)) {
            yearMap.set(year, { year, planned_start: 0, actual_start: 0, planned_end: 0, actual_end: 0 })
          }
          yearMap.get(year)!.actual_start++
        }

        // Process planned_end_date
        if (activity.planned_end_date) {
          const year = new Date(activity.planned_end_date).getFullYear()
          if (!yearMap.has(year)) {
            yearMap.set(year, { year, planned_start: 0, actual_start: 0, planned_end: 0, actual_end: 0 })
          }
          yearMap.get(year)!.planned_end++
        }

        // Process actual_end_date
        if (activity.actual_end_date) {
          const year = new Date(activity.actual_end_date).getFullYear()
          if (!yearMap.has(year)) {
            yearMap.set(year, { year, planned_start: 0, actual_start: 0, planned_end: 0, actual_end: 0 })
          }
          yearMap.get(year)!.actual_end++
        }
      })

      // Convert to array and sort by year
      const dataArray = Array.from(yearMap.values()).sort((a, b) => a.year - b.year)
      setChartData(dataArray)

    // Process future end dates
    const currentYear = new Date().getFullYear()
    const futureYearMap = new Map<number, number>()

    activities.forEach((activity: any) => {
      if (activity.actual_end_date) {
        const year = new Date(activity.actual_end_date).getFullYear()
        futureYearMap.set(year, (futureYearMap.get(year) || 0) + 1)
      }
    })

    // Convert to array with isFuture flag
    const futureDataArray: FutureEndDateData[] = Array.from(futureYearMap.entries())
      .map(([year, count]) => ({
        year,
        count,
        isFuture: year > currentYear
      }))
      .sort((a, b) => a.year - b.year)

    setFutureEndDateData(futureDataArray)

    // Process finalisation stage with actual end date
    const finalisationYearMap = new Map<number, number>()

    activities.forEach((activity: any) => {
      // Check if activity is in finalisation stage (status code 4) AND has an actual end date
      if (activity.activity_status === '4' && activity.actual_end_date) {
        const year = new Date(activity.actual_end_date).getFullYear()
        finalisationYearMap.set(year, (finalisationYearMap.get(year) || 0) + 1)
      }
    })

    const finalisationDataArray: FinalisationWithActualEndData[] = Array.from(finalisationYearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year)

    setFinalisationWithActualEndData(finalisationDataArray)

    // Process closed activities with only planned end date (no actual end date)
    const closedPlannedYearMap = new Map<number, number>()

    activities.forEach((activity: any) => {
        // Check if activity is closed (status code 5), has planned end date, but NO actual end date
        if (activity.activity_status === '5' && activity.planned_end_date && !activity.actual_end_date) {
          const year = new Date(activity.planned_end_date).getFullYear()
          closedPlannedYearMap.set(year, (closedPlannedYearMap.get(year) || 0) + 1)
        }
      })

      const closedPlannedDataArray: ClosedWithPlannedEndData[] = Array.from(closedPlannedYearMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year)

      setClosedWithPlannedEndData(closedPlannedDataArray)
  }

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (chartData.length === 0) return null

    const totalPlannedStart = chartData.reduce((sum, d) => sum + d.planned_start, 0)
    const totalActualStart = chartData.reduce((sum, d) => sum + d.actual_start, 0)
    const totalPlannedEnd = chartData.reduce((sum, d) => sum + d.planned_end, 0)
    const totalActualEnd = chartData.reduce((sum, d) => sum + d.actual_end, 0)

    return {
      totalPlannedStart,
      totalActualStart,
      totalPlannedEnd,
      totalActualEnd,
      yearRange: chartData.length > 0 ? `${chartData[0].year} - ${chartData[chartData.length - 1].year}` : 'N/A'
    }
  }, [chartData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">
            {label}
          </p>
        </div>
        <div className="p-2">
          <table className="w-full text-sm">
            <tbody>
              {payload.map((entry: any, index: number) => (
                <tr key={index} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-700 font-medium">{entry.name}</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {entry.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Timeliness
          </CardTitle>
          <CardDescription>
            Distribution of activity dates by year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Timeliness
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

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Dates Distribution by Year
          </CardTitle>
          <CardDescription>
            Number of activities with planned/actual start/end dates for each year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No activity date data available</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
              <XAxis
                dataKey="year"
                stroke="#64748B"
                fontSize={12}
                angle={0}
                textAnchor="middle"
              />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar
                dataKey="planned_start"
                name="Planned Start"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="actual_start"
                name="Actual Start"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="planned_end"
                name="Planned End"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="actual_end"
                name="Actual End"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Future End Dates Chart */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Activities with Actual End Dates by Year
            </CardTitle>
            <CardDescription>
              Activities with actual end dates in future years may indicate data quality issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {futureEndDateData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No future end date data available</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={futureEndDateData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  fontSize={12}
                  angle={0}
                  textAnchor="middle"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                          <p className="font-semibold text-slate-900 text-sm">
                            Year {data.year}
                          </p>
                        </div>
                        <div className="p-2">
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="py-1.5 pr-4">
                                  <span className="text-slate-700 font-medium">Activities</span>
                                </td>
                                <td className="py-1.5 text-right font-semibold text-slate-900">
                                  {data.count}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 pr-4">
                                  <span className="text-slate-700 font-medium">Status</span>
                                </td>
                                <td className="py-1.5 text-right">
                                  {data.isFuture ? (
                                    <span className="text-orange-600 font-semibold">Future</span>
                                  ) : (
                                    <span className="text-slate-600">Past/Current</span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill={(entry: any) => entry.isFuture ? '#f59e0b' : '#10b981'}
                />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      {/* Finalisation Stage with Actual End Date Chart */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-600" />
              Finalisation Stage Activities with Actual End Dates
            </CardTitle>
            <CardDescription>
              Activities in finalisation stage should not have actual end dates - indicates potential status mismatch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {finalisationWithActualEndData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No finalisation stage data available</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={finalisationWithActualEndData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  fontSize={12}
                  angle={0}
                  textAnchor="middle"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                          <p className="font-semibold text-slate-900 text-sm">
                            Year {data.year}
                          </p>
                        </div>
                        <div className="p-2">
                          <table className="w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1.5 pr-4">
                                  <span className="text-slate-700 font-medium">Finalisation Activities</span>
                                </td>
                                <td className="py-1.5 text-right font-semibold text-slate-900">
                                  {data.count}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Finalisation with Actual End"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      {/* Closed Activities with Only Planned End Date Chart */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Closed Activities with Only Planned End Dates
            </CardTitle>
            <CardDescription>
              Closed activities should have actual end dates, not just planned dates - indicates missing data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {closedWithPlannedEndData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No closed activities data available</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={closedWithPlannedEndData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  fontSize={12}
                  angle={0}
                  textAnchor="middle"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                          <p className="font-semibold text-slate-900 text-sm">
                            Year {data.year}
                          </p>
                        </div>
                        <div className="p-2">
                          <table className="w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1.5 pr-4">
                                  <span className="text-slate-700 font-medium">Closed Activities</span>
                                </td>
                                <td className="py-1.5 text-right font-semibold text-slate-900">
                                  {data.count}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Closed with Only Planned End"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
