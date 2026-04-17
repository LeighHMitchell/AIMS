"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleGroupProps {
  type: "single" | "multiple"
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

interface ToggleGroupItemProps {
  value: string
  className?: string
  children: React.ReactNode
  title?: string
  "aria-label"?: string
}

const ToggleGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ type, value, onValueChange, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-0.5 rounded-md", className)}
        {...props}
      >
        <ToggleGroupContext.Provider value={{ value, onValueChange }}>
          {children}
        </ToggleGroupContext.Provider>
      </div>
    )
  }
)

ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, children, title, "aria-label": ariaLabel, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    const isSelected = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={ariaLabel}
        title={title}
        data-state={isSelected ? "on" : "off"}
        onClick={() => context.onValueChange?.(value)}
        className={cn(
          "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "hover:bg-muted/80 hover:text-foreground",
          isSelected && "bg-white shadow-sm text-foreground",
          !isSelected && "text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
