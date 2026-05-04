"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ProfileLayoutProps {
  hero: React.ReactNode
  tabs: React.ReactNode
  main: React.ReactNode
  rail?: React.ReactNode
  className?: string
}

const TAB_ROW_HEIGHT = 56

export function ProfileLayout({ hero, tabs, main, rail, className }: ProfileLayoutProps) {
  const hasRail = !!rail
  return (
    <div className={cn("min-h-screen", className)}>
      {hero}
      <div
        className="sticky z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border"
        style={{ top: 0, height: TAB_ROW_HEIGHT }}
      >
        {tabs}
      </div>
      <div className="w-full px-6 py-8">
        {hasRail ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2 min-w-0">{main}</main>
            <aside className="lg:col-span-1 min-w-0">
              <div
                className="lg:sticky"
                style={{ top: TAB_ROW_HEIGHT + 16, maxHeight: `calc(100vh - ${TAB_ROW_HEIGHT + 32}px)`, overflowY: "auto" }}
              >
                <div className="space-y-5">{rail}</div>
              </div>
            </aside>
          </div>
        ) : (
          <main className="w-full min-w-0">{main}</main>
        )}
      </div>
    </div>
  )
}
