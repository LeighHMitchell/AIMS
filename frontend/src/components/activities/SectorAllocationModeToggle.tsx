'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Loader2, AlertTriangle, Check } from 'lucide-react'
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

  const handleCardClick = (selectedMode: SectorAllocationMode) => {
    if (selectedMode === mode || disabled || isSwitching) return
    handleToggleChange(selectedMode === 'transaction')
  }

  return (
    <>
      <div className={cn("flex items-center gap-4", className)}>
        {/* Activity Level Card */}
        <button
          type="button"
          onClick={() => handleCardClick('activity')}
          disabled={disabled || isSwitching}
          className={cn(
            "relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
            mode === 'activity'
              ? "ring-border bg-primary/5"
              : "ring-border bg-background hover:bg-gray-50",
            (disabled || isSwitching) && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Background image */}
          <Image src="/images/sector-activity-level.png" alt="Activity Level" fill className="object-cover opacity-15" />

          {/* Checkmark overlay */}
          {mode === 'activity' && (
            <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}

          {/* Text overlay */}
          <div className="relative z-10 p-3">
            <h4 className="text-sm font-semibold">Activity Level</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Single breakdown for all transactions
            </p>
          </div>
        </button>

        {/* Transaction Level Card */}
        <button
          type="button"
          onClick={() => handleCardClick('transaction')}
          disabled={disabled || isSwitching}
          className={cn(
            "relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
            mode === 'transaction'
              ? "ring-border bg-primary/5"
              : "ring-border bg-background hover:bg-gray-50",
            (disabled || isSwitching) && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Background image */}
          <Image src="/images/sector-transaction-level.png" alt="Transaction Level" fill className="object-cover opacity-15" />

          {/* Checkmark overlay */}
          {mode === 'transaction' && (
            <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}

          {/* Text overlay */}
          <div className="relative z-10 p-3">
            <h4 className="text-sm font-semibold">Transaction Level</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Custom breakdown per transaction
            </p>
          </div>
        </button>

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


