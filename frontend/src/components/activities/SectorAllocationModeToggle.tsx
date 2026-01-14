'use client'

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, HelpCircle, AlertTriangle } from 'lucide-react'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSectorAllocationMode, SectorAllocationMode } from '@/hooks/use-sector-allocation-mode'
import { cn } from '@/lib/utils'
import { LoadingText } from '@/components/ui/loading-text'

interface SectorAllocationModeToggleProps {
  activityId: string
  onModeChange?: (mode: SectorAllocationMode) => void
  disabled?: boolean
  className?: string
}

export function SectorAllocationModeToggle({
  activityId,
  onModeChange,
  disabled = false,
  className
}: SectorAllocationModeToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingMode, setPendingMode] = useState<SectorAllocationMode | null>(null)

  const {
    mode,
    isLoading,
    isSwitching,
    canSwitchToTransaction,
    transactionCount,
    hasTransactionSectorData,
    hasActivitySectors,
    aggregatedSectors,
    isLoadingAggregation,
    switchMode,
    loadAggregatedSectors
  } = useSectorAllocationMode({
    activityId,
    onModeChange
  })

  const handleToggleChange = async (checked: boolean) => {
    const newMode: SectorAllocationMode = checked ? 'transaction' : 'activity'
    
    if (newMode === mode) return

    // If switching to activity mode from transaction mode, show confirmation with aggregation preview
    if (newMode === 'activity' && mode === 'transaction' && hasTransactionSectorData) {
      setPendingMode(newMode)
      setShowConfirmDialog(true)
      await loadAggregatedSectors()
      return
    }

    // If switching to transaction mode, show confirmation
    if (newMode === 'transaction' && mode === 'activity') {
      setPendingMode(newMode)
      setShowConfirmDialog(true)
      return
    }

    // Otherwise, switch directly
    await switchMode(newMode)
  }

  const handleConfirmSwitch = async () => {
    if (pendingMode) {
      await switchMode(pendingMode)
    }
    setShowConfirmDialog(false)
    setPendingMode(null)
  }

  const handleCancelSwitch = () => {
    setShowConfirmDialog(false)
    setPendingMode(null)
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <LoadingText className="text-sm">Loading...</LoadingText>
      </div>
    )
  }

  return (
    <>
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2">
          <Switch
            id="sector-allocation-mode"
            checked={mode === 'transaction'}
            onCheckedChange={handleToggleChange}
            disabled={disabled || isSwitching || (mode === 'activity' && !canSwitchToTransaction)}
          />
          <Label 
            htmlFor="sector-allocation-mode" 
            className="text-sm font-medium cursor-pointer"
          >
            Report at Transaction Level
          </Label>
          <HelpTextTooltip 
            content={
              <div className="space-y-2">
                <p><strong>Activity Level (Default):</strong> Define sector breakdown once for the activity. All transactions automatically inherit this breakdown.</p>
                <p><strong>Transaction Level:</strong> Define different sector breakdowns for each transaction. The activity will show a weighted average of all transaction sectors.</p>
              </div>
            }
          />
        </div>

        <Badge 
          variant={mode === 'transaction' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {mode === 'transaction' ? 'Transaction Level' : 'Activity Level'}
        </Badge>

        {isSwitching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {pendingMode === 'activity' 
                ? 'Switch to Activity-Level Sectors?' 
                : 'Switch to Transaction-Level Sectors?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {pendingMode === 'activity' ? (
                <>
                  <p>
                    This will aggregate your transaction-level sector data into an activity-level breakdown.
                    {transactionCount > 0 && ` The weighted average across ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} is shown below.`}
                  </p>
                  <p className="text-amber-600 font-medium">
                    After switching, all transactions will inherit the activity's sector breakdown and you won't be able to edit sectors per transaction.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This will allow you to specify different sector breakdowns for each transaction.
                    {hasActivitySectors && ' Your current activity sectors will be copied to all existing transactions as a starting point.'}
                  </p>
                  <p className="text-amber-600 font-medium">
                    After switching, the activity's sector tab will show a read-only weighted average of all transaction sectors.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Aggregation Preview */}
          {pendingMode === 'activity' && (
            <div className="mt-4">
              {isLoadingAggregation ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading aggregation preview...</span>
                </div>
              ) : aggregatedSectors && aggregatedSectors.length > 0 ? (
                <div className="border rounded-md max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Sector</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Weighted %</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Transactions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregatedSectors.map((sector) => (
                        <TableRow key={sector.sector_code}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{sector.sector_code}</span>
                              <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {sector.sector_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {sector.weighted_percentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {sector.transaction_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No sector data to aggregate from transactions.
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSwitch}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                `Switch to ${pendingMode === 'activity' ? 'Activity' : 'Transaction'} Level`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default SectorAllocationModeToggle


