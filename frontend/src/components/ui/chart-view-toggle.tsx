"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * <ChartViewToggle /> — the standard analytics-dashboard view/chart-type toggle.
 *
 * This is the canonical "Style 2" toggle group used across the Analytics
 * Dashboard: a bordered card-coloured track with a muted (grey) fill on the
 * selected segment. It mirrors the look of the External Development Partners
 * Financial Overview chart and is the single source of truth for chart toggles
 * so the dashboard stays visually consistent.
 *
 * It is intentionally API-compatible with <SegmentedControl /> (same value /
 * onValueChange / options / variant / size / ariaLabel / badge props) so the
 * two can be swapped without touching call-site state. Use this one for
 * analytics charts; <SegmentedControl /> remains the iOS-style pill toggle used
 * elsewhere in the app (forms, locations, policy markers, etc.).
 *
 * Variants:
 *   - "icon"      → icon-only triggers, label rendered in a tooltip + aria-label
 *   - "icon-text" → icon + text label visible
 *   - "text"      → text label only
 *
 * Example:
 *   <ChartViewToggle
 *     ariaLabel="Chart view"
 *     value={view}
 *     onValueChange={setView}
 *     variant="icon"
 *     options={[
 *       { value: "bar", label: "Bar Chart", icon: BarChart3 },
 *       { value: "table", label: "Table View", icon: Table2 },
 *     ]}
 *   />
 */

export type ChartViewToggleOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
  /** Escape hatch for a non-lucide icon (e.g. a bespoke inline <svg>). Takes
   *  precedence over `icon` when both are set. */
  iconNode?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
}

export type ChartViewToggleVariant = "icon" | "icon-text" | "text"
export type ChartViewToggleSize = "sm" | "md"

export interface ChartViewToggleProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: ChartViewToggleOption<T>[]
  ariaLabel: string
  variant?: ChartViewToggleVariant
  size?: ChartViewToggleSize
  className?: string
}

// `md` matches the External Development Partners Financial Overview chart
// (h-8 buttons, h-4 icons). `sm` is a slightly tighter option for dense
// toolbars; both share the same bordered-card track.
const sizeStyles: Record<ChartViewToggleSize, { iconBtn: string; textBtn: string; iconTextBtn: string; icon: string }> = {
  sm: {
    iconBtn: "h-7 w-7",
    textBtn: "h-7 px-2.5",
    iconTextBtn: "h-7 px-2 gap-1.5",
    icon: "h-3.5 w-3.5",
  },
  md: {
    iconBtn: "h-8 w-8",
    textBtn: "h-8 px-2.5",
    iconTextBtn: "h-8 px-2 gap-1.5",
    icon: "h-4 w-4",
  },
}

export function ChartViewToggle<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  variant = "icon",
  size = "md",
  className,
}: ChartViewToggleProps<T>) {
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

  const renderButton = (option: ChartViewToggleOption<T>, index: number) => {
    const isSelected = option.value === value
    const Icon = option.icon
    const wantsIcon = variant === "icon" || variant === "icon-text"
    const showIcon = wantsIcon && (Icon || option.iconNode != null)
    const showText = variant === "icon-text" || variant === "text"
    const ariaLabelForBtn = variant === "icon" ? option.label : undefined

    const buttonClass = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-body font-medium",
      "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "disabled:pointer-events-none disabled:opacity-50",
      // Style 2: muted fill on the selected segment, no shadow.
      isSelected
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:text-foreground",
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
        {showIcon && (option.iconNode ?? (Icon ? <Icon className={sz.icon} aria-hidden="true" /> : null))}
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
        // Style 2 track: bordered, card-coloured background.
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
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
