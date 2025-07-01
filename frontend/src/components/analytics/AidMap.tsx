"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin } from 'lucide-react'

interface AidMapProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    donor?: string
    sector?: string
  }
  country?: string
  refreshKey: number
}

interface LocationData {
  location: string
  country: string
  totalDisbursement: number
  projectCount: number
}

export function AidMap({ dateRange, filters, country, refreshKey }: AidMapProps) {
  const [data, setData] = useState<LocationData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, country, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get activities with their locations and transactions
      let query = supabase
        .from('activities')
        .select(`
          id,
          title,
          locations,
          transactions!inner (
            value,
            transaction_type,
            status,
            transaction_date,
            provider_org_id
          )
        `)
        .eq('publication_status', 'published')
        .eq('transactions.transaction_type', '3') // Disbursements
        .eq('transactions.status', 'actual')
        .gte('transactions.transaction_date', dateRange.from.toISOString())
        .lte('transactions.transaction_date', dateRange.to.toISOString())
      
      // Apply filters
      if (filters.donor && filters.donor !== 'all') {
        query = query.eq('transactions.provider_org_id', filters.donor)
      }
      
      if (country && country !== 'all') {
        query = query.contains('locations', { country_code: country })
      }
      
      const { data: activities } = await query
      
      // Process location data
      const locationMap = new Map<string, { disbursement: number, projects: Set<string> }>()
      
      activities?.forEach((activity: any) => {
        const transactions = activity.transactions || []
        const locations = activity.locations || {}
        
        // Calculate total disbursement for this activity
        const totalDisbursement = transactions.reduce((sum: number, t: any) => {
          const value = parseFloat(t.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)
        
        // Extract location info (adjust based on your location structure)
        let locationName = 'Unspecified'
        let countryName = 'Unknown'
        
        if (locations.site_locations?.length > 0) {
          // Use first site location
          const site = locations.site_locations[0]
          locationName = site.name || site.admin1 || 'Unspecified'
          countryName = site.country_name || 'Unknown'
        } else if (locations.broad_coverage_locations?.length > 0) {
          // Use broad coverage
          const coverage = locations.broad_coverage_locations[0]
          locationName = coverage.name || 'National Level'
          countryName = coverage.country_name || 'Unknown'
        }
        
        const key = `${locationName}|${countryName}`
        
        if (!locationMap.has(key)) {
          locationMap.set(key, { disbursement: 0, projects: new Set() })
        }
        
        const loc = locationMap.get(key)!
        loc.disbursement += totalDisbursement
        loc.projects.add(activity.id)
      })
      
      // Convert to array format
      const locationData: LocationData[] = Array.from(locationMap.entries())
        .map(([key, value]) => {
          const [location, country] = key.split('|')
          return {
            location,
            country,
            totalDisbursement: value.disbursement,
            projectCount: value.projects.size
          }
        })
        .sort((a, b) => b.totalDisbursement - a.totalDisbursement)
        .slice(0, 15) // Top 15 locations
      
      setData(locationData)
    } catch (error) {
      console.error('Error fetching location data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[500px] w-full bg-slate-100" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-full bg-slate-50 rounded-lg p-8 flex flex-col items-center justify-center">
        <MapPin className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-slate-600">No location data available for the selected filters</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Location</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Country</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Projects</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Total Disbursed</th>
            </tr>
          </thead>
          <tbody>
            {data.map((location, index) => (
              <tr 
                key={index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
              >
                <td className="py-3 px-4 text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {location.location}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {location.country}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700 text-right">
                  {location.projectCount}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700 text-right font-medium">
                  {formatCurrency(location.totalDisbursement)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          Showing top 15 locations by disbursement amount
        </p>
      </div>
    </div>
  )
} 