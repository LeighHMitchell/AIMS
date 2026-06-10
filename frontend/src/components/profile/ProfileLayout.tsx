"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ProfileLayoutProps {
  hero: React.ReactNode
  /** Optional thin sticky strip rendered above the tab bar — typically the
   *  compact identity row that fades in as the user scrolls past the hero.
   *  Owns its own height/opacity transitions; can be 0px-tall when inactive. */
  compactStrip?: React.ReactNode
  /** Approximate compact-strip height in pixels at full visibility — used so
   *  the rail's sticky offset accounts for the extra band above the tabs.
   *  Defaults to 60. */
  compactStripHeight?: number
  /** Current shrink-on-scroll progress in `[0, 1]`. Used to compute the
   *  rail's effective sticky offset so it doesn't slip under the strip. */
  shrinkProgress?: number
  tabs: React.ReactNode
  main: React.ReactNode
  rail?: React.ReactNode
  className?: string
}

const TAB_ROW_HEIGHT = 56

export function ProfileLayout({
  hero,
  compactStrip,
  compactStripHeight = 60,
  shrinkProgress = 0,
  tabs,
  main,
  rail,
  className,
}: ProfileLayoutProps) {
  const hasRail = !!rail
  // The MainLayout's TopNav is itself `sticky top-0 z-30 h-16` inside the
  // same scroll container, so we offset our sticky bar by its height to
  // avoid overlap. Rail offset compensates for both — TopNav + tab bar +
  // visible compact-strip portion.
  const TOP_NAV_HEIGHT = 64
  const railTop = TOP_NAV_HEIGHT + TAB_ROW_HEIGHT + 16 + Math.round(compactStripHeight * shrinkProgress)
  return (
    <div className={cn("min-h-screen", className)}>
      {hero}
      <div
        className="sticky z-30 bg-background border-b border-border"
        style={{ top: TOP_NAV_HEIGHT }}
      >
        {compactStrip}
        <div style={{ height: TAB_ROW_HEIGHT }}>{tabs}</div>
      </div>
      {/* min-h-screen guarantees there's always at least a viewport of
          scrollable content below the hero, so the shrink-on-scroll collapse
          can always run to completion — otherwise short pages (e.g. a 3-row
          table) freeze the hero/strip transition halfway because the page
          can't scroll the full hero height. */}
      <div className="w-full px-6 py-8 min-h-screen">
        {hasRail ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2 min-w-0">{main}</main>
            <aside className="lg:col-span-1 min-w-0">
              <div
                className="lg:sticky"
                style={{ top: railTop }}
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
