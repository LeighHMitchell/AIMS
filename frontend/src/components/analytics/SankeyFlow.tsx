"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight } from 'lucide-react'

interface SankeyFlowProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    country?: string
  }
  refreshKey: number
}

interface FlowData {
  donor: string
  sector: string
  amount: number
}

export function SankeyFlow({ dateRange, filters, refreshKey }: SankeyFlowProps) {
  const [data, setData] = useState<FlowData[]>([])
  const [donors, setDonors] = useState<{name: string, total: number}[]>([])
  const [sectors, setSectors] = useState<{name: string, total: number}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get transactions with donor and sector information
      let query = supabase
        .from('transactions')
        .select(`
          value,
          transaction_type,
          status,
          transaction_date,
          provider_org_id,
          organizations!provider_org_id (
            id,
            name
          ),
          activities!inner (
            id,
            activity_sectors (
              sector_code,
              percentage
            )
          )
        `)
        .eq('transaction_type', '3') // Disbursements
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
        .not('provider_org_id', 'is', null)
      
      // Apply country filter if needed
      if (filters.country && filters.country !== 'all') {
        query = query.contains('activities.locations', { country_code: filters.country })
      }
      
      const { data: transactions } = await query
      
      // Get sector names
      const { data: sectorMappings } = await supabase
        .from('iati_reference_values')
        .select('code, name')
        .eq('type', 'Sector')
      
      const sectorMap = new Map(sectorMappings?.map((s: any) => [s.code, s.name]) || [])
      
      // Process flow data
      const flowMap = new Map<string, number>()
      const donorTotals = new Map<string, number>()
      const sectorTotals = new Map<string, number>()
      
      transactions?.forEach((transaction: any) => {
        const value = parseFloat(transaction.value) || 0
        if (isNaN(value) || value <= 0) return
        
        const donorName = transaction.organizations?.name || 'Unknown Donor'
        const sectors = transaction.activities?.activity_sectors || []
        
        if (sectors.length === 0) {
          // If no sectors, attribute to "Unspecified"
          const key = `${donorName}|Unspecified`
          flowMap.set(key, (flowMap.get(key) || 0) + value)
          donorTotals.set(donorName, (donorTotals.get(donorName) || 0) + value)
          sectorTotals.set('Unspecified', (sectorTotals.get('Unspecified') || 0) + value)
        } else {
          // Distribute value across sectors based on percentage
          sectors.forEach((sector: any) => {
            const sectorName = sectorMap.get(sector.sector_code) || sector.sector_code || 'Unknown'
            const percentage = sector.percentage || (100 / sectors.length)
            const sectorValue = value * (percentage / 100)
            
            const key = `${donorName}|${sectorName}`
            flowMap.set(key, (flowMap.get(key) || 0) + sectorValue)
            donorTotals.set(donorName, (donorTotals.get(donorName) || 0) + sectorValue)
            sectorTotals.set(sectorName, (sectorTotals.get(sectorName) || 0) + sectorValue)
          })
        }
      })
      
      // Convert to arrays and sort
      const flowData: FlowData[] = Array.from(flowMap.entries())
        .map(([key, amount]) => {
          const [donor, sector] = key.split('|')
          return { donor, sector, amount }
        })
        .filter(d => d.amount > 0)
        .sort((a, b) => b.amount - a.amount)
      
      const topDonors = Array.from(donorTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
      
      const topSectors = Array.from(sectorTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
      
      // Filter flow data to only include top donors and sectors
      const topDonorNames = new Set(topDonors.map(d => d.name))
      const topSectorNames = new Set(topSectors.map(s => s.name))
      
      const filteredFlowData = flowData.filter(f => 
        topDonorNames.has(f.donor) && topSectorNames.has(f.sector)
      )
      
      setData(filteredFlowData)
      setDonors(topDonors)
      setSectors(topSectors)
    } catch (error) {
      console.error('Error fetching flow data:', error)
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

  const getFlowWidth = (amount: number, maxAmount: number) => {
    const minWidth = 2
    const maxWidth = 40
    return minWidth + ((amount / maxAmount) * (maxWidth - minWidth))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  const maxAmount = Math.max(...data.map(d => d.amount))

  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-4 h-full">
        {/* Donors Column */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-slate-600 mb-3">Top Donors</h4>
          <div className="space-y-3">
            {donors.map(donor => (
              <div key={donor.name}>
                <div className="text-sm font-medium text-slate-700 truncate">
                  {donor.name}
                </div>
                <div className="text-xs text-slate-500">
                  {formatCurrency(donor.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Visualization */}
        <div className="col-span-1 flex flex-col justify-center">
          <div className="relative h-full">
            {data.map((flow, index) => {
              const donorIndex = donors.findIndex(d => d.name === flow.donor)
              const sectorIndex = sectors.findIndex(s => s.name === flow.sector)
              
              if (donorIndex === -1 || sectorIndex === -1) return null
              
              const opacity = 0.3 + (flow.amount / maxAmount) * 0.4
              
              return (
                <div
                  key={index}
                  className="absolute flex items-center"
                  style={{
                    top: `${(donorIndex + 0.5) * (100 / donors.length)}%`,
                    transform: 'translateY(-50%)',
                    width: '100%'
                  }}
                >
                  <div
                    className="bg-slate-400 rounded"
                    style={{
                      height: `${getFlowWidth(flow.amount, maxAmount)}px`,
                      opacity,
                      width: '100%'
                    }}
                  />
                </div>
              )
            })}
            <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
          </div>
        </div>

        {/* Sectors Column */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-slate-600 mb-3">Top Sectors</h4>
          <div className="space-y-3">
            {sectors.map(sector => (
              <div key={sector.name}>
                <div className="text-sm font-medium text-slate-700 truncate">
                  {sector.name}
                </div>
                <div className="text-xs text-slate-500">
                  {formatCurrency(sector.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 border-t pt-4">
        <p className="text-xs text-slate-500 text-center">
          Flow width represents disbursement amount from donor to sector
        </p>
      </div>
    </div>
  )
} 