import React from 'react'
import { format } from 'date-fns'

/**
 * Shared display formatters for the Data Clinic tables so every tab renders
 * money and dates the same way.
 */

/**
 * Money as the app's canonical "<gray CODE> amount" — the 3-letter currency
 * code in small muted text, then the value with grouping and no symbol.
 * e.g.  USD 750,000
 */
export function renderMoney(value: number, currency?: string | null) {
  const code = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD'
  return (
    <span className="whitespace-nowrap">
      <span className="text-helper text-muted-foreground font-normal mr-1">{code}</span>
      {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
    </span>
  )
}

/** Dates as "1 Jul 2023" (no leading zero). Returns '' for empty/invalid input. */
export function formatClinicDate(dateString?: string | null): string {
  if (!dateString) return ''
  const date = new Date(String(dateString))
  return isNaN(date.getTime()) ? String(dateString) : format(date, 'd MMM yyyy')
}
