"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { SectorAnalyticsFilters } from '@/types/sector-analytics'
import { supabase } from '@/lib/supabase'

interface SectorFiltersProps {
  filters: SectorAnalyticsFilters
  onFiltersChange: (filters: SectorAnalyticsFilters) => void
}

export function SectorFilters({ filters, onFiltersChange }: SectorFiltersProps) {
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string, acronym: string | null}>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .order('name')
      
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString())

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Year Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Calendar Year</Label>
            <Select 
              value={filters.year || 'all'} 
              onValueChange={(value) => onFiltersChange({ ...filters, year: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Organization</Label>
            <Select 
              value={filters.organizationId || 'all'} 
              onValueChange={(value) => onFiltersChange({ ...filters, organizationId: value })}
              disabled={loadingOrgs}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingOrgs ? "Loading..." : "Select organization"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.acronym || org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Status Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Activity Status</Label>
            <Select 
              value={filters.publicationStatus || 'all'} 
              onValueChange={(value: 'published' | 'all') => onFiltersChange({ ...filters, publicationStatus: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="published">Published Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group By Level */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Group By</Label>
            <Select 
              value={filters.groupByLevel} 
              onValueChange={(value: '1' | '3' | '5') => onFiltersChange({ ...filters, groupByLevel: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1-Digit (Category)</SelectItem>
                <SelectItem value="3">3-Digit (Sector)</SelectItem>
                <SelectItem value="5">5-Digit (Sub-sector)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

