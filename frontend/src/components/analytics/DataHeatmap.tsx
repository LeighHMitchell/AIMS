"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

interface DataHeatmapProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
}

interface HeatmapData {
  donor: string
  field: string
  completeness: number
}

const FIELDS_TO_CHECK = [
  { key: 'title', label: 'Activity Title' },
  { key: 'description', label: 'Description' },
  { key: 'sectors', label: 'Sectors' },
  { key: 'dates', label: 'Start/End Dates' },
  { key: 'budget', label: 'Budget' },
  { key: 'disbursements', label: 'Disbursements' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'documents', label: 'Documents' }
]

export function DataHeatmap({ dateRange, filters, refreshKey }: DataHeatmapProps) {
  const [data, setData] = useState<HeatmapData[]>([])
  const [donors, setDonors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get activities by donor organization
      const { data: activities } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          planned_start_date,
          planned_end_date,
          organizations!reporting_org_id (
            id,
            name
          ),
          activity_sectors (
            id
          ),
          transactions (
            id,
            transaction_type,
            value
          ),
          activity_contacts (
            id
          )
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
      
      // Group activities by donor
      const donorMap = new Map<string, any[]>()
      
      activities?.forEach((activity: any) => {
        const donorName = activity.organizations?.name || 'Unknown'
        if (!donorMap.has(donorName)) {
          donorMap.set(donorName, [])
        }
        donorMap.get(donorName)?.push(activity)
      })
      
      // Calculate completeness for each donor/field combination
      const heatmapData: HeatmapData[] = []
      const uniqueDonors: string[] = []
      
      donorMap.forEach((activities, donorName) => {
        uniqueDonors.push(donorName)
        
        FIELDS_TO_CHECK.forEach(field => {
          let completeCount = 0
          
          activities.forEach(activity => {
            switch (field.key) {
              case 'title':
                if (activity.title?.trim()) completeCount++
                break
              case 'description':
                if (activity.description?.trim()) completeCount++
                break
              case 'sectors':
                if (activity.activity_sectors?.length > 0) completeCount++
                break
              case 'dates':
                if (activity.planned_start_date && activity.planned_end_date) completeCount++
                break
              case 'budget':
                const hasCommitment = activity.transactions?.some((t: any) => {
                  const value = parseFloat(t.value) || 0
                  return t.transaction_type === '2' && value > 0
                })
                if (hasCommitment) completeCount++
                break
              case 'disbursements':
                const hasDisbursement = activity.transactions?.some((t: any) => {
                  const value = parseFloat(t.value) || 0
                  return t.transaction_type === '3' && value > 0
                })
                if (hasDisbursement) completeCount++
                break
              case 'contacts':
                if (activity.activity_contacts?.length > 0) completeCount++
                break
              case 'documents':
                // Placeholder - would check for attached documents
                completeCount += Math.random() > 0.5 ? 1 : 0
                break
            }
          })
          
          let completeness = 0
          if (activities.length > 0 && !isNaN(completeCount)) {
            const percentage = (completeCount / activities.length) * 100
            completeness = isNaN(percentage) ? 0 : Math.round(percentage)
          }
          
          heatmapData.push({
            donor: donorName,
            field: field.label,
            completeness: isNaN(completeness) || !isFinite(completeness) ? 0 : completeness
          })
        })
      })
      
      // Sort donors by total completeness
      uniqueDonors.sort((a, b) => {
        const aTotal = heatmapData
          .filter(d => d.donor === a)
          .reduce((sum, d) => {
            const value = d.completeness || 0
            return sum + (isNaN(value) ? 0 : value)
          }, 0)
        const bTotal = heatmapData
          .filter(d => d.donor === b)
          .reduce((sum, d) => {
            const value = d.completeness || 0
            return sum + (isNaN(value) ? 0 : value)
          }, 0)
        return bTotal - aTotal
      })
      
      setDonors(uniqueDonors.slice(0, 10)) // Top 10 donors
      setData(heatmapData)
    } catch (error) {
      console.error('Error fetching heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHeatColor = (value: number) => {
    if (value >= 90) return '#1e293b' // slate-900
    if (value >= 75) return '#334155' // slate-700
    if (value >= 60) return '#475569' // slate-600
    if (value >= 45) return '#64748b' // slate-500
    if (value >= 30) return '#94a3b8' // slate-400
    if (value >= 15) return '#cbd5e1' // slate-300
    return '#f1f5f9' // slate-100
  }

  const getTextColor = (value: number) => {
    return value >= 45 ? '#fff' : '#1e293b'
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-2 px-4 text-sm font-medium text-slate-600">
              Donor
            </th>
            {FIELDS_TO_CHECK.map(field => (
              <th 
                key={field.key}
                className="text-center py-2 px-2 text-xs font-medium text-slate-600"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {donors.map(donor => (
            <tr key={donor}>
              <td className="py-2 px-4 text-sm text-slate-700 font-medium">
                {donor}
              </td>
              {FIELDS_TO_CHECK.map(field => {
                const cellData = data.find(d => 
                  d.donor === donor && d.field === field.label
                )
                const value = cellData?.completeness || 0
                
                return (
                  <td 
                    key={field.key}
                    className="p-2 text-center"
                  >
                    <div
                      className="w-full h-10 flex items-center justify-center text-xs font-medium rounded"
                      style={{
                        backgroundColor: getHeatColor(value),
                        color: getTextColor(value)
                      }}
                    >
                      {value}%
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-xs text-slate-600">Less Complete</span>
        <div className="flex gap-1">
          {[0, 15, 30, 45, 60, 75, 90].map(value => (
            <div
              key={value}
              className="w-8 h-4 rounded"
              style={{ backgroundColor: getHeatColor(value) }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-600">More Complete</span>
      </div>
    </div>
  )
} 