/**
 * Canonical money & date formatting. Import from here — do NOT define
 * formatCurrency/formatDate locally.
 *
 * Currency style (project standard):
 *   - ISO code, space, value           e.g.  USD 1,234,567.50
 *   - Compact: 1-dp lowercase k/m/b    e.g.  USD 23.4m / USD 1.2b / USD 43.3k
 *   - Under 1,000: whole number        e.g.  USD 850
 *   - Sign first                       e.g.  -USD 23.4m
 *   - Currency-aware (never assume $)  e.g.  EUR 4.2k
 *
 * Date style: "18 May 2024" (D MMM YYYY, no leading zero).
 */

const DEFAULT_CURRENCY = 'USD'

function normalizeCode(currency?: string | null): string {
  return (currency || DEFAULT_CURRENCY).toUpperCase()
}

function isBadNumber(value: number): boolean {
  return value === null || value === undefined || isNaN(value) || !isFinite(value)
}

/**
 * Internal: compact form — `USD 23.4m`, `USD 1.2b`, `USD 43.3k`, `USD 850`,
 * `-USD 23.4m`, `USD 0`. `decimals` controls the k/m/b precision
 * (1 for general/tooltip, 0 for chart axes).
 */
function compact(value: number, currency: string | undefined, decimals: number): string {
  const code = normalizeCode(currency)
  if (isBadNumber(value)) return `${code} 0`
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${code} ${(abs / 1_000_000_000).toFixed(decimals)}b`
  if (abs >= 1_000_000) return `${sign}${code} ${(abs / 1_000_000).toFixed(decimals)}m`
  if (abs >= 1_000) return `${sign}${code} ${(abs / 1_000).toFixed(decimals)}k`
  return `${sign}${code} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(abs))}`
}

/**
 * Precise / full form for exact amounts (transaction detail):
 * `USD 1,234,567.50`, `-USD 85.00`, `USD 0.00`.
 */
export function formatCurrencyPrecise(value: number, currency: string = DEFAULT_CURRENCY): string {
  const code = normalizeCode(currency)
  if (isBadNumber(value)) return `${code} 0.00`
  const sign = value < 0 ? '-' : ''
  const body = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  return `${sign}${code} ${body}`
}

/**
 * Default everyday currency display = precise/full (`USD 1,234,567.50`).
 * Use formatCurrencyCompact for tables/cards/charts where space is tight.
 * `currency` is optional and defaults to USD for backward compatibility.
 */
export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY): string {
  return formatCurrencyPrecise(value, currency)
}

/**
 * Canonical compact form: `USD 23.4m` / `USD 1.2b` / `USD 43.3k` / `USD 850`.
 * Prefer this name in new code.
 */
export function formatCurrencyCompact(value: number, currency: string = DEFAULT_CURRENCY): string {
  return compact(value, currency, 1)
}

/**
 * @deprecated Use formatCurrencyCompact. Kept for backward compatibility.
 */
export function formatCurrencyAbbreviated(value: number, currency: string = DEFAULT_CURRENCY): string {
  return compact(value, currency, 1)
}

/**
 * Short abbreviated form: `USD 23.4m`, `USD 1.2b`, `USD 43.3k`.
 * (Now consistent — previously mixed `$18.0M`/`$43.3k`.)
 */
export function formatCurrencyShort(value: number, currency: string = DEFAULT_CURRENCY): string {
  return compact(value, currency, 1)
}

/**
 * Previously a separate lowercase variant; now identical to
 * formatCurrencyShort (the canonical compact form is already lowercase).
 * Kept so existing imports keep working.
 */
export function formatCurrencyShortLower(value: number, currency: string = DEFAULT_CURRENCY): string {
  return compact(value, currency, 1)
}

/**
 * Chart axis form — terser, whole numbers: `USD 23m`, `USD 5k`, `USD 850`.
 */
export function formatAxisCurrency(value: number, currency: string = DEFAULT_CURRENCY): string {
  return compact(value, currency, 0)
}

/**
 * Chart tooltip — full precise when expanded, compact when not.
 */
export function formatTooltipCurrency(
  value: number,
  isExpanded: boolean,
  currency: string = DEFAULT_CURRENCY,
): string {
  return isExpanded ? formatCurrencyPrecise(value, currency) : compact(value, currency, 1)
}

/**
 * Canonical absolute date: "18 May 2024" (D MMM YYYY, no leading zero).
 * Returns '' for invalid input. Relative dates ("3 days ago") are a
 * separate concern — do not put them here.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
