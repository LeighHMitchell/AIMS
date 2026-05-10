/**
 * Safe currency-to-USD coercion helpers.
 *
 * Many code paths historically used `t.value_usd || t.value` to "fall back"
 * to the raw amount when a stored USD conversion was missing. That pattern
 * is unsafe for non-USD records: a 100 AUD transaction with no `value_usd`
 * would be summed as if it were 100 USD, silently inflating totals.
 *
 * `safeUsd` only falls back to `value` when the row is *explicitly* in USD.
 * Non-USD rows missing a conversion contribute 0 — and `countUnconvertible`
 * lets callers surface a "N records excluded" notice in the UI.
 *
 * Use across charts, hero cards, and API aggregations.
 */

export interface UsdLikeRecord {
  /** Stored USD-converted amount (preferred). */
  value_usd?: number | string | null
  /** Alternate name used by budgets / planned disbursements / envelopes. */
  usd_value?: number | string | null
  /** Alternate camel-case naming used by some payloads. */
  amount_usd?: number | string | null
  /** Raw amount in the row's source currency. */
  value?: number | string | null
  /** Some payloads store `amount` instead of `value`. */
  amount?: number | string | null
  /** ISO-4217 currency code; only `'USD'` makes the raw `value` safe to use. */
  currency?: string | null
}

function asNumber(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Return a safe USD-equivalent for a financial record. Order of preference:
 *   1. Stored `value_usd` / `usd_value` / `amount_usd` (anything > 0 wins;
 *      `0` is treated as "no conversion" so we keep checking).
 *   2. Raw `value` / `amount` ONLY when `currency === 'USD'`.
 *   3. Otherwise 0 — caller should not include this row in USD totals
 *      without explicitly opting in.
 */
export function safeUsd(record: UsdLikeRecord): number {
  if (!record) return 0

  // Prefer any stored USD-converted column.
  const storedKeys: Array<keyof UsdLikeRecord> = ['value_usd', 'usd_value', 'amount_usd']
  for (const k of storedKeys) {
    const n = asNumber(record[k] as unknown)
    if (n != null) return n
  }

  // Only fall back to `value` / `amount` when the currency is explicitly USD.
  // A non-USD raw value cannot be safely treated as USD, so we return 0.
  const currency = (record.currency ?? '').toString().toUpperCase()
  if (currency === 'USD') {
    const raw = asNumber(record.value as unknown) ?? asNumber(record.amount as unknown)
    if (raw != null) return raw
  }

  return 0
}

/**
 * Count how many records in a list could not be safely converted to USD —
 * i.e. they had a non-zero raw amount in a non-USD currency with no stored
 * conversion. Use this to drive a "N rows excluded due to missing exchange
 * rate" hint next to a chart or hero card.
 */
export function countUnconvertible(records: UsdLikeRecord[] | null | undefined): number {
  if (!records || records.length === 0) return 0
  let n = 0
  for (const r of records) {
    if (!r) continue
    const stored = asNumber(r.value_usd) ?? asNumber(r.usd_value) ?? asNumber(r.amount_usd)
    if (stored != null) continue
    const raw = asNumber(r.value) ?? asNumber(r.amount)
    if (raw == null || raw === 0) continue
    const currency = (r.currency ?? '').toString().toUpperCase()
    if (currency === 'USD') continue
    n++
  }
  return n
}

/**
 * Convenience: sum a list of records as USD safely.
 * Returns `{ total, excluded }` where `excluded` is the count of rows that
 * were skipped because they had no stored conversion and weren't USD.
 */
export function sumUsdSafe(
  records: UsdLikeRecord[] | null | undefined,
): { total: number; excluded: number } {
  if (!records || records.length === 0) return { total: 0, excluded: 0 }
  let total = 0
  let excluded = 0
  for (const r of records) {
    const usd = safeUsd(r)
    if (usd === 0) {
      const stored = asNumber(r?.value_usd) ?? asNumber(r?.usd_value) ?? asNumber(r?.amount_usd)
      const raw = asNumber(r?.value) ?? asNumber(r?.amount)
      const currency = (r?.currency ?? '').toString().toUpperCase()
      if (stored == null && raw != null && raw !== 0 && currency !== 'USD') {
        excluded++
      }
    }
    total += usd
  }
  return { total, excluded }
}
