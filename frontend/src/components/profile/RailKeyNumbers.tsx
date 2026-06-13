"use client"

import React from "react"
import { RailBlock } from "./RailBlock"
import { cn } from "@/lib/utils"

export interface KeyNumber {
  label: string
  value: React.ReactNode
  sublabel?: React.ReactNode
}

export interface KeyNumberProgress {
  label: string
  percent: number
}

interface RailKeyNumbersProps {
  label?: string
  items: KeyNumber[]
  progress?: KeyNumberProgress | KeyNumberProgress[]
  helpText?: React.ReactNode
}

const DEFAULT_KEY_NUMBERS_HELP =
  "Headline financials for this activity: total budget, planned disbursements, the share of the budget planned for disbursement, and the share already disbursed against the budget."

export function RailKeyNumbers({
  label = "Key Numbers",
  items,
  progress,
  helpText = DEFAULT_KEY_NUMBERS_HELP,
}: RailKeyNumbersProps) {
  const progressBars: KeyNumberProgress[] = progress
    ? Array.isArray(progress)
      ? progress
      : [progress]
    : []

  if (items.length === 0 && progressBars.length === 0) return null

  return (
    <RailBlock label={label} helpText={helpText}>
      {progressBars.length > 0 && (
        <div className="mb-3 space-y-2.5">
          {progressBars.map((bar, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-body-lg font-semibold tabular-nums text-foreground">
                  {bar.percent}%
                </span>
                <span className="text-caption text-muted-foreground">{bar.label}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                <div
                  className={cn(
                    "h-full transition-all",
                    bar.percent > 90 ? "bg-emerald-500" : "bg-foreground",
                  )}
                  style={{ width: `${Math.min(bar.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="text-caption text-muted-foreground font-medium">{item.label}</dt>
            <dd className="font-semibold tabular-nums text-foreground mt-0.5">{item.value}</dd>
            {item.sublabel && (
              <div className="text-caption text-muted-foreground mt-0.5">{item.sublabel}</div>
            )}
          </div>
        ))}
      </dl>
    </RailBlock>
  )
}
