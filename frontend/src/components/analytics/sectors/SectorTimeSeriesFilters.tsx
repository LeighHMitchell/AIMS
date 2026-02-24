"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, ChevronDown } from 'lucide-react'
import { SectorTimeSeriesFilters as FilterState } from '@/types/sector-analytics'
import { supabase } from '@/lib/supabase'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SectorTimeSeriesFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableSectors?: string[]
}

export function SectorTimeSeriesFilters({
  filters,
  onFiltersChange,
  availableSectors = []
}: SectorTimeSeriesFiltersProps) {
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string, acronym: string | null}>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [sectorSearchQuery, setSectorSearchQuery] = useState('')

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

  // Generate year options (from 2010 to current year + 5)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from(
    { length: currentYear - 2010 + 6 },
    (_, i) => (currentYear + 5 - i).toString()
  )

  // Filter sectors by search
  const filteredSectors = sectorSearchQuery.trim()
    ? availableSectors.filter(s => 
        s.toLowerCase().includes(sectorSearchQuery.toLowerCase())
      )
    : availableSectors

  const handleSectorToggle = (sector: string) => {
    const currentSectors = filters.sectors || []
    const isSelected = currentSectors.includes(sector)
    
    onFiltersChange({
      ...filters,
      sectors: isSelected
        ? currentSectors.filter(s => s !== sector)
        : [...currentSectors, sector]
    })
  }

  const handleClearSectors = () => {
    onFiltersChange({
      ...filters,
      sectors: []
    })
  }

  const handleSelectAllSectors = () => {
    onFiltersChange({
      ...filters,
      sectors: [...availableSectors]
    })
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1fr_auto_auto_1fr_1fr] gap-3 items-end">
      {/* Sector Multi-Select */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Sectors</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 font-normal"
            >
              <span className="truncate">
                {filters.sectors && filters.sectors.length > 0
                  ? `${filters.sectors.length} selected`
                  : 'All Sectors'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <Input
                placeholder="Search sectors..."
                value={sectorSearchQuery}
                onChange={(e) => setSectorSearchQuery(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="p-2 border-b flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllSectors}
                className="flex-1 h-7 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSectors}
                className="flex-1 h-7 text-xs"
              >
                Clear
              </Button>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {filteredSectors.map((sector) => (
                  <div
                    key={sector}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleSectorToggle(sector)}
                  >
                    <Checkbox
                      checked={filters.sectors?.includes(sector) || false}
                      onCheckedChange={() => handleSectorToggle(sector)}
                    />
                    <span className="text-sm truncate">{sector}</span>
                  </div>
                ))}
                {filteredSectors.length === 0 && (
                  <p className="text-sm text-slate-500 p-2">No sectors found</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        {/* Selected sectors badges */}
        {filters.sectors && filters.sectors.length > 0 && filters.sectors.length <= 3 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {filters.sectors.map(sector => (
              <Badge 
                key={sector} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-slate-200"
                onClick={() => handleSectorToggle(sector)}
              >
                {sector.length > 20 ? sector.substring(0, 20) + '...' : sector}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Year Range - From */}
      <div className="space-y-1.5 w-[120px]">
        <Label className="text-xs text-muted-foreground">From Year</Label>
        <Select 
          value={filters.yearRange?.from ? filters.yearRange.from.toString() : 'all'} 
          onValueChange={(value) => {
            const fromYear = value === 'all' ? undefined : parseInt(value)
            const toYear = filters.yearRange?.to
            onFiltersChange({ 
              ...filters, 
              yearRange: fromYear || toYear ? { from: fromYear, to: toYear } : undefined
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="From" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {yearOptions.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Range - To */}
      <div className="space-y-1.5 w-[120px]">
        <Label className="text-xs text-muted-foreground">To Year</Label>
        <Select 
          value={filters.yearRange?.to ? filters.yearRange.to.toString() : 'all'} 
          onValueChange={(value) => {
            const fromYear = filters.yearRange?.from
            const toYear = value === 'all' ? undefined : parseInt(value)
            onFiltersChange({ 
              ...filters, 
              yearRange: fromYear || toYear ? { from: fromYear, to: toYear } : undefined
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {yearOptions.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group By Level */}
      <div className="space-y-1.5">
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

      {/* Organization Filter */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Organization</Label>
        <Select 
          value={filters.organizationId || 'all'} 
          onValueChange={(value) => onFiltersChange({ ...filters, organizationId: value === 'all' ? undefined : value })}
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
    </div>
  )
}

