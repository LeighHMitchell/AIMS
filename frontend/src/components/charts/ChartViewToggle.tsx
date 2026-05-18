"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { BarChart3, Table as TableIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChartView = "chart" | "table"

interface ChartViewToggleProps {
  view: ChartView
  setView: (view: ChartView) => void
  className?: string
}

export function ChartViewToggle({ view, setView, className }: ChartViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView("chart")}
        className={cn(
          "h-8 w-8",
          view === "chart"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        title="Chart"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView("table")}
        className={cn(
          "h-8 w-8",
          view === "table"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        title="Table"
      >
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default ChartViewToggle
