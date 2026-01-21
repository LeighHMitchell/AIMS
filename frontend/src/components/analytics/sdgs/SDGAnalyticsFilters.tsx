"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Building2, Target, DollarSign, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { SDG_GOALS } from '@/data/sdg-targets'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface SDGAnalyticsFiltersProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  onOrganizationChange: (orgId: string) => void
  onDateRangeChange: (range: { from: Date; to: Date }) => void
  onSelectedSdgsChange: (sdgs: number[]) => void
  onMetricChange: (metric: 'activities' | 'budget' | 'planned') => void
}

export function SDGAnalyticsFilters({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  onOrganizationChange,
  onDateRangeChange,
  onSelectedSdgsChange,
  onMetricChange
}: SDGAnalyticsFiltersProps) {
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true)
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const toggleSdg = (sdgId: number) => {
    if (selectedSdgs.includes(sdgId)) {
      onSelectedSdgsChange(selectedSdgs.filter(id => id !== sdgId))
    } else {
      onSelectedSdgsChange([...selectedSdgs, sdgId])
    }
  }

  const clearSdgSelection = () => {
    onSelectedSdgsChange([])
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organization Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </label>
          <Select
            value={organizationId}
            onValueChange={onOrganizationChange}
            disabled={loadingOrgs}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Date Range
          </label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "PPP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && onDateRangeChange({ ...dateRange, from: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "PPP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && onDateRangeChange({ ...dateRange, to: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metric
          </label>
          <Select value={metric} onValueChange={(value: 'activities' | 'budget' | 'planned') => onMetricChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activities">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Number of Activities
                </div>
              </SelectItem>
              <SelectItem value="budget">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Activity Budget
                </div>
              </SelectItem>
              <SelectItem value="planned">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Planned Disbursements
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SDG Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Target className="h-4 w-4" />
            SDG Selection
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selectedSdgs.length === 0
                  ? "All SDGs"
                  : `${selectedSdgs.length} SDG${selectedSdgs.length !== 1 ? 's' : ''} selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Select SDGs</h4>
                  {selectedSdgs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSdgSelection}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {SDG_GOALS.map((goal) => (
                    <div
                      key={goal.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100",
                        selectedSdgs.includes(goal.id) && "bg-slate-200"
                      )}
                      onClick={() => toggleSdg(goal.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSdgs.includes(goal.id)}
                        onChange={() => toggleSdg(goal.id)}
                        className="rounded"
                      />
                      <span className="text-xs font-medium">SDG {goal.id}</span>
                      <span className="text-xs text-slate-600 truncate">{goal.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Selected SDGs Display */}
      {selectedSdgs.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-600">Selected:</span>
          {selectedSdgs.map((sdgId) => {
            const goal = SDG_GOALS.find(g => g.id === sdgId)
            return (
              <Badge
                key={sdgId}
                variant="secondary"
                className="flex items-center gap-1"
              >
                SDG {sdgId}: {goal?.name}
                <button
                  onClick={() => toggleSdg(sdgId)}
                  className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}







