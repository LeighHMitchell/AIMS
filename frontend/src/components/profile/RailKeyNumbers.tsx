"use client"

import React from "react"
import { RailBlock } from "./RailBlock"
import { cn } from "@/lib/utils"

export interface KeyNumber {
  label: string
  value: React.ReactNode
  sublabel?: React.ReactNode
}

interface RailKeyNumbersProps {
  label?: string
  items: KeyNumber[]
  progress?: { label: string; percent: number }
  helpText?: React.ReactNode
}

const DEFAULT_KEY_NUMBERS_HELP =
  "Headline financials for this activity — total budget, planned disbursements, and the share already disbursed against the budget."

export function RailKeyNumbers({
  label = "Key Numbers",
  items,
  progress,
  helpText = DEFAULT_KEY_NUMBERS_HELP,
}: RailKeyNumbersProps) {
  if (items.length === 0 && !progress) return null

  return (
    <RailBlock label={label} helpText={helpText}>
      {progress && (
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-body-lg font-semibold tabular-nums text-foreground">
              {progress.percent}%
            </span>
            <span className="text-caption text-muted-foreground">{progress.label}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
            <div
              className={cn(
                "h-full transition-all",
                progress.percent > 90 ? "bg-emerald-500" : "bg-foreground",
              )}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
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
