import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Canonical money display used in tables across the app: a small, muted "USD"
 * label followed by a compact value WITHOUT a "$" symbol (e.g. `USD 28.2m`).
 * Matches the OrganizationTable / org tabs pattern.
 */
function compact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}b`
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}k`
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface UsdAmountProps {
  value: number
  /** Render a muted dash when value is 0/undefined instead of "USD 0". */
  dashWhenZero?: boolean
  className?: string
}

export function UsdAmount({ value, dashWhenZero = true, className }: UsdAmountProps) {
  if (dashWhenZero && (!value || value === 0)) {
    return <span className="text-muted-foreground">–</span>
  }
  return (
    <span className={cn('text-foreground', className)}>
      <span className="text-helper text-muted-foreground font-normal">USD</span> {compact(value)}
    </span>
  )
}

export default UsdAmount
