"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

import { MapPin, Trash2, Sparkles, Loader2 } from 'lucide-react'
import myanmarData from '@/data/myanmar-locations.json'
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import { HierarchicalAdminSelect } from "@/components/ui/hierarchical-admin-select"
import { apiFetch } from '@/lib/api-fetch';
import type { ViewLevel, AllocationLevel, AdminUnit as TypedAdminUnit } from '@/types/subnational'

// Dynamically import the map to avoid SSR issues with MapLibre
const SubnationalChoroplethMap = dynamic(
  () => import('@/components/maps/SubnationalChoroplethMap'),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-gray-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading map...
          </div>
        </CardContent>
      </Card>
    ),
  }
)

interface AdminUnit {
  id: string
  name: string
  type: 'state' | 'region' | 'union-territory' | 'township'
  parentName?: string // For townships, this is the state/region name
  parentId?: string
  fullName: string // Display name with parent context
  st_pcode: string      // MIMU State/Region PCode
  ts_pcode?: string     // MIMU Township PCode (only for townships)
}

interface BreakdownEntry {
  id: string
  adminUnit: AdminUnit
  percentage: number
  allocationLevel: AllocationLevel
}

interface EnhancedSubnationalBreakdownProps {
  activityId: string
  canEdit?: boolean
  onDataChange?: (breakdowns: Record<string, number>) => void
  suggestedRegions?: string[]  // Regions from Activity Sites to auto-add
}

