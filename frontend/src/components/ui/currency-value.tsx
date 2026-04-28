type Variant = 'short' | 'full' | 'precise'

interface CurrencyValueProps {
  amount: number | null | undefined
  currency?: string
  variant?: Variant
}

function formatAmount(value: number, variant: Variant): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (variant === 'short') {
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`
    return `${sign}${abs.toFixed(0)}`
  }

  const fractionDigits = variant === 'precise' ? 2 : 0
  return `${sign}${abs.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

export function CurrencyValue({
  amount,
  currency = 'USD',
  variant = 'full',
}: CurrencyValueProps) {
  const safeAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0
  const code = (currency || 'USD').toUpperCase()

  return (
    <>
      <span className="text-muted-foreground text-helper">{code}</span>
      {' '}
      {formatAmount(safeAmount, variant)}
    </>
  )
}
