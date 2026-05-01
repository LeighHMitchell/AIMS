export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Format currency value in abbreviated form (e.g., $43.3k, $23.4M, $1.2B)
 * Used for tooltips and compact displays
 * @deprecated Use formatCurrencyShort instead
 */
export function formatCurrencyAbbreviated(value: number): string {
  return formatCurrencyShort(value)
}

/**
 * Format currency in short abbreviated form: $18.0M, $1.2B, $43.3k
 * Canonical implementation — import this instead of defining locally.
 */
export function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format currency in short lowercase form: $18.0m, $1.2b, $43.3k, $234.
 * Use in chart tooltips when the chart is in compact (non-expanded) view.
 */
export function formatCurrencyShortLower(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}b`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

/**
 * Format currency for chart Y-axis (or X-axis on horizontal bar charts).
 * Always whole numbers, lowercase suffix: $10m, $20b, $5k, $234.
 * No decimals — axes should be terse and easily scannable.
 */
export function formatAxisCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${Math.round(abs / 1_000_000_000)}b`
  if (abs >= 1_000_000) return `${sign}$${Math.round(abs / 1_000_000)}m`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

/**
 * Format currency for chart tooltips, picking the right form based on
 * whether the chart is in its expanded view.
 *  - compact:  $23.2m / $1.2b (short, lowercase)
 *  - expanded: $23,234,567   (full, no decimals)
 */
export function formatTooltipCurrency(value: number, isExpanded: boolean): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '$0'
  return isExpanded ? formatCurrency(value) : formatCurrencyShortLower(value)
}