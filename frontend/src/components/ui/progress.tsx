import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, style, indicatorClassName, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100)

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        style={style}
        {...props}
      >
        <div
          className={cn("h-full w-full flex-1 transition-all", indicatorClassName)}
          style={{
            transform: `translateX(-${100 - percentage}%)`,
            backgroundColor: style && '--progress-foreground' in style
              ? (style as any)['--progress-foreground']
              : '#4c5568'
          }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }