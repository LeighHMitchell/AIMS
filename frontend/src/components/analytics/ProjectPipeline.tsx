"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingText } from '@/components/ui/loading-text'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { format } from 'date-fns'

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

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '$0'
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(safeValue)
    } catch (error) {
      console.error('[ProjectPipeline] Error formatting currency:', error, value)
      return '$0'
    }
  }

  const getStatusLabel = (status: string) => {
    // IATI Status Codes to Labels
    const statusLabels: Record<string, string> = {
      '1': 'Pipeline',
      '2': 'Implementation', 
      '3': 'Finalisation',
      '4': 'Closed',
      '5': 'Cancelled',
      '6': 'Suspended'
    }
    return statusLabels[status] || status
  }

  const getStatusColor = (status: string) => {
    // IATI Status Codes:
    // 1 = Pipeline (planning)
    // 2 = Implementation (active)
    // 3 = Finalisation
    // 4 = Closed (completed)
    // 5 = Cancelled
    // 6 = Suspended
    switch (status) {
      case '1':
        return 'bg-blue-100 text-blue-800' // Pipeline
      case '2':
        return 'bg-green-100 text-green-800' // Implementation
      case '3':
        return 'bg-yellow-100 text-yellow-800' // Finalisation
      case '4':
        return 'bg-muted text-foreground' // Closed
      case '5':
        return 'bg-red-100 text-red-800' // Cancelled
      case '6':
        return 'bg-orange-100 text-orange-800' // Suspended
      default:
        return 'bg-muted text-foreground'
    }
  }

  const filteredData = data.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.sector.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Project Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Donor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Sector</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Budget</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Disbursed</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((project, index) => (
              <tr 
                key={project.id}
                className={index % 2 === 0 ? 'bg-card' : 'bg-muted'}
              >
                <td className="py-3 px-4 text-sm text-foreground font-medium">
                  {project.name}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {project.donor}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {project.sector}
                </td>
                <td className="py-3 px-4 text-sm text-foreground text-right">
                  {formatCurrency(project.budget)}
                </td>
                <td className="py-3 px-4 text-sm text-foreground text-right">
                  {formatCurrency(project.disbursed)}
                  {project.budget > 0 && !isNaN(project.disbursed) && !isNaN(project.budget) && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({(() => {
                        const percentage = (project.disbursed / project.budget) * 100
                        return isNaN(percentage) || !isFinite(percentage) ? 0 : Math.round(percentage)
                      })()}%)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge 
                    variant="secondary"
                    className={getStatusColor(project.status)}
                  >
                    {getStatusLabel(project.status)}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {format(new Date(project.lastUpdated), 'MMM d, yyyy')}
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