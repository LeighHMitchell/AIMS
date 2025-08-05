"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, AlertTriangle, MapPin, Trash2 } from 'lucide-react'
import { MYANMAR_REGIONS, type MyanmarRegion } from "@/data/myanmar-regions"
import { toast } from "sonner"

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
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false)

  // Calculate total percentage
  const totalPercentage = Object.values(breakdowns).reduce((sum, value) => sum + (value || 0), 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01 // Allow for floating point precision
  const hasAnyValues = Object.values(breakdowns).some(value => value > 0)

  // Show success toast when total reaches 100%
  useEffect(() => {
    if (isValidTotal && hasAnyValues && !isNationwide && !hasShownSuccessToast) {
      toast.success(`✅ Perfect! Total allocation: ${totalPercentage.toFixed(1)}%`, {
        duration: 3000,
        description: "All subnational allocations now total exactly 100%"
      })
      setHasShownSuccessToast(true)
    } else if (!isValidTotal) {
      // Reset the flag when total is no longer 100%
      setHasShownSuccessToast(false)
    }
  }, [isValidTotal, hasAnyValues, isNationwide, totalPercentage, hasShownSuccessToast])

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
      const response = await fetch(`/api/activities/${activityId}/subnational-breakdown`)
      if (response.ok) {
        const data = await response.json()
        
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
    if (!canEdit || !activityId) return
    
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

      const response = await fetch(`/api/activities/${activityId}/subnational-breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Breakdown saved', { duration: 2000 })
      } else {
        const errorData = await response.text()
        console.error('API Error:', response.status, errorData)
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving breakdown:', error)
      toast.error('Failed to save breakdown')
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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <label 
                htmlFor="nationwide" 
                className="text-sm font-medium leading-none"
              >
                Nationwide (apply equal share to all States/Regions)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {isNationwide 
                  ? "All regions are allocated equally. Toggle off to manually adjust values."
                  : "Toggle on to automatically distribute 100% equally across all subnational locations."
                }
              </p>
            </div>
            <Switch
              id="nationwide"
              checked={isNationwide}
              onCheckedChange={handleNationwideChange}
              disabled={!canEdit}
            />
          </div>

          {/* Regional Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Subnational Allocation</h4>
              {!isNationwide && canEdit && hasAnyValues && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                  title="Clear all allocations"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-4">
                {[...MYANMAR_REGIONS]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((region) => (
                  <div 
                    key={region.name} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isNationwide ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {region.name}
                      </div>
                      <div className="text-xs text-gray-500">{region.type}</div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={inputValues[region.name] ?? (breakdowns[region.name]?.toString() || '')}
                        onChange={(e) => handlePercentageChange(region.name, e.target.value)}
                        onBlur={(e) => handlePercentageBlur(region.name, e.target.value)}
                        onFocus={(e) => {
                          (e.target as HTMLInputElement).select()
                          // Ensure selection works on mobile/touch devices
                          setTimeout(() => (e.target as HTMLInputElement).select(), 10)
                        }}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        placeholder="0.00"
                        className={`w-32 text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isNationwide ? 'bg-gray-100 text-gray-600' : ''
                        }`}
                        disabled={!canEdit || isNationwide}
                        readOnly={isNationwide}
                      />
                      <span className="text-sm text-gray-500 w-4">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>


        </CardContent>
      </Card>
    </div>
  )
}