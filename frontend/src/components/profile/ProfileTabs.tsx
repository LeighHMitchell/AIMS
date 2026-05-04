"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ProfileTabSpec {
  value: string
  label: string
  count?: number
}

interface ProfileTabsProps {
  tabs: ProfileTabSpec[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

export function ProfileTabs({ tabs, activeTab, onChange, className }: ProfileTabsProps) {
  return (
    <div className={cn("h-full flex items-stretch", className)}>
      <nav className="w-full px-6 flex items-stretch gap-1" role="tablist">
        {tabs.map((tab) => {
          const active = tab.value === activeTab
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                "relative inline-flex items-center gap-2 px-3 text-body font-semibold transition-colors h-full",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10.5px] tabular-nums",
                    active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-foreground rounded-t"
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
