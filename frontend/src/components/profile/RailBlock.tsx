"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface RailBlockProps {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function RailBlock({ label, action, children, className }: RailBlockProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-foreground">{label}</h3>
        {action && <div className="text-helper">{action}</div>}
      </header>
      <div className="text-body leading-relaxed">{children}</div>
    </section>
  )
}
