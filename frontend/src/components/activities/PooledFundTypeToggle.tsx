'use client'

import React from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PooledFundTypeToggleProps {
  isPooledFund: boolean
  onSelect: (isPooledFund: boolean) => void
  disabled?: boolean
  isSaving?: boolean
  className?: string
}

/**
 * Two-card choice for activity type: Standard activity vs Pooled Fund.
 * Matches the UI of Sector and Geography level toggles (image cards with checkmark).
 */
export function PooledFundTypeToggle({
  isPooledFund,
  onSelect,
  disabled = false,
  isSaving = false,
  className,
}: PooledFundTypeToggleProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Standard activity card */}
      <button
        type="button"
        onClick={() => !disabled && !isSaving && isPooledFund && onSelect(false)}
        disabled={disabled || isSaving}
        className={cn(
          'relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
          !isPooledFund ? 'ring-border bg-primary/5' : 'ring-border bg-background hover:bg-gray-50',
          (disabled || isSaving) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Image
          src="/images/activity-type-standard.png"
          alt="Standard activity"
          fill
          className="object-cover opacity-15"
        />
        {!isPooledFund && (
          <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
        <div className="relative z-10 p-3">
          <h4 className="text-sm font-semibold">Standard activity</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Single project or programme
          </p>
        </div>
      </button>

      {/* Pooled Fund card */}
      <button
        type="button"
        onClick={() => !disabled && !isSaving && onSelect(true)}
        disabled={disabled || isSaving}
        className={cn(
          'relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
          isPooledFund ? 'ring-border bg-primary/5' : 'ring-border bg-background hover:bg-gray-50',
          (disabled || isSaving) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Image
          src="/images/activity-type-pooled.png"
          alt="Pooled fund"
          fill
          className="object-cover opacity-15"
        />
        {isPooledFund && (
          <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
        <div className="relative z-10 p-3">
          <h4 className="text-sm font-semibold">Pooled fund</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Receives contributions and disburses to child activities
          </p>
        </div>
      </button>
    </div>
  )
}

export default PooledFundTypeToggle
