"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, AlertTriangle, MapPin, Trash2, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { MYANMAR_REGIONS, type MyanmarRegion } from "@/data/myanmar-regions"
import { toast } from "sonner"
import MyanmarRegionsMap from "@/components/MyanmarRegionsMap"
import { RegionSearchableSelect } from "@/components/ui/region-searchable-select"
import { apiFetch } from '@/lib/api-fetch';

interface SubnationalBreakdown {
  id?: string
  region_name: string
  percentage: number
  is_nationwide: boolean
}

interface SubnationalBreakdownTabProps {
  activityId: string
  canEdit?: boolean
  onDataChange?: (breakdowns: Record<string, number>) => void
}

export function SubnationalBreakdownTab({ 
  activityId, 
  canEdit = true,
  onDataChange 
}: SubnationalBreakdownTabProps) {
  const [breakdowns, setBreakdowns] = useState<Record<string, number>>({})
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [isNationwide, setIsNationwide] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [allocationStatus, setAllocationStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})
  const prevBreakdownsRef = useRef(breakdowns)

  // Calculate total percentage
  const totalPercentage = Object.values(breakdowns).reduce((sum, value) => sum + (value || 0), 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01 // Allow for floating point precision
  const hasAnyValues = Object.values(breakdowns).some(value => value > 0)

  // Helper function to determine if allocation should show green tick
  const shouldShowGreenTick = (regionName: string) => {
    const status = allocationStatus[regionName]
    const percentage = breakdowns[regionName] || 0
    
    console.log(`[DEBUG] Green tick check for ${regionName}:`, {
      percentage,
      status,
      hasPercentage: percentage > 0,
      notSaving: status !== 'saving',
      notError: status !== 'error',
      shouldShow: percentage > 0 && status !== 'saving' && status !== 'error',
      allocationStatus
    })
    
    // Only show green tick if:
    // 1. The region has a valid percentage (> 0) 
    // 2. AND it's not currently saving or in error state
    return percentage > 0 && status !== 'saving' && status !== 'error'
  }

  // Note: Removed "Perfect! 100%" toast to match sectors tab behavior
  // The sectors tab doesn't show this toast, it only shows "Sectors saved successfully!"

  // Initialize save status for existing breakdowns when component first loads
  useEffect(() => {
    // Only initialize on first load when data has been loaded from backend
    if (isLoadingData || loading) return
    
    const initialStatus: Record<string, 'saved'> = {}
    
    console.log('[DEBUG] Initializing status for loaded breakdowns:', {
      breakdowns,
      allocationStatus,
      loading,
      isLoadingData
    })
    
    // Mark existing breakdowns with valid percentages as 'saved'
    Object.entries(breakdowns).forEach(([regionName, percentage]) => {
      if (percentage > 0 && !allocationStatus[regionName]) {
        initialStatus[regionName] = 'saved'
        console.log(`[DEBUG] Marking ${regionName} as 'saved' (${percentage}%)`)
      }
    })
    
    // Only update if we have new regions to mark as saved
    if (Object.keys(initialStatus).length > 0) {
      console.log('[DEBUG] Setting initial allocation status:', initialStatus)
      setAllocationStatus(prev => ({ ...prev, ...initialStatus }))
    } else {
      console.log('[DEBUG] No initial status updates needed')
    }
  }, [loading, isLoadingData, Object.keys(breakdowns).join(',')]) // Run when data is fully loaded

  // Track changed breakdowns and set their status to 'saving' on change
  useEffect(() => {
    const prev = prevBreakdownsRef.current
    const statusUpdates: Record<string, 'saving'> = {}

    // Check if there are any actual changes
    let hasChanges = false

    // New or changed breakdowns (only set to saving if percentage > 0 and not loading)
    Object.entries(breakdowns).forEach(([regionName, percentage]) => {
      const prevPercentage = prev[regionName] || 0
      if (prevPercentage !== percentage && percentage > 0 && !isLoadingData) {
        statusUpdates[regionName] = 'saving'
        hasChanges = true
      }
    })

    // Deleted breakdowns: remove from status
    Object.keys(prev).forEach(regionName => {
      if (!breakdowns[regionName]) {
        hasChanges = true
        setAllocationStatus(s => {
          const copy = { ...s }
          delete copy[regionName]
          return copy
        })
      }
    })

    // Note: User change tracking removed since we no longer show "Perfect! 100%" toast

    if (Object.keys(statusUpdates).length > 0) {
      setAllocationStatus(s => ({ ...s, ...statusUpdates }))
    }
    
    prevBreakdownsRef.current = breakdowns
  }, [breakdowns, isLoadingData])

  // Note: Save tracking logic moved directly into the autoSave function for immediate feedback

  // Notify parent when data changes
  useEffect(() => {
    if (onDataChange && !loading) {
      onDataChange(breakdowns)
    }
  }, [breakdowns, onDataChange, loading])


  // Calculate equal distribution for nationwide mode
  const calculateEqualDistribution = () => {
    const totalRegions = MYANMAR_REGIONS.length
    
    // Calculate base percentage and distribute remainder
    const exactPercentage = 100 / totalRegions
    const basePercentage = Math.floor(exactPercentage * 100) / 100
    const totalBase = basePercentage * totalRegions
    const remainder = Math.round((100 - totalBase) * 100) / 100
    
    const distribution: Record<string, number> = {}
    let remainingCents = Math.round(remainder * 100)
    
    MYANMAR_REGIONS.forEach((region, index) => {
      let percentage = basePercentage
      if (remainingCents > 0) {
        percentage += 0.01
        remainingCents--
      }
      distribution[region.name] = percentage
    })
    
    // Verify total equals 100%
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
    
    return distribution
  }

  // Load existing data
  const loadData = useCallback(async () => {
    if (!activityId) return
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`)
      if (response.ok) {
        const data = await response.json()
        
        // Backend data loaded successfully
        
        // Check if there's a nationwide entry (all regions with is_nationwide = true)
        const nationwideEntries = data.filter((item: SubnationalBreakdown) => item.is_nationwide)
        
        let finalBreakdownsMap: Record<string, number> = {}
        
        if (nationwideEntries.length > 0) {
          setIsNationwide(true)
          // Load the saved nationwide distribution
          const breakdownsMap: Record<string, number> = {}
          const inputsMap: Record<string, string> = {}
          nationwideEntries.forEach((item: SubnationalBreakdown) => {
            breakdownsMap[item.region_name] = item.percentage
            inputsMap[item.region_name] = item.percentage.toString()
          })
          setBreakdowns(breakdownsMap)
          setInputValues(inputsMap)
          finalBreakdownsMap = breakdownsMap
        } else {
          setIsNationwide(false)
          const breakdownsMap: Record<string, number> = {}
          const inputsMap: Record<string, string> = {}
          data.forEach((item: SubnationalBreakdown) => {
            if (!item.is_nationwide) {
              breakdownsMap[item.region_name] = item.percentage
              inputsMap[item.region_name] = item.percentage.toString()
            }
          })
          setBreakdowns(breakdownsMap)
          setInputValues(inputsMap)
          finalBreakdownsMap = breakdownsMap
        }


      }
    } catch (error) {
      console.error('Error loading subnational breakdown:', error)
      toast.error('Failed to load subnational breakdown data')
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }, [activityId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle percentage input change
  const handlePercentageChange = (regionName: string, value: string) => {
    if (!canEdit || isNationwide) return
    
    // Update the input display value immediately
    setInputValues(prev => ({
      ...prev,
      [regionName]: value
    }))
    
    // Only update the actual breakdown if it's a valid number
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setBreakdowns(prev => ({
        ...prev,
        [regionName]: numValue
      }))
    } else if (value === '' || value === '.') {
      // Allow empty or just decimal point for better UX
      setBreakdowns(prev => {
        const newBreakdowns = { ...prev }
        delete newBreakdowns[regionName]
        return newBreakdowns
      })
    }
  }

  // Handle nationwide toggle
  const handleNationwideChange = async (checked: boolean) => {
    if (!canEdit) return
    
    setIsNationwide(checked)
    
    if (checked) {
      // Auto-distribute equally across all subnational locations
      const equalDistribution = calculateEqualDistribution()
      setBreakdowns(equalDistribution)
      // Update input values to match
      const inputsMap: Record<string, string> = {}
      Object.entries(equalDistribution).forEach(([region, percentage]) => {
        inputsMap[region] = percentage.toString()
      })
      setInputValues(inputsMap)
      // Auto-save immediately with nationwide distribution
      await autoSave(checked, equalDistribution)
    } else {
      // Keep existing values when switching to manual mode
      // Auto-save with current breakdowns
      await autoSave(checked, breakdowns)
    }
  }

  // Handle clear all allocations
  const handleClearAll = async () => {
    if (!canEdit || isNationwide) return
    
    // Clear all breakdowns and input values
    setBreakdowns({})
    setInputValues({})
    
    // Auto-save the empty state
    await autoSave(false, {})
  }

  // Auto-save function
  const autoSave = async (nationwide: boolean = isNationwide, currentBreakdowns: Record<string, number> = breakdowns) => {
    if (!canEdit || !activityId || isLoadingData) return
    
    setSaving(true)
    try {
      const payload = nationwide 
        ? Object.entries(currentBreakdowns)
            .filter(([_, percentage]) => percentage > 0)
            .map(([region_name, percentage]) => ({
              region_name,
              percentage,
              is_nationwide: true
            }))
        : Object.entries(currentBreakdowns)
            .filter(([_, percentage]) => percentage > 0)
            .map(([region_name, percentage]) => ({
              region_name,
              percentage,
              is_nationwide: false
            }))

      console.log('Saving breakdown:', { 
        nationwide, 
        payload, 
        activityId,
        payloadLength: payload.length,
        totalPercentage: Object.values(currentBreakdowns).reduce((sum, val) => sum + val, 0)
      })

      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // Mark all current allocations as 'saved' immediately after successful save
        setAllocationStatus(s => {
          const updated: Record<string, 'saved'> = {}
          Object.entries(currentBreakdowns).forEach(([regionName, percentage]) => {
            if (percentage > 0) {
              updated[regionName] = 'saved'
            }
          })
          return { ...s, ...updated }
        })
        
        // Only show toast if we have meaningful data to save
        if (Object.values(currentBreakdowns).some(p => p > 0)) {
          toast.success('Breakdown saved successfully!', { duration: 2000 })
        }
      } else {
        const errorData = await response.text()
        console.error('API Error:', response.status, errorData)
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving breakdown:', error)
      toast.error('Failed to save breakdown')
      
      // Mark all 'saving' allocations as 'error'
      setAllocationStatus(s => {
        const updated = { ...s }
        Object.keys(updated).forEach(regionName => {
          if (updated[regionName] === 'saving') {
            updated[regionName] = 'error'
          }
        })
        return updated
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle percentage input blur (auto-save)
  const handlePercentageBlur = async (regionName: string, value: string) => {
    if (!canEdit || isNationwide) return
    
    const numValue = parseFloat(value) || 0
    
    // Clean up the input value on blur
    if (value === '' || isNaN(numValue)) {
      setInputValues(prev => {
        const newInputs = { ...prev }
        delete newInputs[regionName]
        return newInputs
      })
      return
    }
    
    // Ensure valid range
    const clampedValue = Math.max(0, Math.min(100, numValue))
    
    // Update both input display and breakdown value
    setInputValues(prev => ({
      ...prev,
      [regionName]: clampedValue.toString()
    }))
    
    setBreakdowns(prev => ({
      ...prev,
      [regionName]: clampedValue
    }))
    
    // Auto-save immediately on blur
    await autoSave(false, { ...breakdowns, [regionName]: clampedValue })
  }

  // Determine validation status
  const getValidationStatus = () => {
    if (isNationwide) {
      return null // Don't show any message for nationwide mode
    }
    
    if (!hasAnyValues) {
      return null // Don't show warning for empty state
    }
    
    if (isValidTotal) {
      return null // Success is now handled by toast notification
    }
    
    if (totalPercentage > 100) {
      return { isValid: false, message: `❌ Total: ${totalPercentage.toFixed(1)}% — Reduce allocations to reach exactly 100%`, variant: "destructive" as const }
    }
    
    const remaining = 100 - totalPercentage
    return { isValid: false, message: `Total: ${totalPercentage.toFixed(1)}% — Add ${remaining.toFixed(1)}% more to reach 100%`, variant: "default" as const }
  }

  const validationStatus = getValidationStatus()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout: Map on left, Form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Map */}
        <MyanmarRegionsMap 
          breakdowns={breakdowns}
          onRegionClick={(regionName) => {
            // Focus on the region input when clicked
            const input = document.querySelector(`input[data-region="${regionName}"]`) as HTMLInputElement;
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />
        
        {/* Right Column - Form */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Breakdown
          </CardTitle>
          <CardDescription>
            Estimate what percentage of this activity's impact or budget benefits each region, 
            or select nationwide for equal distribution across all subnational locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Status - Show at top for immediate feedback */}
          {validationStatus && (
            <Alert variant={validationStatus.variant}>
              <div className="flex items-center gap-2">
                {validationStatus.isValid ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{validationStatus.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Nationwide Option */}
          <Button
            onClick={() => handleNationwideChange(!isNationwide)}
            disabled={!canEdit}
            variant={isNationwide ? "default" : "outline"}
            className="w-full"
          >
            Nationwide
          </Button>

          {/* Regional Breakdown - Searchable Dropdown */}
          {!isNationwide && (
            <RegionSearchableSelect
              selectedRegions={breakdowns}
              onRegionAdd={(regionName, percentage) => {
                setBreakdowns(prev => ({
                  ...prev,
                  [regionName]: percentage
                }))
                setInputValues(prev => ({
                  ...prev,
                  [regionName]: percentage.toString()
                }))
                // Auto-save after adding (only if not loading)
                if (!isLoadingData) {
                  autoSave(false, { ...breakdowns, [regionName]: percentage })
                }
              }}
              onRegionRemove={(regionName) => {
                setBreakdowns(prev => {
                  const newBreakdowns = { ...prev }
                  delete newBreakdowns[regionName]
                  return newBreakdowns
                })
                setInputValues(prev => {
                  const newInputs = { ...prev }
                  delete newInputs[regionName]
                  return newInputs
                })
                // Auto-save after removing (only if not loading)
                if (!isLoadingData) {
                  const newBreakdowns = { ...breakdowns }
                  delete newBreakdowns[regionName]
                  autoSave(false, newBreakdowns)
                }
              }}
              onPercentageChange={(regionName, percentage) => {
                setBreakdowns(prev => ({
                  ...prev,
                  [regionName]: percentage
                }))
                setInputValues(prev => ({
                  ...prev,
                  [regionName]: percentage.toString()
                }))
                // Auto-save after changing percentage (only if not loading)
                if (!isLoadingData) {
                  autoSave(false, { ...breakdowns, [regionName]: percentage })
                }
              }}
              disabled={!canEdit}
              placeholder="Search and select a state, region, or union territory..."
              allocationStatus={allocationStatus}
              shouldShowGreenTick={shouldShowGreenTick}
            />
          )}

          {/* Show all regions in read-only mode when nationwide is selected */}
          {isNationwide && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Nationwide Distribution (Equal across all locations)</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                  {Object.entries(breakdowns)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([regionName, percentage]) => (
                      <div key={regionName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{regionName}</span>
                        <span className="text-sm text-gray-600">{percentage.toFixed(2)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}


        </CardContent>
      </Card>
      </div>
    </div>
  )
}