export function EnhancedSubnationalBreakdown({
  activityId,
  canEdit = true,
  onDataChange,
  suggestedRegions = []
}: EnhancedSubnationalBreakdownProps) {
  const [entries, setEntries] = useState<BreakdownEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [viewLevel, setViewLevel] = useState<ViewLevel>('region')

  // Track if initial load is complete and if user has made changes
  const isInitialLoadRef = useRef(true)
  const hasUserChangedDataRef = useRef(false)

  // Track which suggested regions have been processed to avoid re-adding
  const processedSuggestedRegionsRef = useRef<Set<string>>(new Set())

  // Create flattened list of all administrative units (states/regions/union territories AND townships)
  const allAdminUnits = useMemo(() => {
    const units: AdminUnit[] = []

    // Add states/regions/union territories
    myanmarData.states.forEach((state) => {
      const stateUnit: AdminUnit = {
        id: state.id,
        name: state.name,
        type: state.type as 'state' | 'region' | 'union-territory',
        fullName: state.name,
        st_pcode: (state as any).st_pcode || ''
      }
      units.push(stateUnit)

      // Add townships under this state/region
      state.townships.forEach((township) => {
        const townshipData = township as { id: string; name: string; code: string; ts_pcode?: string; st_pcode?: string }
        units.push({
          id: townshipData.id,
          name: townshipData.name,
          type: 'township',
          parentName: state.name,
          parentId: state.id,
          fullName: `${townshipData.name}, ${state.name}`,
          st_pcode: townshipData.st_pcode || stateUnit.st_pcode,
          ts_pcode: townshipData.ts_pcode
        })
      })
    })

    return units
  }, [])

  // Filter admin units based on current view level
  const filteredAdminUnits = useMemo(() => {
    if (viewLevel === 'region') {
      return allAdminUnits.filter(u => u.type !== 'township')
    }
    return allAdminUnits
  }, [allAdminUnits, viewLevel])

  // Calculate totals
  const totalPercentage = entries.reduce((sum, entry) => sum + entry.percentage, 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01
  const hasAnyValues = entries.some(entry => entry.percentage > 0)

  // Format admin unit name for display
  const formatAdminUnitName = (adminUnit: AdminUnit): string => {
    if (adminUnit.type === 'township') {
      return `${adminUnit.name} - ${adminUnit.parentName}`
    }
    return adminUnit.fullName
  }

  // Organize entries hierarchically for table display
  const organizedEntries = useMemo(() => {
    const result: Array<{
      entry: BreakdownEntry
      isParent: boolean
      isChild: boolean
      parentName?: string
    }> = []

    // Group entries by parent state/region
    const stateEntries = entries.filter((entry) => entry.adminUnit.type !== "township")
    const townshipEntries = entries.filter((entry) => entry.adminUnit.type === "township")

    const townshipsByParent = new Map<string, BreakdownEntry[]>()

    townshipEntries.forEach((entry) => {
      const parentName = entry.adminUnit.parentName ?? entry.adminUnit.name
      const siblings = townshipsByParent.get(parentName)
      if (siblings) {
        siblings.push(entry)
      } else {
        townshipsByParent.set(parentName, [entry])
      }
    })

    // Add state/region entries and their townships
    stateEntries.forEach(stateEntry => {
      const childTownships = townshipsByParent.get(stateEntry.adminUnit.name) ?? []
      const hasChildren = childTownships.length > 0

      result.push({
        entry: stateEntry,
        isParent: hasChildren,
        isChild: false
      })

      // Add townships under this state/region
      if (hasChildren) {
        childTownships.forEach((townshipEntry) => {
          result.push({
            entry: townshipEntry,
            isParent: false,
            isChild: true,
            parentName: stateEntry.adminUnit.name
          })
        })
      }
    })

    // Add orphaned townships (townships without their parent state selected)
    townshipsByParent.forEach((townships, parentName) => {
      const hasParentSelected = stateEntries.some((entry) => entry.adminUnit.name === parentName)

      if (!hasParentSelected) {
        townships.forEach((townshipEntry) => {
          result.push({
            entry: townshipEntry,
            isParent: false,
            isChild: false
          })
        })
      }
    })

    return result
  }, [entries])

  // Show toast when total reaches 100% - but only after user makes changes
  useEffect(() => {
    if (isValidTotal && hasAnyValues && !loading && hasUserChangedDataRef.current) {
      toast.success('Perfect! Total allocation is 100%', {
        duration: 3000,
        description: 'Your subnational breakdown is complete.'
      })
    }
  }, [isValidTotal, hasAnyValues, loading])

  // Convert entries to the format expected by the map
  const breakdownsForMap = useMemo(() => {
    const aggregated = new Map<string, number>()

    entries.forEach((entry) => {
      // For region view, aggregate townships to their parent region
      // For township view, keep townships separate
      const targetName =
        viewLevel === 'region' && entry.adminUnit.type === "township"
          ? entry.adminUnit.parentName ?? entry.adminUnit.name
          : entry.adminUnit.name

      const currentValue = aggregated.get(targetName)
      if (typeof currentValue === "number") {
        aggregated.set(targetName, currentValue + entry.percentage)
      } else {
        aggregated.set(targetName, entry.percentage)
      }
    })

    const result = Object.fromEntries(aggregated.entries())

    return result
  }, [entries, viewLevel])

  // Load existing data
  const loadData = useCallback(async () => {
    console.log('[EnhancedSubnationalBreakdown] loadData called with activityId:', activityId)

    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      console.log('[EnhancedSubnationalBreakdown] No valid activityId, setting loading to false')
      setLoading(false)
      return
    }

    try {
      console.log('[EnhancedSubnationalBreakdown] Fetching data from API...')
      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`)

      if (response.ok) {
        const data = await response.json()
        console.log('[EnhancedSubnationalBreakdown] Received data:', data)

        // Convert backend data to entries format
        const loadedEntries: BreakdownEntry[] = []
        const loadedSelectedUnits: string[] = []

        let hasTownshipData = false

        data.forEach((item: any, index: number) => {
          // Determine if this is a township entry (has ts_pcode or uses "State - Township" format)
          const isTownship = item.allocation_level === 'township' ||
                            item.ts_pcode ||
                            item.region_name.includes(' - ')

          if (isTownship) hasTownshipData = true

          // Try to find matching admin unit
          const adminUnit = allAdminUnits.find(unit => {
            // First try to match by pcode
            if (item.ts_pcode && unit.ts_pcode === item.ts_pcode) {
              return true
            }
            if (!isTownship && item.st_pcode && unit.st_pcode === item.st_pcode && unit.type !== 'township') {
              return true
            }

            // Fall back to name matching
            if (item.region_name.includes(' - ')) {
              const parts = item.region_name.split(' - ')
              const stateName = parts[0]
              const townshipName = parts[1]
              return unit.type === 'township' &&
                     unit.name === townshipName &&
                     unit.parentName === stateName
            } else {
              // Handle state/region format
              return unit.type !== 'township' && unit.name === item.region_name
            }
          })

          if (adminUnit) {
            loadedEntries.push({
              id: `entry-${index}`,
              adminUnit,
              percentage: item.percentage,
              allocationLevel: item.allocation_level || (adminUnit.type === 'township' ? 'township' : 'region')
            })
            loadedSelectedUnits.push(adminUnit.id)
          }
        })

        setEntries(loadedEntries)
        setSelectedUnits(loadedSelectedUnits)

        // Set view level based on loaded data
        if (hasTownshipData) {
          setViewLevel('township')
        }

        console.log('[EnhancedSubnationalBreakdown] Data loaded successfully')
      } else {
        console.log('[EnhancedSubnationalBreakdown] No existing data found, response status:', response.status)
        // This is normal for new activities
      }
    } catch (error) {
      console.error('[EnhancedSubnationalBreakdown] Error loading data:', error)
      // Don't show error toast for new activities without data
      if (error instanceof Error && !error.message.includes('404')) {
        toast.error('Failed to load subnational breakdown data')
      }
    } finally {
      console.log('[EnhancedSubnationalBreakdown] Setting loading to false')
      setLoading(false)
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 500)
    }
  }, [activityId, allAdminUnits])

  useEffect(() => {
    console.log('[EnhancedSubnationalBreakdown] Loading data for activityId:', activityId)
    loadData()

    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('[EnhancedSubnationalBreakdown] Timeout reached, forcing loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [activityId, loadData])

  // Handle suggested regions from Activity Sites
  // This adds states/regions to the breakdown when locations are added
  useEffect(() => {
    if (loading || !suggestedRegions?.length) return

    // Find regions that need to be added (not already selected and not already processed)
    const regionsToAdd: string[] = []

    suggestedRegions.forEach(regionName => {
      // Skip if we've already processed this region name
      if (processedSuggestedRegionsRef.current.has(regionName)) return

      const adminUnit = allAdminUnits.find(u => u.name === regionName && u.type !== 'township')
      if (adminUnit && !selectedUnits.includes(adminUnit.id)) {
        regionsToAdd.push(adminUnit.id)
        // Mark as processed
        processedSuggestedRegionsRef.current.add(regionName)
      }
    })

    // Add all missing regions at once
    if (regionsToAdd.length > 0) {
      console.log('[EnhancedSubnationalBreakdown] Auto-adding regions from Activity Sites:', regionsToAdd)

      setSelectedUnits(prev => [...prev, ...regionsToAdd])
      setEntries(prev => {
        const newEntries = [...prev]
        regionsToAdd.forEach(unitId => {
          const adminUnit = allAdminUnits.find(unit => unit.id === unitId)
          if (adminUnit) {
            newEntries.push({
              id: `entry-${Date.now()}-${unitId}`,
              adminUnit,
              percentage: 0,
              allocationLevel: 'region'
            })
          }
        })
        return newEntries
      })
    }
  }, [suggestedRegions, loading, allAdminUnits, selectedUnits])

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!canEdit || !activityId) return

    setSaving(true)
    try {
      // Convert entries back to backend format with pcodes
      const payload = entries.map(entry => ({
        region_name: entry.adminUnit.type === 'township'
          ? `${entry.adminUnit.parentName} - ${entry.adminUnit.name}`
          : entry.adminUnit.name,
        percentage: entry.percentage || 0,
        is_nationwide: false,
        allocation_level: entry.allocationLevel,
        st_pcode: entry.adminUnit.st_pcode,
        ts_pcode: entry.adminUnit.ts_pcode
      }))

      console.log('[DEBUG] Subnational autoSave payload:', {
        activityId,
        entriesCount: entries.length,
        payload,
        hasNonZeroPercentages: payload.some(p => p.percentage > 0)
      });

      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json();
      console.log('[DEBUG] Subnational save response:', {
        ok: response.ok,
        status: response.status,
        data: responseData
      });

      if (response.ok) {
        // Only show success toast if user has made changes
        if (entries.some(entry => entry.percentage > 0) && hasUserChangedDataRef.current) {
          toast.success('Breakdown saved', { duration: 2000 })
        }
      } else {
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving breakdown:', error)
      toast.error('Failed to save breakdown')
    } finally {
      setSaving(false)
    }
  }, [canEdit, activityId, entries])

  // Handle selection changes from MultiSelect
  const handleSelectionChange = (newSelectedUnits: string[]) => {
    setSelectedUnits(newSelectedUnits)

    // Mark that user has made changes (only if not initial load)
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    // Update entries based on selection
    const newEntries: BreakdownEntry[] = []

    newSelectedUnits.forEach(unitId => {
      const adminUnit = allAdminUnits.find(unit => unit.id === unitId)
      if (adminUnit) {
        // Check if we already have an entry for this unit
        const existingEntry = entries.find(entry => entry.adminUnit.id === unitId)

        newEntries.push({
          id: existingEntry?.id || `entry-${Date.now()}-${unitId}`,
          adminUnit,
          percentage: existingEntry?.percentage || 0,
          allocationLevel: existingEntry?.allocationLevel || (adminUnit.type === 'township' ? 'township' : 'region')
        })
      }
    })

    setEntries(newEntries)
  }

  // Handle feature click from map
  const handleFeatureClick = (pcode: string, name: string, level: AllocationLevel) => {
    // Find the admin unit for this feature
    const adminUnit = allAdminUnits.find(unit => {
      if (level === 'township') {
        return unit.ts_pcode === pcode
      } else {
        return unit.st_pcode === pcode && unit.type !== 'township'
      }
    })

    if (adminUnit && !selectedUnits.includes(adminUnit.id)) {
      handleSelectionChange([...selectedUnits, adminUnit.id])
    }
  }

  // Update percentage for a specific entry
  const updatePercentage = (entryId: string, percentage: number) => {
    // Mark that user has made changes
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    setEntries(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, percentage } : entry
    ))
  }

  // Remove an entry
  const removeEntry = (entryId: string) => {
    // Mark that user has made changes
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    const entry = entries.find(e => e.id === entryId)
    if (entry) {
      setSelectedUnits(prev => prev.filter(id => id !== entry.adminUnit.id))
      setEntries(prev => prev.filter(e => e.id !== entryId))
    }
  }

  // Distribute 100% equally across all selected units
  const distributeEqually = () => {
    if (entries.length === 0) return

    // Mark that user has made changes
    hasUserChangedDataRef.current = true

    const equalPercentage = 100 / entries.length
    setEntries(prev => prev.map(entry => ({
      ...entry,
      percentage: equalPercentage
    })))

    toast.success('Distributed equally', {
      description: `${equalPercentage.toFixed(1)}% allocated to each unit`
    })
  }

  // Clear all percentage allocations but keep selected units
  const clearAllocations = () => {
    // Mark that user has made changes
    hasUserChangedDataRef.current = true

    setEntries(prev => prev.map(entry => ({
      ...entry,
      percentage: 0
    })))

    toast.info('Allocations cleared', {
      description: 'All percentages reset to 0%'
    })
  }

  // Notify parent when data changes
  useEffect(() => {
    if (onDataChange && !loading) {
      onDataChange(breakdownsForMap)
    }
  }, [breakdownsForMap, onDataChange, loading])

  // Auto-save when entries change (including just selections without percentages)
  // But only after initial load is complete
  useEffect(() => {
    if (!loading && activityId && !isInitialLoadRef.current) {
      const timeoutId = setTimeout(autoSave, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [entries, selectedUnits, loading, activityId, autoSave])

  if (loading) {
    console.log('[EnhancedSubnationalBreakdown] Still loading, activityId:', activityId)
    return (
      <div className="space-y-6">
        {/* Two-column layout skeleton to match actual layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Skeleton */}
          <div className="h-[800px]">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[700px] w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>

          {/* Form Skeleton */}
          <Card className="h-[800px] flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {/* Admin Unit Selection Skeleton */}
              <div className="space-y-4 mb-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>

              {/* Entries Table Skeleton */}
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Skeleton */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>

              {/* Loading message */}
              <div className="flex items-center justify-center mt-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading subnational breakdown data...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout: Map on left, Form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Map (much taller to fit all of Myanmar) */}
        <div className="h-[800px]">
          <SubnationalChoroplethMap
            breakdowns={breakdownsForMap}
            viewLevel={viewLevel}
            onViewLevelChange={setViewLevel}
            onFeatureClick={handleFeatureClick}
          />
        </div>

        {/* Right Column - Form */}
        <Card className="h-[800px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Subnational Breakdown
              <HelpTextTooltip content="Select administrative units (states/regions or townships) and provide percentage breakdowns. Click on the map to add areas quickly. Toggle between Region and Township views." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 overflow-y-auto">
            {/* Hierarchical Admin Select Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Administrative Units:
                {viewLevel === 'township' && (
                  <span className="text-xs text-muted-foreground ml-2">(includes townships)</span>
                )}
              </label>
              <HierarchicalAdminSelect
                allAdminUnits={filteredAdminUnits}
                selected={selectedUnits}
                onChange={handleSelectionChange}
                placeholder={viewLevel === 'region'
                  ? "Select states, regions, or union territories..."
                  : "Select regions or townships..."}
                disabled={!canEdit}
              />
            </div>

            {/* Action Buttons */}
            {entries.length > 0 && canEdit && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={distributeEqually}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Distribute Equally
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllocations}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600 active:text-red-600 focus-visible:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                  Clear All
                </Button>
              </div>
            )}

            {/* Percentage Allocation Table */}
            {entries.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-sm text-gray-700">Administrative Unit</th>
                      <th className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-28 text-right font-medium text-sm text-gray-700">%</span>
                          <span className="w-8"></span>
                        </div>
                      </th>
                      {canEdit && <th className="w-10 px-3 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {organizedEntries.map(({ entry, isParent, isChild }) => (
                      <tr key={entry.id} className="border-t">
                        <td className={`px-3 py-2 ${isChild ? 'pl-8' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isParent ? 'font-semibold' : isChild ? 'font-normal text-gray-700' : 'font-medium'}`}>
                              {isChild ? entry.adminUnit.name : entry.adminUnit.fullName}
                            </span>
                            {entry.adminUnit.type === 'township' && (
                              <Badge variant="outline" className="text-xs">Township</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={entry.percentage || ''}
                              onChange={(e) => updatePercentage(entry.id, parseFloat(e.target.value) || 0)}
                              className="w-28 text-right text-sm h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                              disabled={!canEdit}
                            />
                            <span className="text-xs text-gray-500 w-8 text-left">%</span>
                          </div>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(entry.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {hasAnyValues && (
                    <tfoot className="border-t">
                      <tr>
                        <td className="px-3 py-2 font-semibold text-sm">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-700 font-semibold text-sm w-28 text-right">
                              {totalPercentage.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-700 font-semibold w-8 text-left">%</span>
                          </div>
                        </td>
                        {canEdit && <td className="px-3 py-2"></td>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No administrative units selected yet.</p>
                <p className="text-sm">Use the dropdown above or click on the map to add regions.</p>
              </div>
            )}

            {/* Save Status */}
            {entries.length > 0 && saving && (
              <div className="flex justify-end pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Saving...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
