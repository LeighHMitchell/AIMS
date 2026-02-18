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
import { cn } from '@/lib/utils'

type GeographyLevel = 'activity' | 'transaction'

interface GeographyLevelToggleProps {
  geographyLevel: GeographyLevel
  onGeographyLevelChange?: (level: GeographyLevel) => void
  disabled?: boolean
  isSwitching?: boolean
  className?: string
}

export function GeographyLevelToggle({
  geographyLevel,
  onGeographyLevelChange,
  disabled = false,
  isSwitching = false,
  className
}: GeographyLevelToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingLevel, setPendingLevel] = useState<GeographyLevel | null>(null)

  const handleCardClick = (selectedLevel: GeographyLevel) => {
    if (selectedLevel === geographyLevel || disabled || isSwitching) return
    setPendingLevel(selectedLevel)
    setShowConfirmDialog(true)
  }

  const handleConfirmSwitch = () => {
    if (pendingLevel) {
      onGeographyLevelChange?.(pendingLevel)
    }
    setShowConfirmDialog(false)
    setPendingLevel(null)
  }

  const handleCancelSwitch = () => {
    setShowConfirmDialog(false)
    setPendingLevel(null)
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
            geographyLevel === 'activity'
              ? "ring-border bg-primary/5"
              : "ring-border bg-background hover:bg-gray-50",
            (disabled || isSwitching) && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Background image */}
          <Image src="/images/geography-activity-level.png" alt="Activity Level" fill className="object-cover opacity-15" />

          {/* Checkmark overlay */}
          {geographyLevel === 'activity' && (
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
            geographyLevel === 'transaction'
              ? "ring-border bg-primary/5"
              : "ring-border bg-background hover:bg-gray-50",
            (disabled || isSwitching) && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Background image */}
          <Image src="/images/geography-transaction-level.png" alt="Transaction Level" fill className="object-cover opacity-15" />

          {/* Checkmark overlay */}
          {geographyLevel === 'transaction' && (
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {pendingLevel === 'activity'
                ? 'Switch to Activity-Level Geography?'
                : 'Switch to Transaction-Level Geography?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {pendingLevel === 'activity' ? (
                <>
                  <p>
                    Countries and regions will be set once for the whole activity.
                    Transactions will not have individual geographic targeting.
                  </p>
                  <p className="text-amber-600 font-medium">
                    Any transaction-level geography data will no longer apply. The activity-level allocation below will be used instead.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Each transaction will specify its own recipient country or region.
                    The activity-level geography allocation below will be disabled.
                  </p>
                  <p className="text-amber-600 font-medium">
                    After switching, you will need to set geography individually on each transaction.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

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
                `Switch to ${pendingLevel === 'activity' ? 'Activity' : 'Transaction'} Level`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default GeographyLevelToggle
