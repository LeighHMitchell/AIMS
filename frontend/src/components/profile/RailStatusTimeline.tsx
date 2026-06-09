"use client"

import React from "react"
import { format, differenceInDays, parseISO, isValid } from "date-fns"
import { RailBlock } from "./RailBlock"
import { cn } from "@/lib/utils"

const STATUS_COLOUR: Record<string, { dot: string; label: string }> = {
  implementation: { dot: "bg-teal-500", label: "Implementation" },
  active: { dot: "bg-teal-500", label: "Implementation" },
  pipeline: { dot: "bg-blue-500", label: "Planning" },
  identification: { dot: "bg-blue-500", label: "Identification" },
  finalisation: { dot: "bg-amber-500", label: "Finalisation" },
  completion: { dot: "bg-amber-500", label: "Finalisation" },
  closed: { dot: "bg-muted-foreground", label: "Closed" },
  cancelled: { dot: "bg-muted-foreground", label: "Cancelled" },
  suspended: { dot: "bg-amber-500", label: "Suspended" },
}

function tryParse(d?: string | null) {
  if (!d) return null
  try {
    const p = parseISO(d)
    return isValid(p) ? p : null
  } catch {
    return null
  }
}

interface RailStatusTimelineProps {
  status?: string
  startDate?: string | null
  endDate?: string | null
  description?: React.ReactNode
  onOpenHistory?: () => void
  helpText?: React.ReactNode
}

const DEFAULT_STATUS_HELP =
  "Where this activity sits in its lifecycle (e.g. Implementation, Closed) and the time elapsed between the start and end dates."

export function RailStatusTimeline({
  status,
  startDate,
  endDate,
  description,
  onOpenHistory,
  helpText = DEFAULT_STATUS_HELP,
}: RailStatusTimelineProps) {
  const start = tryParse(startDate)
  const end = tryParse(endDate)

  let elapsedPct: number | null = null
  if (start && end) {
    const total = differenceInDays(end, start)
    const elapsed = differenceInDays(new Date(), start)
    if (total > 0) {
      elapsedPct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
    }
  }

  const statusInfo = status ? STATUS_COLOUR[status.toLowerCase()] ?? null : null

  return (
    <RailBlock
      label="Status & Timeline"
      helpText={helpText}
      action={
        onOpenHistory ? (
          <button
            onClick={onOpenHistory}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            All dates →
          </button>
        ) : null
      }
    >
      <div className="space-y-3">
        {statusInfo && (
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", statusInfo.dot)} aria-hidden />
            <span className="text-foreground font-medium">{statusInfo.label}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-caption text-muted-foreground">Start</div>
            <div className="text-foreground tabular-nums mt-0.5">
              {start ? format(start, "dd MMM yyyy") : "—"}
            </div>
          </div>
          <div>
            <div className="text-caption text-muted-foreground">End</div>
            <div className="text-foreground tabular-nums mt-0.5">
              {end ? format(end, "dd MMM yyyy") : "—"}
            </div>
          </div>
        </div>

        {elapsedPct !== null && (
          <div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  elapsedPct > 90 ? "bg-amber-500" : "bg-foreground",
                )}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
            <div className="text-caption text-muted-foreground mt-1.5">
              {elapsedPct}% of timeline elapsed
            </div>
          </div>
        )}

        {description && <div className="text-muted-foreground">{description}</div>}
      </div>
    </RailBlock>
  )
}
