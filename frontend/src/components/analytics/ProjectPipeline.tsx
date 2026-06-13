"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ActivityStatusRow } from '@/components/ui/status-row'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { CurrencyValue } from '@/components/ui/currency-value'

interface ProjectPipelineProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey: number
}

interface ProjectData {
  id: string
  name: string
  donor: string
  sector: string
  budget: number
  disbursed: number
  status: string
  lastUpdated: string
}

export function ProjectPipeline({ dateRange, filters, refreshKey }: ProjectPipelineProps) {
  const [data, setData] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch activities with their financial data
      let query = supabase
        .from('activities')
        .select(`
          id,
          title,
          activity_status,
          updated_at,
          organizations!reporting_org_id (
            name
          ),
          activity_sectors (
            sector_name
          ),
          transactions (
            value,
            transaction_type,
            status,
            transaction_date
          )
        `)
        .eq('publication_status', 'published')
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString())
      
      const { data: activities } = await query
      
      // Process activities into project pipeline format
      const projects: ProjectData[] = activities?.map((activity: any) => {
        const transactions = activity.transactions || []
        
        // Calculate budget (commitments)
        const budget = transactions
          .filter((t: any) => t.transaction_type === '2' && t.status === 'actual')
          .reduce((sum: number, t: any) => {
            const value = parseFloat(t.value) || 0
            return sum + (isNaN(value) ? 0 : value)
          }, 0)
        
        // Calculate disbursed amount
        const disbursed = transactions
          .filter((t: any) => t.transaction_type === '3' && t.status === 'actual')
          .reduce((sum: number, t: any) => {
            const value = parseFloat(t.value) || 0
            return sum + (isNaN(value) ? 0 : value)
          }, 0)
        
        // Get primary sector
        const sector = activity.activity_sectors?.[0]?.sector_name || 'Unspecified'
        
        // Get donor organization name
        const donor = activity.organizations?.name || 'Unknown'
        
        return {
          id: activity.id,
          name: activity.title,
          donor,
          sector,
          budget,
          disbursed,
          status: activity.activity_status || 'unknown',
          lastUpdated: activity.updated_at
        }
      }) || []
      
      setData(projects)
    } catch (error) {
      console.error('Error fetching project pipeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.sector.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-muted border-border text-foreground"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-muted">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-body font-medium text-muted-foreground">Project Name</th>
              <th className="text-left py-3 px-4 text-body font-medium text-muted-foreground">Development Partner</th>
              <th className="text-left py-3 px-4 text-body font-medium text-muted-foreground">Sector</th>
              <th className="text-right py-3 px-4 text-body font-medium text-muted-foreground">Budget</th>
              <th className="text-right py-3 px-4 text-body font-medium text-muted-foreground">Disbursed</th>
              <th className="text-center py-3 px-4 text-body font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-body font-medium text-muted-foreground">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((project, index) => (
              <tr
                key={project.id}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4 text-body text-foreground font-medium">
                  {project.name}
                </td>
                <td className="py-3 px-4 text-body text-muted-foreground">
                  {project.donor}
                </td>
                <td className="py-3 px-4 text-body text-muted-foreground">
                  {project.sector}
                </td>
                <td className="py-3 px-4 text-body text-foreground text-right">
                  <CurrencyValue amount={project.budget} variant="short" />
                </td>
                <td className="py-3 px-4 text-body text-foreground text-right">
                  <CurrencyValue amount={project.disbursed} variant="short" />
                  {project.budget > 0 && !isNaN(project.disbursed) && !isNaN(project.budget) && (
                    <span className="text-helper text-muted-foreground ml-1">
                      ({(() => {
                        const percentage = (project.disbursed / project.budget) * 100
                        return isNaN(percentage) || !isFinite(percentage) ? 0 : Math.round(percentage)
                      })()}%)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <ActivityStatusRow status={project.status} />
                </td>
                <td className="py-3 px-4 text-body text-muted-foreground">
                  {formatDate(project.lastUpdated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No projects found matching your criteria
          </div>
        )}
      </div>
    </div>
  )
} 