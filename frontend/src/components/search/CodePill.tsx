import { cn } from '@/lib/utils'

interface CodePillProps {
  /** The code or ID to display */
  code: string
  /** Optional additional className */
  className?: string
  /** Optional size variant */
  size?: 'sm' | 'md'
}

/**
 * CodePill Component
 *
 * A shared component for displaying codes and IDs in search results.
 * Follows the design specification:
 * - Monospaced font
 * - Grey background pill (bg-muted)
 * - Muted text color (text-muted-foreground)
 */
export function CodePill({ code, className, size = 'sm' }: CodePillProps) {
  if (!code) return null

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5 whitespace-nowrap',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        className
      )}
    >
      {code}
    </span>
  )
}
