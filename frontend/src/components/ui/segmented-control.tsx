"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * <SegmentedControl /> — a single-select pill-style toggle group.
 *
 * Use as a value selector (Tables vs Charts, chart-type pickers, view modes).
 * For real page-level navigation use <Tabs> instead.
 *
 * Variants:
 *   - "icon"      → icon-only triggers, label rendered in a tooltip + aria-label
 *   - "icon-text" → icon + text label visible
 *   - "text"      → text label only
 *
 * Example:
 *   <SegmentedControl
 *     ariaLabel="View mode"
 *     value={view}
 *     onValueChange={setView}
 *     variant="icon"
 *     options={[
 *       { value: "tables", label: "Tables", icon: Table2 },
 *       { value: "charts", label: "Charts", icon: BarChart3 },
 *     ]}
 *   />
 */

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
  badge?: React.ReactNode
  disabled?: boolean
}

export type SegmentedControlVariant = "icon" | "icon-text" | "text"
export type SegmentedControlSize = "sm" | "md"

export interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
  variant?: SegmentedControlVariant
  size?: SegmentedControlSize
  className?: string
}

const sizeStyles: Record<SegmentedControlSize, { track: string; iconBtn: string; textBtn: string; iconTextBtn: string; icon: string }> = {
  sm: {
    track: "h-8 p-0.5 gap-0.5",
    iconBtn: "h-7 w-7",
    textBtn: "h-7 px-2.5",
    iconTextBtn: "h-7 px-2 gap-1.5",
    icon: "h-3.5 w-3.5",
  },
  md: {
    track: "h-10 p-1 gap-1",
    iconBtn: "h-8 w-8",
    textBtn: "h-8 px-3",
    iconTextBtn: "h-8 px-2.5 gap-2",
    icon: "h-4 w-4",
  },
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  variant = "icon-text",
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const sz = sizeStyles[size]

  const moveFocus = (fromIndex: number, direction: 1 | -1) => {
    const total = options.length
    if (total === 0) return
    let next = fromIndex
    for (let i = 0; i < total; i++) {
      next = (next + direction + total) % total
      if (!options[next].disabled) break
    }
    const target = itemRefs.current[next]
    if (target) {
      target.focus()
      onValueChange(options[next].value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault()
        moveFocus(index, 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault()
        moveFocus(index, -1)
        break
      case "Home":
        e.preventDefault()
        moveFocus(-1, 1)
        break
      case "End":
        e.preventDefault()
        moveFocus(0, -1)
        break
    }
  }

  const renderButton = (option: SegmentedOption<T>, index: number) => {
    const isSelected = option.value === value
    const Icon = option.icon
    const showIcon = (variant === "icon" || variant === "icon-text") && Icon
    const showText = variant === "icon-text" || variant === "text"
    const ariaLabelForBtn = variant === "icon" ? option.label : undefined

    const buttonClass = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-body font-medium",
      "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "disabled:pointer-events-none disabled:opacity-50",
      isSelected
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      variant === "icon" && sz.iconBtn,
      variant === "text" && sz.textBtn,
      variant === "icon-text" && sz.iconTextBtn,
    )

    const button = (
      <button
        key={option.value}
        ref={(el) => {
          itemRefs.current[index] = el
        }}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={ariaLabelForBtn}
        tabIndex={isSelected ? 0 : -1}
        disabled={option.disabled}
        data-state={isSelected ? "on" : "off"}
        onClick={() => onValueChange(option.value)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        className={buttonClass}
      >
        {showIcon && Icon && <Icon className={sz.icon} aria-hidden="true" />}
        {showText && <span>{option.label}</span>}
        {option.badge != null && <span className="ml-1 inline-flex">{option.badge}</span>}
      </button>
    )

    if (variant === "icon") {
      return (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top">{option.label}</TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  const content = (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-md bg-muted text-muted-foreground",
        sz.track,
        className,
      )}
    >
      {options.map((option, index) => renderButton(option, index))}
    </div>
  )

  if (variant === "icon") {
    return <TooltipProvider delayDuration={200}>{content}</TooltipProvider>
  }

  return content
}
