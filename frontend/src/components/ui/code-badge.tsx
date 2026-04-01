import { cn } from '@/lib/utils'

interface CodeBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'overlay'
  className?: string
}

export function CodeBadge({ children, variant = 'default', className }: CodeBadgeProps) {
  return (
    <span
      className={cn(
        'font-mono text-xs px-1.5 py-0.5 rounded',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'overlay' && 'bg-white/20 text-white/90',
        className
      )}
    >
      {children}
    </span>
  )
}
