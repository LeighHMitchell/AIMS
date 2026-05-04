"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: React.ReactNode
  sublabel?: React.ReactNode
  trend?: "up" | "down" | "flat"
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE = {
  sm: { value: "text-[14px]", padding: "p-2.5" },
  md: { value: "text-[16px]", padding: "p-3" },
  lg: { value: "text-[20px]", padding: "p-4" },
}

export function MetricCard({ label, value, sublabel, size = "md", className }: MetricCardProps) {
  const s = SIZE[size]
  return (
    <div className={cn("rounded-md bg-muted/40", s.padding, className)}>
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn("font-medium tabular-nums text-foreground mt-0.5", s.value)}>{value}</div>
      {sublabel && <div className="text-[10.5px] text-muted-foreground mt-0.5">{sublabel}</div>}
    </div>
  )
}
