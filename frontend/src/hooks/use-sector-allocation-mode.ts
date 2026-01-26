'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { SectorModeResponse } from '@/app/api/activities/[id]/sector-mode/route'
import { AggregatedSector, AggregateTransactionSectorsResponse } from '@/app/api/activities/[id]/aggregate-transaction-sectors/route'
import { apiFetch } from '@/lib/api-fetch';

export type SectorAllocationMode = 'activity' | 'transaction'

interface UseSectorAllocationModeOptions {
  activityId: string
  onModeChange?: (mode: SectorAllocationMode) => void
}

interface UseSectorAllocationModeReturn {
  // Current state
  mode: SectorAllocationMode
  isLoading: boolean
  isSwitching: boolean
  error: string | null
  
  // Mode info
  canSwitchToActivity: boolean
  canSwitchToTransaction: boolean
  transactionCount: number
  hasTransactionSectorData: boolean
  hasActivitySectors: boolean
  
  // Aggregation preview (for switching to activity mode)
  aggregatedSectors: AggregatedSector[] | null
  isLoadingAggregation: boolean
  
  // Actions
  switchMode: (newMode: SectorAllocationMode) => Promise<boolean>
  refreshModeInfo: () => Promise<void>
  loadAggregatedSectors: () => Promise<void>
  applyAggregatedSectors: (sectors: AggregatedSector[]) => Promise<boolean>
}

export function useSectorAllocationMode({
  activityId,
  onModeChange
}: UseSectorAllocationModeOptions): UseSectorAllocationModeReturn {
  const [mode, setMode] = useState<SectorAllocationMode>('activity')
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [canSwitchToActivity, setCanSwitchToActivity] = useState(true)
  const [canSwitchToTransaction, setCanSwitchToTransaction] = useState(true)
  const [transactionCount, setTransactionCount] = useState(0)
  const [hasTransactionSectorData, setHasTransactionSectorData] = useState(false)
  const [hasActivitySectors, setHasActivitySectors] = useState(false)
  
  const [aggregatedSectors, setAggregatedSectors] = useState<AggregatedSector[] | null>(null)
  const [isLoadingAggregation, setIsLoadingAggregation] = useState(false)

  // Fetch current mode info
  const refreshModeInfo = useCallback(async () => {
    if (!activityId) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiFetch(`/api/activities/${activityId}/sector-mode`)
      const data: SectorModeResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sector mode')
      }
      
      setMode(data.mode)
      setCanSwitchToActivity(data.canSwitchToActivity)
      setCanSwitchToTransaction(data.canSwitchToTransaction)
      setTransactionCount(data.transactionCount)
      setHasTransactionSectorData(data.hasTransactionSectorData)
      setHasActivitySectors(data.hasActivitySectors)
      
    } catch (err) {
      console.error('[useSectorAllocationMode] Error fetching mode:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sector mode')
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  // Load aggregated sectors preview
  const loadAggregatedSectors = useCallback(async () => {
    if (!activityId) return
    
    try {
      setIsLoadingAggregation(true)
      
      const response = await apiFetch(`/api/activities/${activityId}/aggregate-transaction-sectors`)
      const data: AggregateTransactionSectorsResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load aggregated sectors')
      }
      
      setAggregatedSectors(data.sectors)
      
    } catch (err) {
      console.error('[useSectorAllocationMode] Error loading aggregation:', err)
      toast.error('Failed to load sector aggregation preview')
    } finally {
      setIsLoadingAggregation(false)
    }
  }, [activityId])

  // Apply aggregated sectors to activity
  const applyAggregatedSectors = useCallback(async (sectors: AggregatedSector[]): Promise<boolean> => {
    if (!activityId) return false
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/aggregate-transaction-sectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectors })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply aggregated sectors')
      }
      
      return true
      
    } catch (err) {
      console.error('[useSectorAllocationMode] Error applying aggregation:', err)
      toast.error('Failed to apply aggregated sectors')
      return false
    }
  }, [activityId])

  // Switch mode
  const switchMode = useCallback(async (newMode: SectorAllocationMode): Promise<boolean> => {
    if (!activityId || newMode === mode) return true
    
    try {
      setIsSwitching(true)
      setError(null)
      
      // If switching to activity mode from transaction mode, 
      // first apply the aggregated sectors
      if (newMode === 'activity' && mode === 'transaction') {
        // Load aggregation if not already loaded
        if (!aggregatedSectors) {
          await loadAggregatedSectors()
        }
        
        // Apply aggregated sectors
        if (aggregatedSectors && aggregatedSectors.length > 0) {
          const applied = await applyAggregatedSectors(aggregatedSectors)
          if (!applied) {
            setIsSwitching(false)
            return false
          }
        }
      }
      
      // Now switch the mode
      const response = await apiFetch(`/api/activities/${activityId}/sector-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to switch sector mode')
      }
      
      setMode(newMode)
      onModeChange?.(newMode)
      
      toast.success(`Switched to ${newMode === 'activity' ? 'Activity' : 'Transaction'} level sector reporting`)
      
      // Refresh mode info
      await refreshModeInfo()
      
      return true
      
    } catch (err) {
      console.error('[useSectorAllocationMode] Error switching mode:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch sector mode'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsSwitching(false)
    }
  }, [activityId, mode, aggregatedSectors, loadAggregatedSectors, applyAggregatedSectors, onModeChange, refreshModeInfo])

  // Initial load
  useEffect(() => {
    refreshModeInfo()
  }, [refreshModeInfo])

  return {
    mode,
    isLoading,
    isSwitching,
    error,
    canSwitchToActivity,
    canSwitchToTransaction,
    transactionCount,
    hasTransactionSectorData,
    hasActivitySectors,
    aggregatedSectors,
    isLoadingAggregation,
    switchMode,
    refreshModeInfo,
    loadAggregatedSectors,
    applyAggregatedSectors
  }
}


