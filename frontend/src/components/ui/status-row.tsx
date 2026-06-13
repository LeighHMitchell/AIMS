import { cn } from '@/lib/utils'
import { getActivityStatusLabel, normalizeActivityStatusCode } from '@/lib/activity-status-utils'

interface StatusRowProps {
  code: string | number
  label: string
  className?: string
  /** 'overlay' renders the chip for dark/imagery backgrounds (card banners) */
  variant?: 'default' | 'overlay'
}

/**
 * StatusRow — design-system Rule A: a status (or any coded classification)
 * always carries its code in a mono chip on the LEFT of the label.
 * Lifecycle statuses are never colored pills; semantic badge colors are
 * reserved for validation/publication feedback.
 */
export function StatusRow({ code, label, className, variant = 'default' }: StatusRowProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 min-w-0', className)}>
      <code
        className={cn(
          'font-mono text-xs px-1.5 py-0.5 rounded whitespace-nowrap',
          variant === 'overlay'
            ? 'bg-white/20 text-white/90'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {code}
      </code>
      <span>{label}</span>
    </span>
  )
}

/**
 * Activity lifecycle status rendered as `[code] Label`. Accepts the IATI
 * numeric code ('1'–'6') or any label alias ('implementation', 'active', …).
 */
export function ActivityStatusRow({
  status,
  className,
  variant,
}: {
  status: string | null | undefined
  className?: string
  variant?: 'default' | 'overlay'
}) {
  return (
    <StatusRow
      code={normalizeActivityStatusCode(status)}
      label={getActivityStatusLabel(status)}
      className={className}
      variant={variant}
    />
  )
}
