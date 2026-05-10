"use client"

import React, { ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChartExpansionProvider } from "@/lib/chart-expansion-context"

interface ChartFullscreenProps {
  /** Render-prop receiving fullscreen state + toggle. Use the toggle inside a
   *  CardHeader's controls cluster to position the expand button in the top
   *  right. The wrapper lifts the whole subtree to fullscreen via CSS so the
   *  underlying chart keeps its DOM identity (no remount, no flicker). */
  children: (state: { isFullscreen: boolean; toggle: () => void }) => ReactNode
  className?: string
}

export function ChartFullscreen({ children, className }: ChartFullscreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const toggle = () => setIsFullscreen((v) => !v)

  // ESC closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isFullscreen])

  // Lock body scroll while fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isFullscreen])

  return (
    <>
      {/* Dim backdrop — clicking it closes the fullscreen view, matching the
          analytics-dashboard Dialog behaviour. */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 animate-in fade-in-0"
          onClick={toggle}
          aria-hidden
        />
      )}
      <div
        className={cn(
          isFullscreen
            ? "fixed left-1/2 top-1/2 z-[1000] w-[95vw] max-w-[1400px] h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-auto bg-background border border-border rounded-lg shadow-2xl"
            : "",
          className,
        )}
      >
        <ChartExpansionProvider isExpanded={isFullscreen}>
          {children({ isFullscreen, toggle })}
        </ChartExpansionProvider>
      </div>
    </>
  )
}

/** Small icon button matching the analytics dashboard style. */
export function ChartExpandIconButton({
  isFullscreen,
  onClick,
}: {
  isFullscreen: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 flex-shrink-0"
      onClick={onClick}
      title={isFullscreen ? "Collapse chart" : "Expand chart"}
      aria-label={isFullscreen ? "Collapse chart" : "Expand chart"}
    >
      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </Button>
  )
}
